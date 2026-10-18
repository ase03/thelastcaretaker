import { LIMIT } from './coordinates.ts';

// Independent Full reader. No renderer, grouping or Scanner document dependency.
export const WORLD_CONFIRMATION = 'world-space corroborated by spatial cell';
export const POSITION_TYPE = 'Saved actor Transform; world-space corroborated by spatial cell';
export const POI_COORDINATES = 'Unattached root component RelativeLocation = static actor world position';
export const categories = ['Memory', 'Artifact', 'Rare'] as const;
export type Category = typeof categories[number];
type RecordValue = Record<string, any>;
export type FullObject = RecordValue & {
 id:string; actorId:string; sourceRecord:string; xyz:[number,number,number]|null;
 itemIdentity:{assetType:string|null;assetName:string}; sourceContext:RecordValue;
 coordinateObservation:RecordValue; scannerCategory?:Category;
};
export type FullSnapshot = RecordValue & {
 schema:'tlc-full-snapshot/1'; representation:'full'; metadata:RecordValue;
 objects:FullObject[]; pois:RecordValue[]; states:RecordValue; provenance:RecordValue;
};
function check(ok:unknown, reason:string):asserts ok {
 if (!ok) throw Error(`Некорректный Full v1: ${reason}`);
}
const record = (v:any):v is RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v:unknown):v is string => typeof v === 'string';
const matches = (v:unknown, re:RegExp) => str(v) && re.test(v);
const count = (v:unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const axis = (v:unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= LIMIT;
function xyz(v:any) { check(Array.isArray(v) && v.length === 3 && v.every(axis), 'XYZ'); }
export function exactUnits(v:unknown):bigint {
 check(typeof v === 'number' && Number.isSafeInteger(v) || matches(v, /^-?\d+$/), 'units');
 return BigInt(v as string|number);
}
// Official producers stringify large integers. Refuse lossy numeric input rather
// than silently round identifiers, timestamps or optional retained evidence.
function numericEvidence(v:any):void {
 if (typeof v === 'number') check(Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v)), 'небезопасное число');
 else if (v && typeof v === 'object') for (const child of Object.values(v)) numericEvidence(child);
}
function countMap(v:any) {
 check(record(v) && Object.values(v).every(count), 'coverage counts');
}

