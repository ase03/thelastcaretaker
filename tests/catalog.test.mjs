import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectReferences,selectStaticPOIs} from '../tools/catalog-view.mjs';
import {loadReference,loadReferences,displayName,itemIcon,quantityLabel} from '../src/lib/map/catalog.ts';
import {loadWorld,mergeWorld,WORLD_BUILD} from '../src/lib/map/world.ts';
import {projectFull} from '../src/lib/map/snapshot.ts';
import {fixture} from './snapshot-fixture.mjs';
test('reference projection omits placements, unresolved icons and unobserved defaults',()=>{
 const item={objectPath:'/Game/Item.Item',data:{Type:'VoyageItem',Properties:{Name:{TableId:'/Game/Text.Text',Key:'name'},Weight:0,Icon:{ObjectPath:'/Game/Icon.0'}}}};
 const c={schema:'tlc-world-catalog/1',gameBuild:'25982825',objects:[item,
  {objectPath:'/Game/Text.Text',data:{Type:'StringTable',StringTable:{KeysToEntries:{name:'Original name'}}}},
  {objectPath:'/Game/Icon.Icon',data:{Type:'Texture2D'}},
  {objectPath:'/Game/Actor.Actor',data:{Type:'VoyageLocatorActor',Properties:{Position:[1,2,3]}}}],
  images:[{textureObjectPath:'/Game/Icon.Icon',file:'images/Icon.png',mipIndex:0}]};
 assert.deepEqual(selectReferences(c),[{schema:'tlc-map-reference/1',gameBuild:'25982825',objectPath:item.objectPath,name:'Original name',icon:null,fields:{Weight:0}}]);
 item.bindings=[{fieldPath:'/Properties/Icon',targetObjectPath:'/Game/Icon.Icon'}];
 assert.equal(selectReferences(c)[0].icon,'images/Icon.png');
 c.images[0].file='images/../private.png';assert.equal(selectReferences(c)[0].icon,null);
 c.objects.push(item);assert.throws(()=>selectReferences(c),/Duplicate/);
});

function worldFixture(){
 const texture={objectPath:'/Game/Icon.Icon',data:{Type:'Texture2D'}};
 const indicator={objectPath:'/Game/Indicator.Indicator',data:{Type:'VoyageIndicatorData',Properties:{Icons:[{Key:'EVoyageLocatorType::Location',Value:{ObjectPath:'/Game/Icon.0'}}]}},bindings:[{fieldPath:'/Properties/Icons/0/Value',targetObjectPath:texture.objectPath}]};
 const config={objectPath:'/Game/Config.Config',data:{Type:'VoyageLocatorPropertyData',Properties:{Config:{Type:'EVoyageLocatorType::Location'}}}};
 const location={objectPath:'/Game/Location.Location',data:{Type:'VoyageLocation',Properties:{Name:{TableId:'/Game/Text.Text',Key:'title'}}}};
 const component={objectPath:'/Game/World.World:Actor.LocatorComponent',data:{Type:'VoyageLocatorComponent',Properties:{RelativeLocation:{X:999,Y:-123,Z:0},properties:{DisplayName:{CultureInvariantString:'Seed Vault 2'},bUseConfigAsset:true,Config:{Type:'Wrong'}}}},bindings:[{fieldPath:'/Properties/LocationAsset',targetObjectPath:location.objectPath},{fieldPath:'/Properties/OverrideIndicator',targetObjectPath:indicator.objectPath},{fieldPath:'/Properties/properties/ConfigAsset',targetObjectPath:config.objectPath}]};
 const actor={objectPath:'/Game/World.World:Actor',data:{Type:'VoyageLocatorActor'},bindings:[{fieldPath:'/Properties/RootComponent',targetObjectPath:component.objectPath}]};
 const c={schema:'tlc-world-catalog/1',gameBuild:'25982825',objects:[actor,component,location,config,indicator,texture,{objectPath:'/Game/Text.Text',data:{Type:'StringTable',StringTable:{KeysToEntries:{title:'Eden Cradle'}}}}],images:[{textureObjectPath:texture.objectPath,file:'images/Icon.png'}]};
 return {c,actor,component,config,indicator,location};
}

