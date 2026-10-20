import type { POI, World } from './coordinates.ts';
import {exactUnits, type FullSnapshot, type Category} from './full-snapshot.ts';
export const categoryColors={Memory:'#55F56C',Artifact:'#FFE34A',Rare:'#339CFF'};
export type Occurrence={key:string;definitionId:string;name:string|null;category:Category;quality:string;quantity:bigint;world:World;ownership:string;provenance:string;source:string;confidence:string;groupId:string};
export type Group={id:string;type:'cluster';centre:World;poiId:null;occurrenceKeys:string[];counts:Record<Category,number>;units:Record<Category,bigint>;bounds:{min:World;max:World};extent:{xyDiameterM:number;zSpanM:number|null};algorithm:Record<string,unknown>};
export type Snapshot={pois:POI[];occurrences:Occurrence[];groups:Group[];metadata:null|{gameBuild:string;warnings:string[]};stats?:{objects:number;eligible:number;missingCoordinates:number}};
const world=(xyz:number[]):World=>({x:xyz[0],y:xyz[1],z:xyz[2]});

/** Derived display only. Fixed 200m XY cells; no POI/structure membership claim.
 * Independent of input order and Z; members keep their exact confirmed XYZ.
 */
export function projectFull(full:FullSnapshot):Snapshot {
 const gameBuild=full.metadata.installedBuildId ?? full.metadata.reviewedMetadataBuild;
 const pois:POI[]=full.pois.map(p=>({id:`poi:${p.Asset}`,name:[p.DisplayName,p.Name,p.Asset].find(v=>typeof v==='string' && v.length>0) ?? p.Asset,
  world:world([p.Position.X,p.Position.Y,p.Position.Z]),source:'Serialized Location discovery; static root locator',
  gameBuild,knowledge:'known',accuracy:p.CoordinateType,layer:'poi',visibility:'local',
  ...(typeof p.ComponentPath==='string'&&p.ComponentPath.startsWith('/Game/')?{referencePath:p.ComponentPath}:{})}));
 const cells=new Map<string,Occurrence[]>();
 const occurrences:Occurrence[]=[];
 for (const o of full.objects) {
  if (!o.scannerCategory || o.xyz === null) continue;
  const w=world(o.xyz), id=`area:${Math.floor(w.x/20000)}:${Math.floor(w.y/20000)}`;
  const item:Occurrence={key:o.id,definitionId:typeof o.definition==='string'?o.definition:o.itemIdentity.assetName,name:o.itemIdentity.assetName,
   category:o.scannerCategory,quality:typeof o.quality==='string'?o.quality:'Unknown',quantity:exactUnits(o.units),world:w,
   ownership:'Unknown',provenance:'Selected save source; no structure association',source:'Full v1 confirmed xyz / scannerCategory',confidence:o.confidence,groupId:id};
  occurrences.push(item);
  if (!cells.has(id)) cells.set(id,[]); cells.get(id)!.push(item);
 }
 const groups:Group[]=Array.from(cells.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([id,items])=>{
  const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
  const counts={Memory:0,Artifact:0,Rare:0},units={Memory:0n,Artifact:0n,Rare:0n};
  for (const i of items) {
   for (const a of ['x','y','z'] as const) {min[a]=Math.min(min[a],i.world[a]!);max[a]=Math.max(max[a],i.world[a]!);}
   counts[i.category]++;units[i.category]+=i.quantity;
  }
  return {id,type:'cluster',poiId:null,centre:{x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:(min.z+max.z)/2},
   occurrenceKeys:items.map(i=>i.key).sort(),counts,units,bounds:{min,max},
   extent:{xyDiameterM:Math.hypot(max.x-min.x,max.y-min.y)/100,zSpanM:(max.z-min.z)/100},algorithm:{version:'xy-grid-200m-v1',uncertainty:'Display cells only; boundaries may split nearby finds; no structure membership'}};
 });
 return {pois,occurrences,groups,metadata:{gameBuild,warnings:[...full.metadata.limitations,'Offline selective data; game-session binding unverified.','Области: ячейки 200×200 м; границы условны. Принадлежность сооружениям неизвестна.']},
  stats:{objects:full.objects.length,eligible:occurrences.length,missingCoordinates:full.objects.filter(o=>o.xyz===null).length}};
}
export function groupSummary(g:Group){return `Memory: ${g.counts.Memory} · Artifact: ${g.counts.Artifact} · Rare: ${g.counts.Rare} · всего: ${g.occurrenceKeys.length} объектов / ${Object.values(g.units).reduce((a,b)=>a+b,0n)} единиц · кандидаты из сохранения`;}
export function groupMarker(g:Group):POI{return {id:g.id,name:`Область находок (${g.occurrenceKeys.length})`,world:g.centre,source:'Кандидаты из сохранения; вычисленный центр',gameBuild:'unknown',knowledge:'unknown',accuracy:'Derived display centre; no player knowledge assertion',layer:'poi',visibility:'local'};}
export function itemMarker(i:Occurrence):POI{return {id:i.key,name:i.name??i.definitionId,world:i.world,source:i.source,gameBuild:'unknown',knowledge:'unknown',accuracy:i.confidence,layer:'poi',visibility:'local'};}
