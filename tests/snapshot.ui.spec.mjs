import {test,expect} from '@playwright/test';
import {fixture} from './snapshot-fixture.mjs';
import {readFileSync} from 'node:fs';
const upload=async(page,d)=>page.locator('input[type=file]').setInputFiles({name:'snapshot.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
for(const mode of ['2D','3D'])test(`snapshot groups, local XYZ and camera return from ${mode}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();
 await upload(page,fixture());await expect(page.getByRole('status')).toContainText('Спойлеры');await expect(page.getByRole('checkbox',{name:'Показать находки'})).not.toBeChecked();
 if(mode==='3D')await page.getByRole('button',{name:'3D',exact:true}).click();
 await page.getByRole('button',{name:'Увеличить',exact:true}).click();await page.locator('aside .list').first().locator('button').click();await page.getByRole('checkbox',{name:'Показать находки'}).check();
 await expect(page.locator('.marker')).toHaveCount(1);await expect(page.locator('.marker')).toHaveAttribute('title',/Memory: 1.*Rare: 1.*4 единиц/);
 await page.locator('.marker').click();const box=await page.locator('.marker').boundingBox();const readout=await page.locator('.readout').innerText();
 await page.getByRole('button',{name:'Показать область в 3D'}).click();await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.marker')).toHaveCount(2);
 const upper=await page.locator('.marker').filter({hasText:'item-high'}).boundingBox(),lower=await page.locator('.marker').filter({hasText:'item-low'}).boundingBox();expect(Math.abs(upper.y-lower.y)).toBeGreaterThan(20);
 await page.locator('.marker').filter({hasText:'item-low'}).click();await expect(page.locator('aside section')).toContainText('Raw XYZ: 100, 200, -5000');await expect(page.locator('aside section')).toContainText('количество: 3');
 await page.getByRole('button',{name:'Вернуться к карте'}).first().click();await expect(page.getByRole('button',{name:mode,exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>{const b=await page.locator('.marker').boundingBox();return Math.abs(b.x-box.x)+Math.abs(b.y-box.y);}).toBeLessThan(1);
 expect((await page.locator('.readout').innerText()).split('\n').at(-1)).toBe(readout.split('\n').at(-1));
 const broken=fixture();broken.groups[0].counts.Rare=999;await upload(page,broken);await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('.marker')).toHaveCount(1);
 await page.getByRole('button',{name:'Показать область в 3D'}).click();await upload(page,{schemaVersion:1,units:'UE-cm',pois:[]});await expect(page.getByRole('button',{name:'Вернуться к карте'})).toHaveCount(0);await expect(page.locator('.marker')).toHaveCount(0);await expect(page.getByRole('checkbox',{name:'Показать находки'})).not.toBeChecked();expect(errors).toEqual([]);
});
test('private reviewed snapshot complete one-file flow',async({page})=>{
 test.skip(!process.env.TLC_MAP_SNAPSHOT,'Private snapshot not configured');await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();await page.locator('input[type=file]').setInputFiles(process.env.TLC_MAP_SNAPSHOT);
 await expect(page.locator('.snapshot-info')).toContainText('1028 находок · 85 групп');await page.getByRole('checkbox',{name:'Показать находки'}).check();await expect(page.getByLabel('Группы находок').locator('button')).toHaveCount(85);
 const data=JSON.parse(readFileSync(process.env.TLC_MAP_SNAPSHOT,'utf8'));const largest=data.groups.reduce((best,g,i)=>g.occurrenceKeys.length>data.groups[best].occurrenceKeys.length?i:best,0);
 const intervals=await page.evaluate(async()=>{const times=[];for(let i=0;i<60;i++)times.push(await new Promise(r=>requestAnimationFrame(r)));return (times.at(-1)-times[0])/59;});console.log('50 POI / 85 groups frame interval (ms)',intervals);
 await page.getByLabel('Группы находок').locator('button').nth(largest).click();await page.getByRole('button',{name:'Показать область в 3D'}).click();await expect(page.locator('.marker')).not.toHaveCount(0);await page.screenshot({path:'test-results/snapshot-local-private.png'});
 await page.setViewportSize({width:390,height:844});await expect(page.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'Вернуться к карте'}).first().click();await expect(page.locator('canvas')).toHaveCount(1);
});
