import {test,expect} from '@playwright/test';
test('map and existing routes',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'The Last Caretaker',exact:true})).toBeVisible();
 await page.goto('/inventory');await expect(page.locator('main')).toBeVisible();
 await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();await expect(page.getByText('Данные не загружены.',{exact:false})).toBeVisible();
 const fixture={schemaVersion:1,units:'UE-cm',pois:[{id:'synthetic-test',name:'Synthetic test point',world:{x:1599700.4,y:-378025.88,z:null},source:'Synthetic test only',gameBuild:'test',knowledge:'known',accuracy:'synthetic',layer:'poi',visibility:'local'}]};
 await page.locator('input[type=file]').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await page.locator('.list button').click();await expect(page.locator('section')).toContainText('15 997,004');await expect(page.locator('section')).toContainText('неизвестна');await page.getByRole('button',{name:'Центрировать',exact:true}).click();
 const marker=await page.locator('.marker').boundingBox(),view=await page.locator('.viewport').boundingBox();expect(Math.abs(marker.x+marker.width/2-view.x-view.width/2)).toBeLessThan(1);
 const before=await page.locator('.readout').innerText();await page.mouse.move(view.x+view.width/2,view.y+view.height/2);await page.mouse.wheel(0,-500);await expect.poll(()=>page.locator('.readout').innerText()).not.toBe(before);
 await page.mouse.move(view.x+view.width/2,view.y+view.height/2+70);await page.mouse.down();await page.mouse.move(view.x+view.width/2+100,view.y+view.height/2+70,{steps:10});await page.mouse.up();await expect.poll(async()=> (await page.locator('.marker').boundingBox()).x).not.toBe(marker.x);
 for(let i=0;i<12;i++)await page.getByRole('button',{name:'Увеличить',exact:true}).click();await expect(page.locator('.readout')).toContainText('1 см');
 console.log('frame intervals',await page.evaluate(async()=>{const values=[];for(let i=0;i<60;i++)values.push(await new Promise(r=>requestAnimationFrame(r)));return {meanMs:(values.at(-1)-values[0])/59};}));
 await page.screenshot({path:'test-results/map.png'});await page.goto('/');expect(errors).toEqual([]);
});

test('local known POI and interaction timing',async({page})=>{
 test.skip(!process.env.TLC_MAP_LOCAL_JSON,'Optional private data check');
 await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();await page.locator('input[type=file]').setInputFiles(process.env.TLC_MAP_LOCAL_JSON);await expect(page.locator('.list button')).toHaveCount(50);
  await expect.poll(()=>page.locator('.poi-label:not(.suppressed)').count()).toBeGreaterThan(10);
 await page.screenshot({path:'test-results/map-labels-fullhd.png'});
 await page.getByRole('textbox',{name:'Поиск POI'}).fill('Lazarus');await expect(page.locator('.list button')).toHaveCount(1);await page.getByRole('textbox',{name:'Поиск POI'}).fill('');
 const measurements=[];
 for(const zooms of [0,8,16]){
 await page.getByRole('button',{name:'Общий вид',exact:true}).click();for(let i=0;i<zooms;i++)await page.getByRole('button',{name:'Увеличить',exact:true}).click();
 const result=await page.evaluate(async()=>{const host=document.querySelector('.viewport'),times=[];let previous=performance.now();for(let i=0;i<90;i++){await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-previous);previous=now;host.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?1:-1,bubbles:true,cancelable:true,clientX:800,clientY:400}));}times.sort((a,b)=>a-b);return {meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:times[Math.floor(times.length*.95)]};});
 measurements.push({zooms,...result});
 }
 console.log('50 POI continuous wheel benchmark',JSON.stringify(measurements));await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Общий вид',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.locator('.poi-label:not(.suppressed)').count()).toBeGreaterThan(0);await page.screenshot({path:'test-results/map-mobile.png'});
 for(let i=0;i<6;i++)await page.getByRole('button',{name:'Уменьшить',exact:true}).click();
 await expect(page.locator('.marker')).toHaveCount(50);
 const boxes=await page.locator('.poi-label:not(.suppressed)').evaluateAll(labels=>labels.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];expect(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y).toBe(false);}
});

