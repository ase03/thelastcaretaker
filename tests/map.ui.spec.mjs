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
 const measurements=[];
 for(const zooms of [0,8,16]){
 await page.getByRole('button',{name:'Общий вид',exact:true}).click();for(let i=0;i<zooms;i++)await page.getByRole('button',{name:'Увеличить',exact:true}).click();
 const result=await page.evaluate(async()=>{const host=document.querySelector('.viewport'),times=[];let previous=performance.now();for(let i=0;i<90;i++){await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-previous);previous=now;host.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?1:-1,bubbles:true,cancelable:true,clientX:800,clientY:400}));}times.sort((a,b)=>a-b);return {meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:times[Math.floor(times.length*.95)]};});
 measurements.push({zooms,...result});
 }
 console.log('50 POI continuous wheel benchmark',JSON.stringify(measurements));await page.setViewportSize({width:390,height:844});await expect(page.locator('canvas')).toBeVisible();await page.screenshot({path:'test-results/map-mobile.png'});
});
