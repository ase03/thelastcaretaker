import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSnapshot} from '../src/lib/map/snapshot.ts';
import {fixture} from './snapshot-fixture.mjs';
test('single file, exact XYZ, stack counts and safe/legacy',()=>{
 const d=fixture(),s=parseSnapshot(d);assert.equal(s.occurrences[1].world.z,-5000);assert.equal(s.groups[0].units.Rare,3);
 assert.equal(parseSnapshot({schemaVersion:1,units:'UE-cm',pois:d.pois}).metadata,null);
 d.metadata.mode='safe';d.metadata.spoilers=false;assert.throws(()=>parseSnapshot(d));d.occurrences=[];d.groups=[];assert.equal(parseSnapshot(d).occurrences.length,0);
});
test('reject duplicate keys, invalid assignments, geometry, counts and header',()=>{
 for(const mutate of [d=>d.occurrences.push(d.occurrences[0]),d=>d.groups[0].occurrenceKeys.pop(),d=>d.groups[0].occurrenceKeys.push('item-high'),d=>d.groups[0].counts.Memory=0,d=>d.groups[0].bounds.max.z=0,d=>d.occurrences[0].world.z=NaN,d=>d.groups[0].poiId='hidden',d=>d.format='MapSnapshot2',d=>d.metadata.spoilers=false]){const d=fixture();mutate(d);assert.throws(()=>parseSnapshot(d));}
});