test('static placement uses exact root identity, primary definition title and bound original icon',()=>{
 const {c,actor,component,indicator}=worldFixture();
 const [poi]=selectStaticPOIs(c);
 assert.equal(poi.id,component.objectPath);assert.equal(poi.referencePath,component.objectPath);
 assert.equal(poi.name,'Eden Cradle');assert.equal(poi.componentName,'Seed Vault 2');
 assert.deepEqual(poi.world,{x:999,y:-123,z:0});assert.equal(poi.knowledge,'unknown');assert.equal(poi.icon,'images/Icon.png');
 assert.deepEqual(selectReferences(c),[]); // No duplicate component reference view.
 indicator.bindings=[];assert.equal(selectStaticPOIs(c)[0].icon,null); // A missing icon never drops a POI.
 component.data.Properties.AttachParent={ObjectPath:'/Game/Parent.0'};assert.deepEqual(selectStaticPOIs(c),[]);
 delete component.data.Properties.AttachParent;actor.bindings=[];assert.deepEqual(selectStaticPOIs(c),[]);
});

test('Pishon inline type when asset reference absent; no fallback for unresolved serialized config',()=>{
 const {c,component}=worldFixture();component.bindings=component.bindings.filter(b=>!b.fieldPath.endsWith('/ConfigAsset'));
 component.data.Properties.properties.Config={Type:'EVoyageLocatorType::Location',ShowInMap:0};
 assert.equal(selectStaticPOIs(c)[0].icon,'images/Icon.png');
 component.data.Properties.properties.ConfigAsset={ObjectPath:'/Game/Unresolved.0'};
 assert.equal(selectStaticPOIs(c)[0].icon,null);
});

test('shared definition and identical names never collapse separate placements; bad XYZ rejected',()=>{
 const {c,component,actor}=worldFixture(),other=structuredClone(component),otherActor=structuredClone(actor);
 other.objectPath='/Game/World.World:Other.LocatorComponent';otherActor.objectPath='/Game/World.World:Other';otherActor.bindings[0].targetObjectPath=other.objectPath;
 c.objects.push(otherActor,other);assert.equal(selectStaticPOIs(c).length,2);
 assert.equal(new Set(selectStaticPOIs(c).map(p=>p.id)).size,2);
 other.data.Properties.RelativeLocation.Z=null;assert.throws(()=>selectStaticPOIs(c),/Incomplete/);
});

test('display names preserve identity, fallback and exact joins',()=>{
 const item={definitionId:'/Game/Teddy.Teddy',name:'DA_ItemLoot_Teddy_02',world:{x:1},key:'original'};
 const before=structuredClone(item),reference={objectPath:item.definitionId,name:'Teddy Bear'};
 assert.equal(displayName(item,reference),'Teddy Bear');
 assert.equal(displayName(item,{...reference,objectPath:'/Game/Other.Other'}),item.name);
 assert.equal(displayName(item,{...reference,name:''}),item.name);
 assert.deepEqual(item,before);
});

test('local item imagery uses exact definition references and keeps name when icon is unavailable',()=>{
 const item={definitionId:'/Game/Item.Item',name:'Technical',quantity:2n,key:'occurrence',world:{x:1,y:2,z:3}};
 const before=structuredClone(item),reference={schema:'tlc-map-reference/1',objectPath:item.definitionId,gameBuild:'25982825',name:'Original item',icon:'images/Item.png',fields:{}};
 assert.equal(itemIcon(item,reference),'/world-catalog/25982825/images/Item.png');
 assert.equal(displayName(item,reference),'Original item');
 assert.equal(itemIcon(item,{...reference,objectPath:'/Game/Other.Other'}),null);
 assert.equal(itemIcon(item,{...reference,icon:null}),null);
 assert.equal(displayName(item,{...reference,icon:null}),'Original item');
 assert.equal(itemIcon(item,null),null);assert.equal(itemIcon(item,undefined),null);
 assert.deepEqual(item,before);
});

