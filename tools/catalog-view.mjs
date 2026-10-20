// Deploy-time projection; reads the existing catalog without copying game assets.
import {readFile, mkdir, writeFile, stat, readdir, unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export function selectReferences(c) {
 if(c.schema!=='tlc-world-catalog/1'||!/^\d+$/.test(c.gameBuild))throw Error('Expected World Catalog v1');
 const objects=new Map();
 for(const o of c.objects){if(objects.has(o.objectPath))throw Error('Duplicate objectPath');objects.set(o.objectPath,o);}
 const views=[];
 const bound=(o,field)=>objects.get(o?.bindings?.find(b=>b.fieldPath===field)?.targetObjectPath);
 const imageFor=texture=>{
  const images=texture?.data.Type==='Texture2D'?c.images.filter(i=>i.textureObjectPath===texture.objectPath):[];
  const image=images.length===1?images[0]:undefined;
  return image&&/^images\/[A-Za-z0-9_\-/]+\.png$/.test(image.file)&&!image.file.split('/').includes('..')?image.file:null;
 };
 for(const o of c.objects){
  // Selected item subclasses only. Never emit quests, loot tables or coordinates.
  if(!['VoyageItem','VoyageItemConsumable','VoyageItemMaterial','VoyageItemPart','VoyageItemBallisticEquipment','VoyageItemHandEquipment','VoyageCartridgeItem'].includes(o.data.Type))continue;
  const p=o.data.Properties??{}, f=p.Name;
  const name=typeof f?.SourceString==='string'?f.SourceString:
   objects.get(f?.TableId)?.data.StringTable?.KeysToEntries?.[f?.Key];
  // No .0 -> basename conversion. Only explicit resolved bindings qualify.
  const icon=imageFor(bound(o,'/Properties/Icon'));
  const fields={};
  for(const key of ['Category','Quality','Weight','MaxStackCount'])if(Object.hasOwn(p,key)&&['string','number','boolean'].includes(typeof p[key]))fields[key]=p[key];
  views.push({schema:'tlc-map-reference/1',gameBuild:c.gameBuild,objectPath:o.objectPath,name:typeof name==='string'?name:null,icon,fields});
 }
 return views;
}

/** Static authored root placements only; Full never supplies this world's roster. */
export function selectStaticPOIs(c) {
 if(c.schema!=='tlc-world-catalog/1'||c.gameBuild!=='25982825')throw Error('Expected build 25982825 World Catalog');
 const objects=new Map(c.objects.map(o=>[o.objectPath,o]));
 if(objects.size!==c.objects.length)throw Error('Duplicate objectPath');
 const bound=(o,field)=>objects.get(o?.bindings?.find(b=>b.fieldPath===field)?.targetObjectPath);
 const text=f=>typeof f?.SourceString==='string'?f.SourceString:typeof f?.CultureInvariantString==='string'?f.CultureInvariantString:
  objects.get(f?.TableId)?.data.StringTable?.KeysToEntries?.[f?.Key];
 const pois=[];
 for(const component of c.objects){
  if(component.data.Type!=='VoyageLocatorComponent')continue;
  const actor=objects.get(component.objectPath.slice(0,component.objectPath.lastIndexOf('.'))),p=component.data.Properties??{};
  if(actor?.data.Type!=='VoyageLocatorActor'||bound(actor,'/Properties/RootComponent')!==component||p.AttachParent)continue;
  const location=bound(component,'/Properties/LocationAsset'),xyz=p.RelativeLocation;
  const name=text(location?.data.Properties?.Name),componentName=text(p.properties?.DisplayName);
  if(location?.data.Type!=='VoyageLocation'||!name?.trim()||!xyz||!['X','Y','Z'].every(k=>typeof xyz[k]==='number'&&Number.isFinite(xyz[k])&&Math.abs(xyz[k])<=1e12))throw Error(`Incomplete static POI: ${component.objectPath}`);
  const lp=p.properties,configAsset=bound(component,'/Properties/properties/ConfigAsset');
  // Pishon has bUseConfigAsset=true but no serialized ConfigAsset reference.
  // The current native getter falls back to inline Config when the pointer is null.
  const config=lp?.bUseConfigAsset===true&&configAsset?.data.Type==='VoyageLocatorPropertyData'?configAsset.data.Properties?.Config:
   lp?.bUseConfigAsset===false||!lp?.ConfigAsset?lp?.Config:null;
  const indicator=bound(component,'/Properties/OverrideIndicator');let icon=null;
  if(config?.Type==='EVoyageLocatorType::Location'&&indicator?.data.Type==='VoyageIndicatorData'){
   const entries=indicator.data.Properties?.Icons??[],matches=entries.map((e,i)=>e.Key===config.Type?i:-1).filter(i=>i>=0);
   const texture=matches.length===1?bound(indicator,`/Properties/Icons/${matches[0]}/Value`):undefined;
   const images=texture?.data.Type==='Texture2D'?c.images.filter(i=>i.textureObjectPath===texture.objectPath):[];
   if(images.length===1&&/^images\/[A-Za-z0-9_\-/]+\.png$/.test(images[0].file))icon=images[0].file;
  }
  pois.push({id:component.objectPath,referencePath:component.objectPath,definitionPath:location.objectPath,name,
   ...(componentName&&componentName!==name?{componentName}:{}),world:{x:xyz.X,y:xyz.Y,z:xyz.Z},icon,
   source:'World Catalog; authored unattached root locator',gameBuild:c.gameBuild,knowledge:'unknown',
   accuracy:'Unattached root component RelativeLocation = static actor world position',layer:'poi',visibility:'local'});
 }
 return pois;
}

// Invoked by the existing build, with the catalog outside Docker's build context.
export async function generate(root=process.env.TLC_WORLD_CATALOG) {
 if(!root)return;
 const c=JSON.parse(await readFile(path.join(root,'catalog.json'),'utf8'));
 const views=selectReferences(c),pois=selectStaticPOIs(c), output=path.resolve('data/world-catalog-view',c.gameBuild);
 if(pois.length!==116)throw Error(`Expected 116 static placements, got ${pois.length}`);
 for(const view of views)if(view.icon)await stat(path.join(root,view.icon));
 for(const poi of pois)if(poi.icon)await stat(path.join(root,poi.icon));
 await mkdir(output,{recursive:true});
 for(const file of await readdir(output))if(/^[a-f0-9]{64}\.json$/.test(file))await unlink(path.join(output,file));
 for(const view of views){
  const key=createHash('sha256').update(view.objectPath).digest('hex');
  await writeFile(path.join(output,key+'.json'),JSON.stringify(view));
 }
 await writeFile(path.join(output,'pois.json'),JSON.stringify({gameBuild:c.gameBuild,pois}));
 console.log(`Static world: ${pois.length} POI; ${pois.filter(p=>p.icon).length} original icons`);
 console.log(`World Catalog ${c.gameBuild}: ${views.length} references; ${views.filter(v=>v.icon).length} exact icons`);
}
await generate();
