import {sha256Hex} from './full-snapshot.ts';
export type Reference={schema:'tlc-map-reference/1';gameBuild:string;objectPath:string;name:string|null;icon:string|null;fields:Record<string,string|number|boolean>};
export async function loadReference(objectPath:string,build:string):Promise<Reference|null>{
 if(!objectPath.startsWith('/Game/')||!/^\d+$/.test(build))return null;
 const key=await sha256Hex(objectPath);
 const response=await fetch(`/world-catalog/${build}/items/${key}.json`);
 if(!response.ok)return null;
 const v=await response.json();
 if(v.schema!=='tlc-map-reference/1'||v.gameBuild!==build||v.objectPath!==objectPath||
  !(v.name===null||typeof v.name==='string')||!(v.icon===null||typeof v.icon==='string'&&/^images\/[A-Za-z0-9_\-/]+\.png$/.test(v.icon))||
  !v.fields||typeof v.fields!=='object'||Array.isArray(v.fields))throw Error('Несовпадение справочного определения');
 return v;
}

/** Bounded, per-view requests. A failed reference must not hide other names. */
export async function loadReferences(paths:string[],build:string,onResult:(path:string,value:Reference|null)=>void,isCurrent:()=>boolean){
 const pending=[...new Set(paths)];
 await Promise.all(Array.from({length:Math.min(6,pending.length)},async()=>{
  while(pending.length&&isCurrent()){
   const path=pending.shift()!;
   let value:Reference|null=null;
   try{value=await loadReference(path,build);}catch{/* Keep the technical fallback. */}
   if(isCurrent())onResult(path,value);
  }
 }));
}
export function displayName(item:{name:string|null;definitionId:string},reference?:Reference|null){
 return reference?.objectPath===item.definitionId&&reference.name?.trim()?reference.name:item.name??item.definitionId;
}
export function iconUrl(reference?:Reference|null){
 return reference?.icon?`/world-catalog/${reference.gameBuild}/${reference.icon}`:null;
}
/** Item imagery is usable only for the exact definition, like its display name. */
export function itemIcon(item:{definitionId:string},reference?:Reference|null){
 return reference?.objectPath===item.definitionId?iconUrl(reference):null;
}
export function quantityLabel(quantity:bigint){return quantity>1n?`×${quantity}`:'';}
