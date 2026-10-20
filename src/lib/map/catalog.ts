import {sha256Hex} from './full-snapshot.ts';
export type Reference={schema:'tlc-map-reference/1';gameBuild:string;objectPath:string;name:string|null;icon:string|null;fields:Record<string,string|number|boolean>};
export async function loadReference(objectPath:string,build:string):Promise<Reference|null>{
 if(!objectPath.startsWith('/Game/')||!/^\d+$/.test(build))return null;
 const key=await sha256Hex(objectPath);
 const response=await fetch(`/world-catalog/${build}/items/${key}.json`);
 if(!response.ok)return null;
 const v=await response.json();
 if(v.schema!=='tlc-map-reference/1'||v.gameBuild!==build||v.objectPath!==objectPath)throw Error('Несовпадение справочного определения');
 return v;
}
