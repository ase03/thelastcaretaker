import {test,expect} from '@playwright/test';
import {fixture,fullFromPois} from './snapshot-fixture.mjs';
const upload=async(page,d)=>page.locator('input[type=file]').setInputFiles({name:'snapshot.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
for(const mode of ['2D','3D'])test(`snapshot groups, local XYZ and camera return from ${mode}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();
 await upload(page,fixture());await expect(page.getByRole('status')).toContainText('Спойлеры');await expect(page.getByRole('checkbox',{name:'Показать находки'})).not.toBeChecked();
 if(mode==='3D')await page.getByRole('button',{name:'3D',exact:true}).click();
 await page.getByRole('button',{name:'Увеличить',exact:true}).click();await page.locator('aside .list').first().locator('button').click();await page.getByRole('checkbox',{name:'Показать находки'}).check();await page.getByRole('checkbox',{name:'Показать слой POI'}).uncheck();await page.getByRole('button',{name:'Общий вид',exact:true}).click();
 await expect(page.locator('.marker')).toHaveCount(1);await expect(page.locator('.marker')).toHaveAttribute('title',/Memory: 1.*Rare: 1.*4 единиц/);
 await page.locator('.marker').click();const box=await page.locator('.marker').boundingBox();const readout=await page.locator('.readout').innerText();
 await page.getByRole('button',{name:'Показать область в 3D'}).click();await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.marker')).toHaveCount(2);
 const upper=await page.locator('.marker').filter({hasText:'item-high'}).boundingBox(),lower=await page.locator('.marker').filter({hasText:'item-low'}).boundingBox();expect(Math.abs(upper.y-lower.y)).toBeGreaterThan(20);
 await page.locator('.marker').filter({hasText:'item-low'}).click();await expect(page.locator('aside section').filter({hasText:'Raw XYZ:'})).toContainText('Raw XYZ: 100, 200, -5000');await expect(page.locator('aside section').filter({hasText:'Raw XYZ:'})).toContainText('количество: 3');
 await page.getByRole('button',{name:'Вернуться к карте'}).first().click();await expect(page.getByRole('button',{name:mode,exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>{const b=await page.locator('.marker').boundingBox();return Math.abs(b.x-box.x)+Math.abs(b.y-box.y);}).toBeLessThan(1);
 expect((await page.locator('.readout').innerText()).split('\n').at(-1)).toBe(readout.split('\n').at(-1));
 const broken=fixture();broken.metadata.coverage.scanner.inRadius.Rare=999;await upload(page,broken);await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('.marker')).toHaveCount(1);
 await page.getByRole('button',{name:'Показать область в 3D'}).click();await upload(page,fullFromPois());await expect(page.getByRole('button',{name:'Вернуться к карте'})).toHaveCount(0);await expect(page.locator('.marker')).toHaveCount(0);await expect(page.getByRole('checkbox',{name:'Показать находки'})).not.toBeChecked();expect(errors).toEqual([]);
});

test('invalid Full and legacy imports preserve accepted snapshot and local view',async({page})=>{
 await page.goto('/map');await expect(page.locator('canvas')).toBeVisible();await upload(page,fixture());
 await page.getByRole('checkbox',{name:'Показать находки'}).check();
 await page.getByLabel('Группы находок').locator('button').first().click();
 await page.getByRole('button',{name:'Показать область в 3D'}).click();
 for(const broken of [{schemaVersion:1,units:'UE-cm',pois:[]},{...fixture(),schema:'tlc-scanner-snapshot/1'}, {...fixture(),representation:'scanner'}]){
  await upload(page,broken);await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.snapshot-info')).toContainText('2 записей');
  await expect(page.locator('.marker')).toHaveCount(2);await expect(page.getByRole('button',{name:'Вернуться к карте'}).first()).toBeVisible();
 }
});

for(const origin of ['localhost','http'])test(`private official Full one-file import: ${origin}`,async({page})=>{
 test.skip(!process.env.TLC_FULL_JSON,'Private Full not configured');
 const {readFileSync}=await import('node:fs');const buffer=readFileSync(process.env.TLC_FULL_JSON);
 const {readFull}=await import('../src/lib/map/full-snapshot.ts');const {projectFull}=await import('../src/lib/map/snapshot.ts');
 const projection=projectFull(await readFull(buffer.toString('utf8')));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Serve the existing preview build at an untrusted HTTP test origin. No
 // crypto mocks, HTTPS flags, server configuration changes or external server.
 if(origin==='http')await page.route('http://tlc-http.test:4173/**',async route=>{
  const url=new URL(route.request().url());url.hostname='127.0.0.1';
  await route.fulfill({response:await route.fetch({url:url.href})});
 });
 await page.goto(origin==='http'?'http://tlc-http.test:4173/map':'/map');
 const capabilities=await page.evaluate(()=>({secure:isSecureContext,subtle:!!globalThis.crypto?.subtle}));
 expect(capabilities).toEqual({secure:origin==='localhost',subtle:origin==='localhost'});
 await expect(page.locator('canvas')).toBeVisible();
 await page.locator('input[type=file]').setInputFiles({name:'full.json',mimeType:'application/json',buffer});
 await expect(page.locator('.snapshot-info')).toContainText(`${projection.stats.objects} записей`,{timeout:30000});
 await expect(page.locator('aside .list').first().locator('button')).toHaveCount(projection.pois.length);
 await page.getByRole('checkbox',{name:'Показать находки'}).check();
 await expect(page.getByLabel('Группы находок').locator('button')).toHaveCount(projection.groups.length);
 await page.getByRole('button',{name:'3D',exact:true}).click();await expect(page.locator('canvas')).toHaveCount(1);
 await page.getByLabel('Группы находок').locator('button').first().click();await page.getByRole('button',{name:'Показать область в 3D'}).click();
 await expect(page.locator('.marker')).not.toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Вернуться к карте'}).first().click();
 await expect(page.locator('canvas')).toHaveCount(1);expect(errors).toEqual([]);
});
