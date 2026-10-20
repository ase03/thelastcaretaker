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
  // Component identity comes from Full.ComponentPath, never from asset basename.
  // Current-build consumer selects OverrideIndicator and the effective Config.Type.
  if(o.data.Type==='VoyageLocatorComponent'){
   const p=o.data.Properties??{},lp=p.properties,indicator=bound(o,'/Properties/OverrideIndicator');
   const configAsset=bound(o,'/Properties/properties/ConfigAsset');
   const config=lp?.bUseConfigAsset===true&&configAsset?.data.Type==='VoyageLocatorPropertyData'?configAsset.data.Properties?.Config:
    lp?.bUseConfigAsset===false?lp.Config:null;
   if(config?.Type!=='EVoyageLocatorType::Location'||indicator?.data.Type!=='VoyageIndicatorData')continue;
   const entries=indicator.data.Properties?.Icons??[],matches=entries.map((e,i)=>e.Key===config.Type?i:-1).filter(i=>i>=0);
   const icon=matches.length===1?imageFor(bound(indicator,`/Properties/Icons/${matches[0]}/Value`)):null;
   if(icon)views.push({schema:'tlc-map-reference/1',gameBuild:c.gameBuild,objectPath:o.objectPath,name:null,icon,fields:{}});
   continue;
  }
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

// Invoked by the existing build, with the catalog outside Docker's build context.
export async function generate(root=process.env.TLC_WORLD_CATALOG) {
 if(!root)return;
 const c=JSON.parse(await readFile(path.join(root,'catalog.json'),'utf8'));
 const views=selectReferences(c), output=path.resolve('data/world-catalog-view',c.gameBuild);
 for(const view of views)if(view.icon)await stat(path.join(root,view.icon));
 await mkdir(output,{recursive:true});
 for(const file of await readdir(output))if(/^[a-f0-9]{64}\.json$/.test(file))await unlink(path.join(output,file));
 for(const view of views){
  const key=createHash('sha256').update(view.objectPath).digest('hex');
  await writeFile(path.join(output,key+'.json'),JSON.stringify(view));
 }
 console.log(`World Catalog ${c.gameBuild}: ${views.length} references; ${views.filter(v=>v.icon).length} exact icons`);
}
await generate();