export async function validateFull(input:unknown):Promise<FullSnapshot> {
 const d = input as FullSnapshot;
 check(record(d) && d.schema === 'tlc-full-snapshot/1' && d.representation === 'full', 'ожидается tlc-full-snapshot/1, representation=full');
 check(record(d.metadata) && Array.isArray(d.objects) && Array.isArray(d.pois) && record(d.states) && record(d.provenance), 'корневые поля');
 numericEvidence(d);
 const m = d.metadata;
 check(matches(m.steamId64,/^\d{17}$/) && matches(m.generation,/^[0-9a-f]{32}$/) && matches(m.snapshotId,/^[0-9a-f]{64}$/), 'identity');
 check(m.coordinateSystem === 'Unreal world XYZ' && m.units === 'centimetres' && m.unitsPerMetre === 100, 'coordinate contract');
 check(m.usability === 'offline-selective; game-session-binding-unverified' && ['verified-executable','unverified-executable'].includes(m.installedBuildCompatibility), 'qualification');
 check(record(m.source) && str(m.source.name) && matches(m.source.size,/^\d+$/) && matches(m.source.timestampNs,/^\d+$/) && matches(m.source.sha256,/^[0-9A-F]{64}$/), 'source');
 check(record(m.dependencies) && record(m.coverage) && str(m.reviewedMetadataBuild) && m.saveSteamBuild === 'unknown' && record(m.saveHeader) && record(m.saveScalars) && Array.isArray(m.limitations) && m.limitations.every(str), 'metadata');
 if ('installedBuildId' in m) check(str(m.installedBuildId), 'installedBuildId');
 if ('contractFingerprint' in m) check(matches(m.contractFingerprint,/^[0-9A-F]{64}$/), 'contractFingerprint');
 const s = d.states;
 check('playerStateProbe' in s && (s.playerStateProbe === null || record(s.playerStateProbe) && (s.playerStateProbe.inventoryCompartments === null || Array.isArray(s.playerStateProbe.inventoryCompartments))), 'playerStateProbe');
 check('moduleResourceObservations' in s && (s.moduleResourceObservations === null || Array.isArray(s.moduleResourceObservations)), 'moduleResourceObservations');
 const ids = new Set<string>();
 const actual:Record<Category,number> = {Memory:0,Artifact:0,Rare:0};
 for (const o of d.objects) {
  check(record(o) && str(o.actorId) && str(o.sourceRecord) && matches(o.id,/^TLCScanner:v1:[0-9a-f]{64}$/) && !ids.has(o.id), 'object identity / duplicate ID');
  ids.add(o.id);
  check(o.xyz === null || Array.isArray(o.xyz), 'xyz required');
  if (o.xyz !== null) xyz(o.xyz);
  check(record(o.itemIdentity) && str(o.itemIdentity.assetName) && (o.itemIdentity.assetType === null || str(o.itemIdentity.assetType)) && record(o.sourceContext), 'retained object evidence');
  const c = o.coordinateObservation;
  check(record(c) && (c.value === null || record(c.value)) && str(c.source) && c.coordinateSpace === 'unknown; no parent/world conversion asserted' && c.units === 'centimetres' && c.worldMarkerEligible === false, 'coordinateObservation');
  check(['not-read','unconfirmed',WORLD_CONFIRMATION].includes(c.confirmation), 'coordinate confirmation');
  if (c.value !== null) xyz(['x','y','z'].map(a=>c.value[a]));
  check(c.value === null ? c.confirmation === 'not-read' && o.xyz === null : c.confirmation !== 'not-read', 'null coordinate semantics');
  check((o.xyz !== null) === (c.confirmation === WORLD_CONFIRMATION), 'world coordinate evidence');
  if (o.xyz !== null) {
   check(o.positionType === POSITION_TYPE && o.xyz.every((v,i)=>v === c.value['xyz'[i]]), 'xyz / observation disagreement');
  }
  if ('units' in o) exactUnits(o.units);
  if ('scannerCategory' in o) {
   check(categories.includes(o.scannerCategory!) && o.xyz !== null && o.confidence === 'Confirmed within selective contract' && exactUnits(o.units) > 0n, 'map eligibility');
   const expected = o.category === 'Quest' ? null : o.category === 'Memory' ? 'Memory' : ['Artifact','Rare'].includes(o.quality) ? o.quality : null;
   check(o.scannerCategory === expected && !['Probable player storage','Backpack','Holster','Equipment'].includes(o.storage) && !String(o.sourceContext.actorName ?? '').startsWith('BP_FirstPersonCharacter_New_C'), 'category / excluded storage');
   actual[o.scannerCategory!]++;
  }
 }
 // Bounded batches avoid 20k simultaneous WebCrypto jobs on a real Full.
 check(globalThis.crypto?.subtle, 'проверка SHA-256 требует HTTPS или localhost');
 const encoder = new TextEncoder();
 for (let i=0;i<d.objects.length;i+=256) await Promise.all(d.objects.slice(i,i+256).map(async o=>{
  const hash = await crypto.subtle.digest('SHA-256',encoder.encode(o.sourceRecord));
  const hex = Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  check(o.id === `TLCScanner:v1:${hex}`, 'id derivation');
 }));
 const assets = new Set<string>();
 for (const p of d.pois) {
  check(record(p) && str(p.Asset) && !assets.has(p.Asset) && p.Knowledge === 'Serialized Location discovery' && p.CoordinateType === POI_COORDINATES && record(p.Position), 'POI evidence / duplicate');
  xyz(['X','Y','Z'].map(a=>p.Position[a])); assets.add(p.Asset);
 }
 if ('inventory' in m.coverage) {
  const c = m.coverage.inventory; check(record(c), 'inventory coverage');
  if ('selectedRecords' in c) check(count(c.selectedRecords) && c.selectedRecords === d.objects.length, 'selectedRecords');
  if ('rawRecords' in c) check(count(c.rawRecords) && c.rawRecords >= d.objects.length, 'rawRecords');
 }
 if ('scanner' in m.coverage) {
  const c = m.coverage.scanner; check(record(c), 'scanner coverage');
  for (const key of ['candidates','inRadius','excluded']) if (key in c) countMap(c[key]);
  if ('inRadius' in c) {
   check(Object.keys(c.inRadius).every(k=>categories.includes(k as Category)), 'scanner categories');
   for (const k of categories) check((c.inRadius[k] ?? 0) === actual[k], 'scanner count');
  }
  if ('candidates' in c) for (const k of categories) check((c.candidates[k] ?? 0) >= actual[k], 'candidate count');
 }
 return d;
}
export async function readFull(text:string):Promise<FullSnapshot> {
 let data:unknown;
 try { data = JSON.parse(text); } catch { throw Error('Некорректный JSON Full v1'); }
 return validateFull(data);
}
