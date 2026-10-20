import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PlayerStates,requestBytes,BODY_LIMIT} from '../src/lib/server/player-states.ts';
import {fullFromPois} from './snapshot-fixture.mjs';
const id='76561198000000000', id2='76561198000000001';
function body(n=1, steamId=id, timestamp=n) {
 const f=fullFromPois();Object.assign(f.metadata,{steamId64:steamId,generation:String(n).padStart(32,'0'),snapshotId:String(n).padStart(64,'0')});
 Object.assign(f.metadata.source,{timestampNs:String(timestamp),sha256:String(n).padStart(64,'0')});
 return Buffer.from(JSON.stringify(f));
}
const create={none:'*',match:null};
async function store(t, replace) {
 const dir=await mkdtemp(join(tmpdir(),'tlc-player-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 return {dir,s:new PlayerStates(dir,replace)};
}
test('two players, exact bytes, duplicate, stale and ambiguous saves',async t=>{
 const {s,dir}=await store(t);
 const a=await s.put(id,body(),create);assert.equal(a.created,true);
 assert.deepEqual((await s.get(id)).bytes,body());
 assert.equal((await s.put(id,body(),{match:'old',none:null})).created,false);
 await s.put(id2,body(2,id2),create);assert.equal((await s.list()).length,2);
 await s.put(id,body(3),{match:a.etag,none:null});
 await assert.rejects(s.put(id,body(2),{match:(await s.get(id)).etag,none:null}),{status:409});
 await assert.rejects(s.put(id,body(4,id,3),{match:(await s.get(id)).etag,none:null}),{status:409});
 assert.equal((await s.get(id)).full.metadata.generation,String(3).padStart(32,'0'));
 assert.deepEqual((await readdir(dir)).sort(),[id+'.json',id2+'.json']);
});
test('same save can be reprocessed with new dependencies, but requires CAS',async t=>{
 const {s}=await store(t);const first=await s.put(id,body(),create);
 const f=JSON.parse(body(2));f.metadata.source=JSON.parse(body()).metadata.source;
 const next=Buffer.from(JSON.stringify(f));
 await assert.rejects(s.put(id,next,{match:'old',none:null}),{status:412});
 await s.put(id,next,{match:first.etag,none:null});
});
test('invalid Full, mismatched SteamID and unsafe paths never publish',async t=>{
 const {s,dir}=await store(t);
 await assert.rejects(s.put(id,Buffer.from('{}'),create),{status:422});
 await assert.rejects(s.put(id,body(1,id2),create),{status:400});
 await assert.rejects(s.put('../x',body(),create),{status:400});
 assert.deepEqual(await readdir(dir),[]);
});
test('parallel replacements with one ETag cannot lose an accepted write',async t=>{
 const {s}=await store(t),a=await s.put(id,body(),create);
 const results=await Promise.allSettled([s.put(id,body(2),{match:a.etag,none:null}),s.put(id,body(3),{match:a.etag,none:null})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results[1].reason.status,412);
});
test('failed replacement retains previous Full and removes temporary file',async t=>{
 const {s,dir}=await store(t);const a=await s.put(id,body(),create);
 const broken=new PlayerStates(dir,async()=>{throw Error('disk failure');});
 await assert.rejects(broken.put(id,body(2),{match:a.etag,none:null}),/disk failure/);
 assert.deepEqual((await s.get(id)).bytes,body());assert.deepEqual(await readdir(dir),[id+'.json']);
});
test('streamed and declared body limits',async()=>{
 await assert.rejects(requestBytes(new Request('http://fixture',{method:'PUT',body:'x',headers:{'content-length':String(BODY_LIMIT+1)}})),{status:413});
 const bodyStream=new ReadableStream({start(c){c.enqueue(new Uint8Array(BODY_LIMIT));c.enqueue(new Uint8Array(1));c.close();}});
 await assert.rejects(requestBytes(new Request('http://fixture',{method:'PUT',body:bodyStream,duplex:'half'})),{status:413});
});
