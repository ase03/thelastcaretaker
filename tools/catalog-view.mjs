// Deploy-time projection; reads the existing catalog without copying game assets.
import {readFile, mkdir, writeFile, stat, readdir, unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export function selectReferences(c) {
 if(c.schema!=='tlc-world-catalog/1'||!/^\d+$/.test(c.gameBuild))throw Error('Expected World Catalog v1');
 const objects=new Map();
 for(const o of c.objects){if(objects.has(o.objectPath))throw Error('Duplicate objectPath');objects.set(o.objectPath,o);}
 const views=[];
 for(const o of c.objects){
  // Item subclasses only. Never emit placed actors, quests, loot tables or coordinates.
  if(!['VoyageItem','VoyageItemConsumable','VoyageItemMaterial','VoyageItemPart','VoyageItemBallisticEquipment','VoyageItemHandEquipment','VoyageCartridgeItem'].includes(o.data.Type))continue;
  const p=o.data.Properties??{}, f=p.Name;
  const name=typeof f?.SourceString==='string'?f.SourceString:
   objects.get(f?.TableId)?.data.StringTable?.KeysToEntries?.[f?.Key];
  const target=o.bindings?.find(b=>b.fieldPath==='/Properties/Icon')?.targetObjectPath;
  // No .0 -> basename conversion. Only explicit resolved bindings qualify.
  const images=target&&objects.get(target)?.data.Type==='Texture2D'?c.images.filter(i=>i.textureObjectPath===target):[];
  const image=images.length===1?images[0]:undefined;
  const icon=image&&/^images\/[A-Za-z0-9_\-/]+\.png$/.test(image.file)&&!image.file.split('/').includes('..')?image.file:null;
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
 console.log(`World Catalog ${c.gameBuild}: ${views.length} item references; ${views.filter(v=>v.icon).length} exact icons`);
}
await generate();
