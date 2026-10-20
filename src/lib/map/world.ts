import type {POI} from './coordinates.ts';
export const WORLD_BUILD='25982825';

export async function loadWorld():Promise<POI[]> {
 const response=await fetch(`/world-catalog/${WORLD_BUILD}/pois.json`);
 if(!response.ok)throw Error('Статическая карта недоступна. Проверьте данные World Catalog на сайте.');
 const data=await response.json();
 if(data.gameBuild!==WORLD_BUILD||!Array.isArray(data.pois)||data.pois.length!==116)throw Error('Неверные данные статической карты');
 const ids=new Set<string>();
 for(const p of data.pois){
  if(typeof p.id!=='string'||!p.id.startsWith('/Game/')||p.referencePath!==p.id||ids.has(p.id)||
   p.gameBuild!==WORLD_BUILD||p.knowledge!=='unknown'||p.layer!=='poi'||p.visibility!=='local'||
   typeof p.name!=='string'||!p.name.trim()||typeof p.definitionPath!=='string'||
   !p.world||!['x','y','z'].every(k=>typeof p.world[k]==='number'&&Number.isFinite(p.world[k])&&Math.abs(p.world[k])<=1e12)||
   !(p.icon===null||typeof p.icon==='string'&&/^images\/[A-Za-z0-9_\-/]+\.png$/.test(p.icon)))throw Error('Неверное размещение статической карты');
  ids.add(p.id);
 }
 return data.pois;
}

/** Only an exact component join adds knowledge; authored identity/XYZ stay intact. */
export function mergeWorld(base:POI[],personal:POI[]):POI[] {
 const byComponent=new Map(personal.filter(p=>p.referencePath).map(p=>[p.referencePath,p]));
 const baseComponents=new Set(base.map(p=>p.id));
 return [...base.map(p=>({...p,knowledge:byComponent.get(p.id)?.gameBuild===p.gameBuild&&byComponent.get(p.id)?.knowledge==='known'?'known' as const:'unknown' as const})),
  ...personal.filter(p=>!p.referencePath||!baseComponents.has(p.referencePath))];
}
