import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {worldToScene,sceneToWorld,zoomAt,atPixel,gridStep} from '../src/lib/map/coordinates.ts';
describe('world coordinates',()=>{
 const raw=Object.freeze({x:1599700.4,y:-378025.88,z:-15.065677});
 for(const origin of [{x:0,y:0,z:0},{x:1599700,y:-378000,z:-10},{x:1e10,y:-1e10,z:20}])it(`roundtrip ${origin.x}`,()=>{const back=sceneToWorld(worldToScene(raw,origin),origin);for(const k of ['x','y','z'])assert.ok(Math.abs(back[k]-raw[k])<.001);});
 it('centimetre at large world coordinates after CPU rebase',()=>{const origin={x:1e10,y:-1e10,z:0};const scene=worldToScene({x:origin.x+1,y:origin.y+1,z:null},origin);assert.ok(Math.abs(Math.fround(scene.x)-.01)<1e-9);assert.equal(scene.y,null);assert.equal(sceneToWorld(scene,origin).z,null);});
 it('orientation',()=>assert.deepEqual(worldToScene({x:100,y:200,z:300},{x:0,y:0,z:0}),{x:1,y:3,z:2}));
 it('zoom cursor anchor and immutable raw',()=>{const before=JSON.stringify(raw);const a=atPixel(raw.x,raw.y,2000000,1920,1080,1350,600);const c=zoomAt(raw.x,raw.y,2000000,10,1920,1080,1350,600);const b=atPixel(c.x,c.y,10,1920,1080,1350,600);assert.ok(Math.abs(a.x-b.x)<1e-8);assert.ok(Math.abs(a.y-b.y)<1e-8);assert.equal(JSON.stringify(raw),before);});
 it('1cm grid reachable on Full HD',()=>assert.equal(gridStep(10,1920),1));
});
