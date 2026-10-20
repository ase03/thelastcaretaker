import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectReferences} from '../tools/catalog-view.mjs';
import {loadReference,loadReferences,displayName} from '../src/lib/map/catalog.ts';
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

test('POI icon follows component override, effective type and exact texture binding only',()=>{
 const texture={objectPath:'/Game/Icon.Icon',data:{Type:'Texture2D'}};
 const indicator={objectPath:'/Game/Indicator.Indicator',data:{Type:'VoyageIndicatorData',Properties:{Icons:[{Key:'EVoyageLocatorType::Location',Value:{ObjectPath:'/Game/Icon.0'}}]}},bindings:[{fieldPath:'/Properties/Icons/0/Value',targetObjectPath:texture.objectPath}]};
 const config={objectPath:'/Game/Config.Config',data:{Type:'VoyageLocatorPropertyData',Properties:{Config:{Type:'EVoyageLocatorType::Location'}}}};
 const component={objectPath:'/Game/World.World:Actor.LocatorComponent',data:{Type:'VoyageLocatorComponent',Properties:{RelativeLocation:{X:999},properties:{bUseConfigAsset:true,Config:{Type:'Wrong'}}}},bindings:[{fieldPath:'/Properties/OverrideIndicator',targetObjectPath:indicator.objectPath},{fieldPath:'/Properties/properties/ConfigAsset',targetObjectPath:config.objectPath}]};
 const c={schema:'tlc-world-catalog/1',gameBuild:'25982825',objects:[component,config,indicator,texture],images:[{textureObjectPath:texture.objectPath,file:'images/Icon.png'}]};
 assert.deepEqual(selectReferences(c),[{schema:'tlc-map-reference/1',gameBuild:c.gameBuild,objectPath:component.objectPath,name:null,icon:'images/Icon.png',fields:{}}]);
 indicator.bindings=[];assert.deepEqual(selectReferences(c),[]);
 indicator.bindings=[{fieldPath:'/Properties/Icons/0/Value',targetObjectPath:texture.objectPath}];
 config.data.Properties.Config.Type='EVoyageLocatorType::Waypoint';assert.deepEqual(selectReferences(c),[]);
 config.data.Properties.Config.Type='EVoyageLocatorType::Location';component.bindings=[];assert.deepEqual(selectReferences(c),[]);
});

test('display names preserve identity, fallback and exact joins',()=>{
 const item={definitionId:'/Game/Teddy.Teddy',name:'DA_ItemLoot_Teddy_02',world:{x:1},key:'original'};
 const before=structuredClone(item),reference={objectPath:item.definitionId,name:'Teddy Bear'};
 assert.equal(displayName(item,reference),'Teddy Bear');
 assert.equal(displayName(item,{...reference,objectPath:'/Game/Other.Other'}),item.name);
 assert.equal(displayName(item,{...reference,name:''}),item.name);
 assert.deepEqual(item,before);
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
