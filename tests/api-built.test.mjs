// Exercise SvelteKit's actual built routes without binding a socket or browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fullFromPois} from './snapshot-fixture.mjs';

test('built API PUT/GET/list, cache headers and rejection leave current intact',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'tlc-api-test-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 process.env.PLAYER_STATES_DIR=dir;
 const {Server}=await import('../.svelte-kit/output/server/index.js');
 const {manifest}=await import('../.svelte-kit/output/server/manifest.js');
 const server=new Server(manifest);await server.init({env:process.env});
 const call=(path,options={})=>server.respond(new Request('http://tlc.aqua.lan'+path,options),{getClientAddress:()=> '127.0.0.1'});
 const f=fullFromPois(),id=f.metadata.steamId64,path=`/api/players/${id}/state`,body=JSON.stringify(f);
 const headers={'Content-Type':'application/json','If-None-Match':'*'};
 const initial=await call(path,{method:'PUT',headers,body});assert.equal(initial.status,201);assert.equal(initial.headers.get('cache-control'),'no-store');
 const get=await call(path);assert.equal(get.status,200);assert.equal(await get.text(),body);assert.equal(get.headers.get('etag'),initial.headers.get('etag'));
 const repeat=await call(path,{method:'PUT',headers,body});assert.equal(repeat.status,200);
 assert.equal((await (await call('/api/players')).json()).players[0].steamId64,id);
 assert.equal((await call(path,{method:'PUT',headers,body:'{}'})).status,422);
 assert.equal((await call('/api/players/00000000000000002/state',{method:'PUT',headers,body})).status,400);
 assert.equal(await (await call(path)).text(),body);
 assert.equal((await call('/api/players/00000000000000002/state')).status,404);
 assert.equal((await call('/map')).status,200);
});
