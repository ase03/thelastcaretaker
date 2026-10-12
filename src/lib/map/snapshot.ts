import {parsePOIs,LIMIT,type POI,type World} from './coordinates.ts';
export const categoryColors={Memory:'#55F56C',Artifact:'#FFE34A',Rare:'#339CFF'};
export type Category=keyof typeof categoryColors;
export type Occurrence={key:string;definitionId:string;name:string|null;category:Category;quality:string;quantity:number;world:World;ownership:string;provenance:string;source:string;confidence:string;groupId:string};
export type Group={id:string;type:'poi'|'cluster';centre:World;poiId:string|null;occurrenceKeys:string[];counts:Record<Category,number>;units:Record<Category,number>;bounds:{min:World;max:World};extent:{xyDiameterM:number;zSpanM:number|null};algorithm:Record<string,unknown>;ambiguousAssignments:Record<string,string[]>};
export type Snapshot={pois:POI[];occurrences:Occurrence[];groups:Group[];metadata:null|{mode:'safe'|'with-candidates';spoilers:boolean;gameBuild:string|null;snapshotTimestamp:string;snapshotFingerprint:string;source:string;warnings:string[];coverage:Record<string,unknown>;grouping:Record<string,unknown>}};
const fail=()=>{throw Error('Некорректный MapSnapshot v1: структура, координаты или назначения групп.');};
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=2048;
function world(v:any):World{if(!v||!['x','y'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])&&Math.abs(v[k])<=LIMIT)||!(v.z===null||typeof v.z==='number'&&Number.isFinite(v.z)&&Math.abs(v.z)<=LIMIT))fail();return Object.freeze({x:v.x,y:v.y,z:v.z});}
export function parseSnapshot(input:any):Snapshot{
 const pois=parsePOIs(input);
 if(input.format===undefined){if(input.occurrences!==undefined||input.groups!==undefined||input.metadata!==undefined)fail();return {pois,occurrences:[],groups:[],metadata:null};}
 if(input.format!=='MapSnapshot'||!Array.isArray(input.occurrences)||input.occurrences.length>20000||!Array.isArray(input.groups)||input.groups.length>2000)fail();
 const m=input.metadata;
 if(!m||!['safe','with-candidates'].includes(m.mode)||m.spoilers!==(m.mode==='with-candidates')||!(m.gameBuild===null||text(m.gameBuild))||!text(m.snapshotTimestamp)||!Number.isFinite(Date.parse(m.snapshotTimestamp))||!/^[a-fA-F0-9]{64}$/.test(m.snapshotFingerprint)||!text(m.source)||!Array.isArray(m.warnings)||m.warnings.length>100||!m.warnings.every(text)||!m.coverage||!m.grouping)fail();
 const keys=new Map<string,Occurrence>(),gids=new Set<string>(),assigned=new Set<string>(),pids=new Set(pois.map(p=>p.id));
 const occurrences:Occurrence[]=input.occurrences.map((i:any)=>{
  if(!i||!['key','definitionId','quality','ownership','provenance','source','confidence','groupId'].every(k=>text(i[k]))||!(i.name===null||text(i.name))||!Object.hasOwn(categoryColors,i.category)||!Number.isSafeInteger(i.quantity)||i.quantity<1||keys.has(i.key)||pids.has(i.key))fail();
  const item=Object.freeze({...i,world:world(i.world)});keys.set(i.key,item);return item;
 });
 const usedPoi=new Set<string>();
 const groups:Group[]=input.groups.map((g:any)=>{
  if(!g||!text(g.id)||pids.has(g.id)||keys.has(g.id)||gids.has(g.id)||!['poi','cluster'].includes(g.type)||!Array.isArray(g.occurrenceKeys)||!g.occurrenceKeys.length||g.occurrenceKeys.length>20000||!(g.type==='poi'?pids.has(g.poiId)&&!usedPoi.has(g.poiId):g.poiId===null)||!g.bounds||!g.extent||!g.algorithm||!g.ambiguousAssignments)fail();
  gids.add(g.id);if(g.poiId)usedPoi.add(g.poiId);
  const centre=world(g.centre),min=world(g.bounds.min),max=world(g.bounds.max);
  if(!Number.isFinite(g.extent.xyDiameterM)||g.extent.xyDiameterM<0||!(g.extent.zSpanM===null||Number.isFinite(g.extent.zSpanM)&&g.extent.zSpanM>=0))fail();
  const members:Occurrence[]=g.occurrenceKeys.map((key:any)=>{const i=keys.get(key);if(!i||assigned.has(key)||i.groupId!==g.id)fail();assigned.add(key);return i!;});
  for(const axis of ['x','y','z'] as const){const values=members.map(i=>i.world[axis]).filter((v):v is number=>v!==null);if(values.length?(min[axis]!==Math.min(...values)||max[axis]!==Math.max(...values)):(min[axis]!==null||max[axis]!==null))fail();}
  if(g.poiId){const p=pois.find(p=>p.id===g.poiId)!;if(['x','y','z'].some(k=>centre[k as keyof World]!==p.world[k as keyof World]))fail();}
  for(const c of Object.keys(categoryColors) as Category[]){if(g.counts?.[c]!==members.filter(i=>i.category===c).length||g.units?.[c]!==members.filter(i=>i.category===c).reduce((sum,i)=>sum+i.quantity,0))fail();}
  return Object.freeze({...g,centre,bounds:{min,max},occurrenceKeys:[...g.occurrenceKeys]});
 });
 if(assigned.size!==keys.size||m.mode==='safe'&&(occurrences.length||groups.length))fail();
 return {pois,occurrences,groups,metadata:{...m,warnings:[...m.warnings]}};
}
export function groupSummary(g:Group){return `Memory: ${g.counts.Memory} · Artifact: ${g.counts.Artifact} · Rare: ${g.counts.Rare} · всего: ${g.occurrenceKeys.length} объектов / ${Object.values(g.units).reduce((a,b)=>a+b,0)} единиц · кандидаты из сохранения`;}
export function groupMarker(g:Group):POI{return {id:g.id,name:`Область находок (${g.occurrenceKeys.length})`,world:g.centre,source:'Кандидаты из сохранения; вычисленный центр',gameBuild:'unknown',knowledge:'known',accuracy:'Derived display centre; no player knowledge assertion',layer:'poi',visibility:'local'};}
export function itemMarker(i:Occurrence):POI{return {id:i.key,name:i.name??i.definitionId.split('/').pop()??i.definitionId,world:i.world,source:i.source,gameBuild:'unknown',knowledge:'known',accuracy:i.confidence,layer:'poi',visibility:'local'};}