test('local quantity badges omit single units and retain exact large Full quantities',()=>{
 assert.equal(quantityLabel(1n),'');assert.equal(quantityLabel(2n),'×2');
 assert.equal(quantityLabel(18446744073709551615n),'×18446744073709551615');
});

test('reference batches deduplicate paths, keep failures local and reject stale completions',async()=>{
 const original=globalThis.fetch,seen=[],results=[];let resolve;
 try{
  globalThis.fetch=async url=>{seen.push(url);return {ok:false};};
  await loadReferences(['/Game/A.A','/Game/A.A','technical'],'25982825',(p,v)=>results.push([p,v]),()=>true);
  assert.equal(seen.length,1);assert.deepEqual(results,[['technical',null],['/Game/A.A',null]]);
  let current=true;
  globalThis.fetch=()=>new Promise(r=>resolve=r);
  const pending=loadReferences(['/Game/A.A'],'25982825',()=>assert.fail('Stale callback'),()=>current);
  while(!resolve)await new Promise(r=>setImmediate(r));
  current=false;resolve({ok:false});await pending;
  globalThis.fetch=async()=>({ok:true,json:async()=>({schema:'tlc-map-reference/1',gameBuild:'25982825',objectPath:'/Game/Wrong.Wrong',name:'Wrong',icon:null,fields:{}})});
  await assert.rejects(loadReference('/Game/A.A','25982825'),/Несовпадение/);
 }finally{globalThis.fetch=original;}
});

test('Full knowledge joins exact component only and keeps static identity, names, XYZ and unrelated finds',()=>{
 const [poi]=selectStaticPOIs(worldFixture().c),other={...poi,id:'/Game/World.World:Other.LocatorComponent',referencePath:'/Game/World.World:Other.LocatorComponent'};
 const full=projectFull(fixture()),before=structuredClone(full),base=[poi,other];
 const personal={...poi,id:'poi:asset',name:'Full title',world:{x:0,y:0,z:0},knowledge:'known'};
 const result=mergeWorld(base,[personal]);
 assert.equal(result.length,2);assert.deepEqual(result[0],{...poi,knowledge:'known'});assert.equal(result[1].knowledge,'unknown');
 assert.equal(mergeWorld(base,[{...personal,referencePath:'/Game/Other.Other'}])[0].knowledge,'unknown');
 assert.equal(mergeWorld(base,[{...personal,gameBuild:'1'}])[0].knowledge,'unknown');
 assert.deepEqual(mergeWorld(base,[]),base);
 mergeWorld(base,full.pois);assert.deepEqual(full,before);assert.equal(full.groups[0].type,'cluster');
});

test('world loads without Full, rejects corrupt positions/duplicates and reports unavailable deployment',async()=>{
 const original=globalThis.fetch,[poi]=selectStaticPOIs(worldFixture().c);
 const data={gameBuild:WORLD_BUILD,pois:Array.from({length:116},(_,i)=>({...poi,id:`/Game/World.World:Actor${i}.LocatorComponent`,referencePath:`/Game/World.World:Actor${i}.LocatorComponent`}))};
 try{
  globalThis.fetch=async url=>{assert.equal(url,`/world-catalog/${WORLD_BUILD}/pois.json`);return {ok:true,json:async()=>data};};
  assert.equal((await loadWorld()).length,116);
  data.pois[1]=data.pois[0];await assert.rejects(loadWorld(),/размещение/);
  data.pois[1]={...poi,id:'/Game/World.World:Different.LocatorComponent',referencePath:'/Game/World.World:Different.LocatorComponent',world:{x:0,y:0,z:null}};
  await assert.rejects(loadWorld(),/размещение/);
  globalThis.fetch=async()=>({ok:false});await assert.rejects(loadWorld(),/недоступна/);
 }finally{globalThis.fetch=original;}
});
