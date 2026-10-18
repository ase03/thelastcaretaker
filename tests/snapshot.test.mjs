import {createHash} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFull,validateFull,sha256Hex} from '../src/lib/map/full-snapshot.ts';
import {projectFull,groupMarker,itemMarker} from '../src/lib/map/snapshot.ts';
import {fixture,fullFromPois,idFor} from './snapshot-fixture.mjs';

test('official Full retained intact; exact scalar strings, null unknowns and optional keys',async()=>{
 const d=fixture();d.future={unknown:null,scalar:'18446744073709551615'};
 const full=await readFull(JSON.stringify(d)),s=projectFull(full);
 assert.deepEqual(full,d);assert.equal(full.metadata.source.timestampNs,'18446744073709551615');
 assert.equal(full.states.playerStateProbe,null);assert.equal(s.occurrences[1].world.z,-5000);
 assert.equal(s.groups[0].units.Rare,3n);assert.equal(groupMarker(s.groups[0]).knowledge,'unknown');
 assert.equal(itemMarker(s.occurrences[0]).knowledge,'unknown');assert.equal(s.pois[0].knowledge,'known');
 assert.deepEqual(s.groups,projectFull(await validateFull({...d,objects:[...d.objects].reverse()})).groups);
});

const invalid=[
 ['Scanner',d=>d.schema='tlc-scanner-snapshot/1'],['version',d=>d.schema='tlc-full-snapshot/2'],
 ['representation',d=>d.representation='scanner'],['metadata missing',d=>delete d.metadata.source],
 ['identity numeric',d=>d.metadata.steamId64=123],['units',d=>d.metadata.units='metres'],
 ['coordinate system',d=>d.metadata.coordinateSystem='unknown'],['qualification',d=>d.metadata.usability='live'],
 ['duplicate ID',d=>d.objects.push(d.objects[0])],['id derivation',d=>d.objects[0].sourceRecord='wrong'],
 ['NaN',d=>d.objects[0].xyz[0]=NaN],['Infinity',d=>d.objects[0].xyz[0]=Infinity],
 ['inadmissible XYZ',d=>d.objects[0].xyz[0]=1e13],['numeric timestamp',d=>d.metadata.source.timestampNs=123],
 ['count',d=>d.metadata.coverage.inventory.selectedRecords=999],['raw coverage',d=>d.metadata.coverage.inventory.rawRecords=0],
 ['scanner coverage',d=>d.metadata.coverage.scanner.inRadius.Memory=99],
 ['fractional count',d=>d.metadata.coverage.scanner.candidates.Memory=1.5],
 ['missing state',d=>delete d.states.moduleResourceObservations],['invented empty probe',d=>d.states.playerStateProbe={}],
 ['coordinate flag',d=>d.objects[0].coordinateObservation.worldMarkerEligible=true],
 ['unknown space',d=>d.objects[0].coordinateObservation.coordinateSpace='world'],
 ['unconfirmed XYZ',d=>d.objects[0].coordinateObservation.confirmation='unconfirmed'],
 ['contradictory observation',d=>d.objects[0].coordinateObservation.value.x=42],
 ['null unknown',d=>d.objects[0].coordinateObservation.value=null],
 ['unqualified object',d=>d.objects[0].confidence='unconfirmed'],['player storage',d=>d.objects[0].storage='Backpack'],
 ['category',d=>d.objects[0].scannerCategory='Rare'],['zero units',d=>d.objects[0].units=0],
 ['POI evidence',d=>d.pois[0].Knowledge='known'],['POI coordinates',d=>d.pois[0].CoordinateType='unknown'],
 ['duplicate POI',d=>d.pois.push(d.pois[0])],['POI NaN',d=>d.pois[0].Position.Z=NaN],
 ['retained nonfinite',d=>d.states.future=Infinity],['lossy integer',d=>d.states.future=9007199254740993]
];
for(const [name,mutate] of invalid)test('reject '+name,async()=>{const d=fixture();mutate(d);await assert.rejects(validateFull(d));});
test('reject legacy imports and malformed JSON',async()=>{
 for(const d of [{format:'MapSnapshot',schemaVersion:1,units:'UE-cm',pois:[]},{schemaVersion:1,units:'UE-cm',pois:[]}])await assert.rejects(validateFull(d));
 await assert.rejects(readFull('{'));await assert.rejects(readFull('{"private-data":NaN}'),e=>!e.message.includes('private-data'));
});
test('raw unconfirmed / not-read observations never become markers',async()=>{
 const d=fullFromPois();d.objects=[{...fixture().objects[0],id:idFor('raw'),sourceRecord:'raw',xyz:null}];
 delete d.objects[0].scannerCategory;d.objects[0].coordinateObservation.confirmation='unconfirmed';
 d.metadata.coverage.inventory={selectedRecords:1,rawRecords:1};
 assert.equal(projectFull(await validateFull(d)).occurrences.length,0);
 d.objects[0].coordinateObservation.value=null;d.objects[0].coordinateObservation.confirmation='not-read';
 assert.equal(projectFull(await validateFull(d)).groups.length,0);
});
test('no legacy numerical import caps; exact large quantity totals',async()=>{
 const d=fixture();d.objects[1].units='18446744073709551615';
 const s=projectFull(await validateFull(d));assert.equal(s.groups[0].units.Rare,18446744073709551615n);
 const many=fullFromPois(Array.from({length:1001},(_,i)=>({id:String(i),name:'test',world:{x:i,y:0,z:0}})));
 assert.equal(projectFull(await validateFull(many)).pois.length,1001);
});

for (const mode of ['WebCrypto','fallback']) {
 test(`SHA-256 UTF-8 matches reference: ${mode}`,async t=>{
  if(mode==='fallback') t.mock.getter(globalThis,'crypto',()=>undefined);
  const digest=mode==='WebCrypto'?t.mock.method(globalThis.crypto.subtle,'digest'):null;
  // Empty, ASCII, Unicode and SHA-256 padding/block boundaries.
  for(const source of ['', 'abc', 'Запись/漢字/🌊', ...[55,56,63,64,65,127,128,129,1000].map(n=>'a'.repeat(n))]){
   assert.equal(await sha256Hex(source),createHash('sha256').update(source,'utf8').digest('hex'));
  }
  const d=fixture();d.objects[0].sourceRecord='Запись/漢字/🌊';d.objects[0].id=idFor(d.objects[0].sourceRecord);
  assert.deepEqual(await readFull(JSON.stringify(d)),d);
  if(digest)assert.equal(digest.mock.callCount(),14);
 });
 for(const field of ['sourceRecord','id'])test(`reject tampered ${field}: ${mode}`,async t=>{
  if(mode==='fallback') t.mock.getter(globalThis,'crypto',()=>({}));
  const d=fixture();d.objects[0][field]=field==='id'?idFor('tampered'):'tampered';
  await assert.rejects(validateFull(d),/id derivation/);
 });
}
