import test from 'node:test';
import assert from 'node:assert/strict';
import {fullSourceLoader} from '../src/lib/map/full-source.ts';
import {fixture} from './snapshot-fixture.mjs';
const id='76561198000000000', other='76561198000000001';
function text(steamId=id){const f=fixture();f.metadata.steamId64=steamId;return JSON.stringify(f);}
function setup(){
 let state=null,error=null,busy=false;
 const loader=fullSourceLoader({reset:async()=>{state=null;},accept:async v=>{state=v;},error:e=>error=e,busy:v=>busy=v});
 return {loader,state:()=>state,error:()=>error,busy:()=>busy};
}
test('switch players clears old layer and ignores slow previous response',async()=>{
 const s=setup();await s.loader.load(async()=>text(),'player A',true,id);
 let resolve;const waiting=s.loader.load(()=>new Promise(r=>resolve=r),'old request',true,id);
 await Promise.resolve();assert.equal(s.state(),null);
 await s.loader.load(async()=>text(other),'player B',true,other);
 resolve(text());await waiting;
 assert.equal(s.state().full.metadata.steamId64,other);assert.equal(s.state().snapshot.occurrences.length,2);
});
test('manual import supersedes pending server request through same projection',async()=>{
 const s=setup();let resolve;const request=s.loader.load(()=>new Promise(r=>resolve=r),'Hub',true,id);
 await Promise.resolve();await s.loader.load(async()=>text(other),'file.json');resolve(text());await request;
 assert.equal(s.state().source,'file.json');assert.equal(s.state().snapshot.groups.length,1);assert.equal(s.busy(),false);
});
test('failed switch keeps no old player and rejects response identity mismatch',async()=>{
 const s=setup();await s.loader.load(async()=>text(),'A');
 await s.loader.load(async()=>text(other),'A',true,id);
 assert.equal(s.state(),null);assert.match(s.error(),/SteamID/);
 await s.loader.load(async()=>{throw Error('404');},'B',true,other);
 assert.equal(s.state(),null);assert.match(s.error(),/404/);
});