test('permanent labels, hover and selected priority',async({page})=>{
 await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();
 const pois=[0,1,2].map(i=>({id:`label-test-${i}`,name:`Synthetic label ${i}`,world:{x:i===2?300:0,y:0,z:null},source:'test',gameBuild:'test',knowledge:'known',accuracy:'synthetic',layer:'poi',visibility:'local'}));
 await page.locator('input[type=file]').setInputFiles({name:'labels.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,units:'UE-cm',pois}))});
 const marker=page.locator('.marker').filter({hasText:'Synthetic label 0'}),label=marker.locator('.poi-label');
 await expect(label).toBeVisible();await expect(page.locator('aside section')).toHaveCount(0);
 const normalColor=await marker.evaluate(el=>getComputedStyle(el).color);
 await label.hover();const hoverColor=await marker.evaluate(el=>getComputedStyle(el).color);expect(hoverColor).not.toBe(normalColor);await expect(page.locator('aside section')).toHaveCount(0);
 await page.mouse.move(350,250);await expect.poll(()=>marker.evaluate(el=>getComputedStyle(el).color)).toBe(normalColor);
 await label.click();await expect(marker).toHaveClass(/chosen/);const yellow=await marker.evaluate(el=>getComputedStyle(el).color);await marker.hover();expect(await marker.evaluate(el=>getComputedStyle(el).color)).toBe(yellow);
 await page.locator('.list button').filter({hasText:'Synthetic label 1'}).click();await expect(page.locator('.chosen .poi-label')).toBeVisible();
 await page.getByRole('button',{name:'Центрировать',exact:true}).click();
 const viewport=await page.locator('.viewport').boundingBox();await expect.poll(async()=>{const point=await page.locator('.chosen').boundingBox();return Math.abs(point.x+point.width/2-viewport.x-viewport.width/2);}).toBeLessThan(1);
 await page.getByRole('checkbox',{name:'Показать слой POI'}).uncheck();await expect(page.locator('.marker')).toHaveCount(0);
});

test('3D height projection, orbit, pan, focus and return to 2D',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();
 const pois=[{id:'upper',name:'Synthetic upper',world:{x:10000000,y:-10000000,z:10000}},{id:'lower',name:'Synthetic lower',world:{x:10000000,y:-10000000,z:-10000}},{id:'unknown',name:'Synthetic unknown',world:{x:10000000,y:-10000000,z:null}}].map(p=>({...p,source:'test',gameBuild:'test',knowledge:'known',accuracy:'synthetic',layer:'poi',visibility:'local'}));
 await page.locator('input[type=file]').setInputFiles({name:'3d.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,units:'UE-cm',pois}))});
 await page.getByRole('button',{name:'3D',exact:true}).click();await expect(page.getByRole('button',{name:'3D',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.marker')).toHaveCount(3);
 const upper=page.getByRole('button',{name:'Synthetic upper',exact:true}).last(),lower=page.getByRole('button',{name:'Synthetic lower',exact:true}).last();const up=await upper.boundingBox(),lo=await lower.boundingBox();expect(Math.abs(up.y-lo.y)).toBeGreaterThan(20);
 await expect(page.locator('.marker').filter({hasText:'Synthetic unknown'})).toContainText('◇');
 await upper.hover();await expect(page.locator('aside section')).toHaveCount(0);await upper.click();await expect(page.locator('.chosen')).toHaveCount(1);await page.getByRole('button',{name:'Центрировать',exact:true}).click();const view=await page.locator('.viewport').boundingBox();
 await expect.poll(async()=>{const r=await page.locator('.chosen').boundingBox();return Math.hypot(r.x+r.width/2-view.x-view.width/2,r.y+r.height/2-view.y-view.height/2);}).toBeLessThan(1);
 await page.getByRole('button',{name:'Общий вид',exact:true}).click();const before=await lower.boundingBox();
 await page.mouse.move(view.x+view.width*.7,view.y+view.height*.65);await page.mouse.down({button:'right'});await page.mouse.move(view.x+view.width*.7+150,view.y+view.height*.65+80,{steps:20});await page.mouse.up({button:'right'});await expect.poll(async()=>{const r=await lower.boundingBox();return Math.abs(r.y-before.y);}).toBeGreaterThan(5);
 const readout=await page.locator('.readout').innerText();await page.mouse.wheel(0,-200);await expect.poll(()=>page.locator('.readout').innerText()).not.toBe(readout);
 await page.mouse.down();await page.mouse.move(view.x+view.width*.6,view.y+view.height*.6,{steps:10});await page.mouse.up();
 await page.screenshot({path:'test-results/map-3d-synthetic.png'});
 await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.list button')).toHaveCount(3);await expect(page.locator('.chosen')).toHaveCount(1);await expect(page.locator('section')).toContainText('Z: 100,00 м');
 for(let i=0;i<4;i++){await page.getByRole('button',{name:'3D',exact:true}).click();await page.getByRole('button',{name:'2D',exact:true}).click();}await page.goto('/inventory');expect(errors).toEqual([]);
});

test('3D with 50 local POI performance',async({page})=>{
 test.skip(!process.env.TLC_MAP_LOCAL_JSON,'Optional private data check');await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();await page.locator('input[type=file]').setInputFiles(process.env.TLC_MAP_LOCAL_JSON);await page.getByRole('button',{name:'3D',exact:true}).click();await expect(page.locator('.list button')).toHaveCount(50);await expect.poll(()=>page.locator('.marker').count()).toBeGreaterThan(40);
 console.log('3D continuous wheel 50 POI',await page.evaluate(async()=>{const canvas=document.querySelector('canvas'),times=[];let previous=performance.now();for(let i=0;i<90;i++){await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-previous);previous=now;canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?1:-1,bubbles:true,cancelable:true,clientX:800,clientY:400}));}times.sort((a,b)=>a-b);return {meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:times[85]};}));
 await page.screenshot({path:'test-results/map-3d-fullhd.png'});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Общий вид',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();await page.screenshot({path:'test-results/map-3d-mobile.png'});
});

test('3D map mouse controls and wheel over labels',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();
 const pois=[{id:'a',name:'Anchor A',world:{x:-10000,y:0,z:0}},{id:'b',name:'Anchor B',world:{x:10000,y:0,z:0}}].map(p=>({...p,source:'test',gameBuild:'test',knowledge:'known',accuracy:'synthetic',layer:'poi',visibility:'local'}));
 await page.locator('input[type=file]').setInputFiles({name:'controls.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,units:'UE-cm',pois}))});await page.getByRole('button',{name:'3D',exact:true}).click();
 await expect(page.getByLabel('Управление картой')).toContainText('Правая кнопка + drag');
 const a=page.locator('.marker').filter({hasText:'Anchor A'}),b=page.locator('.marker').filter({hasText:'Anchor B'}),view=await page.locator('.viewport').boundingBox();
 const centre=async locator=>{const box=await locator.boundingBox();return {x:box.x+box.width/2,y:box.y+box.height/2};};
 let first=await centre(a),second=await centre(b);
 await page.mouse.move(view.x+view.width*.7,view.y+view.height*.75);await page.mouse.down();await page.mouse.move(view.x+view.width*.7+80,view.y+view.height*.75,{steps:20});await page.mouse.up();
 await expect.poll(async()=>Math.abs((await centre(a)).x-first.x)).toBeGreaterThan(20);
 // Perspective pan shifts both points together; their different depths allow small parallax.
 await page.waitForTimeout(500);let afterA=await centre(a),afterB=await centre(b);expect(Math.hypot((afterB.x-afterA.x)-(second.x-first.x),(afterB.y-afterA.y)-(second.y-first.y))/Math.hypot(second.x-first.x,second.y-first.y)).toBeLessThan(.15);
 first=afterA;second=afterB;await page.mouse.down({button:'right'});await page.mouse.move(view.x+view.width*.6,view.y+view.height*.6,{steps:20});await page.mouse.up({button:'right'});await expect.poll(async()=>{const aa=await centre(a),bb=await centre(b);return Math.abs((bb.y-aa.y)-(second.y-first.y));}).toBeGreaterThan(5);
 await page.getByRole('button',{name:'Общий вид',exact:true}).click();await page.waitForTimeout(500);
 // A ray through an off-centre marker remains on that marker during cursor zoom.
 const anchor=await centre(a);await page.mouse.move(anchor.x,anchor.y);const before=await page.locator('.readout').innerText();await page.mouse.wheel(0,-180);await expect.poll(()=>page.locator('.readout').innerText()).not.toBe(before);await page.waitForTimeout(300);const zoomed=await centre(a);expect(Math.hypot(zoomed.x-anchor.x,zoomed.y-anchor.y)).toBeLessThan(2);
 await a.locator('.poi-label').hover();const underLabel=await page.locator('.readout').innerText();await page.mouse.wheel(0,-180);await expect.poll(()=>page.locator('.readout').innerText()).not.toBe(underLabel);await expect(page.locator('aside section')).toHaveCount(0);
 await a.locator('.poi-label').click();await expect(a).toHaveClass(/chosen/);
 await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.getByLabel('Управление картой')).not.toContainText('Правая кнопка');await expect(page.locator('.chosen')).toHaveCount(1);expect(errors).toEqual([]);
});
