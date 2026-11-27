const { chromium } = require('playwright');
const fs = require('fs');
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/e2e-smoke.cjs [outDir]
const path = require('path');
const S = process.argv[2] || require('os').tmpdir();
const SAMPLE = path.join(__dirname, '..', 'samples', 'sample-fictional.csv');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8+/fPfwAJiAPiN9HeYwAAAABJRU5ErkJggg==', 'base64');
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, deviceScaleFactor: 2, geolocation: { latitude: 13.7563, longitude: 100.5018 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  const tileReqs = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // OSM tiles are blocked by this sandbox's network proxy; serve a placeholder but record the requests.
  await page.route('https://tile.openstreetmap.org/**', (r) => { tileReqs.push(r.request().url()); r.fulfill({ contentType: 'image/png', body: png }); });
  await page.goto('http://localhost:4173/');
  await page.waitForSelector('.leaflet-container');
  check('map renders', await page.locator('.leaflet-container').isVisible());
  check('OSM attribution shown', (await page.locator('.leaflet-control-attribution').innerText()).includes('OpenStreetMap'));
  check('tiles requested at zoom 6', tileReqs.some((u) => /\/6\/\d+\/\d+\.png/.test(u)), `(${tileReqs.length} reqs)`);
  check('local fallback labelled', (await page.locator('.datasource').innerText()).includes('Local'));

  const map = page.locator('.leaflet-container');
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width / 2 + 40, y: box.height / 2 + 30 } });
  const chip = await page.locator('.coord-chip').innerText();
  check('map click shows lat/lng', /Lat\s+\d+\.\d{6}/.test(chip) && /Lng\s+\d+\.\d{6}/.test(chip), chip.replace(/\n/g, ' '));

  // zoom in via control (interactive)
  await page.locator('.leaflet-control-zoom-in').click();
  await page.waitForTimeout(400);
  check('zoom control works', tileReqs.some((u) => /\/7\/\d+\/\d+\.png/.test(u)));

  // Create
  await page.getByRole('button', { name: '＋ เพิ่มตำแหน่ง' }).click();
  const latBefore = await page.locator('input[name=latitude]').inputValue();
  check('form prefilled from map selection', latBefore !== '', latBefore);
  await map.click({ position: { x: box.width / 2 - 60, y: box.height / 2 - 20 } });
  const latAfter = await page.locator('input[name=latitude]').inputValue();
  check('map click updates form coordinates', latAfter !== latBefore && latAfter !== '', `${latBefore} -> ${latAfter}`);
  await page.locator('input[name=latitude]').fill('13.756331');
  await page.locator('input[name=longitude]').fill('100.501762');
  await page.locator('input[name=house_no]').fill('99/1');
  await page.locator('input[name=soi]').fill('ทดสอบ 5');
  await page.locator('input[name=street]').fill('ราชดำเนิน');
  await page.locator('input[name=landmark]').fill('ตรงข้ามร้านกาแฟ (ตัวอย่าง)');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await page.waitForSelector('.detail');
  check('location created', (await page.locator('.detail h2').innerText()).includes('99/1'));
  check('marker on map', (await page.locator('.leaflet-marker-pane .pin-landmarks').count()) === 1);

  // persisted after reload
  await page.reload();
  await page.waitForSelector('.saved-item');
  check('saved after reload (local fallback)', (await page.locator('.saved-item').count()) === 1);

  // Search
  tileReqs.length = 0;
  await page.getByLabel('คำค้นหา').fill('ซ.ทดสอบ');
  await page.waitForSelector('.result');
  const res = await page.locator('.result').first().innerText();
  check('search result shows label/coords/source/status', res.includes('99/1') && res.includes('13.756331') && res.includes('user_created') && res.includes('ยังไม่ยืนยัน'), res.replace(/\n/g, ' | '));
  await page.locator('.result').first().click();
  await page.waitForTimeout(1500);
  check('search selection moves map (tiles at z17)', tileReqs.some((u) => /\/17\/\d+\/\d+\.png/.test(u)));
  check('selected marker highlighted', (await page.locator('.pin-selected').count()) === 1);
  await page.locator('.leaflet-marker-pane .pin-selected').click({ force: true });
  await page.waitForSelector('.leaflet-popup-content');
  check('marker popup', (await page.locator('.leaflet-popup-content').innerText()).includes('99/1'));
  await page.screenshot({ path: path.join(S, "desktop-detail.png") });

  // Verify
  await page.getByRole('button', { name: /ยืนยันแล้ว/ }).click();
  await page.waitForTimeout(300);
  const detail = await page.locator('.detail').innerText();
  check('explicit verification + timestamp', detail.includes('ยืนยันเมื่อ') && (await page.locator('.detail .badge-verified').count()) === 1);
  check('verified layer marker', (await page.locator('.leaflet-marker-pane .pin-verified').count()) === 1);

  // Edit
  await page.getByRole('button', { name: 'แก้ไข' }).click();
  await page.locator('input[name=house_no]').fill('99/2');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await page.waitForSelector('.detail');
  check('edit saved', (await page.locator('.detail h2').innerText()).includes('99/2'));
  await page.locator('.detail .icon-btn').click();

  // CSV import
  await page.getByRole('button', { name: 'นำเข้า CSV' }).click();
  await page.setInputFiles('input[type=file]', SAMPLE);
  await page.waitForSelector('.summary');
  const summary = await page.locator('.summary').innerText();
  check('CSV preview summary (5 total, 2 valid, 2 invalid, 1 dup)', /ทั้งหมด\s*5/.test(summary) && /ถูกต้อง\s*2/.test(summary) && /ไม่ถูกต้อง\s*2/.test(summary) && /ซ้ำ\s*1/.test(summary), summary.replace(/\n/g, ' '));
  await page.screenshot({ path: path.join(S, "desktop-import.png") });
  await page.getByRole('button', { name: /ยืนยันนำเข้า 2 รายการ/ }).click();
  await page.waitForSelector('.success');
  check('CSV import saved 2 rows', (await page.locator('.success').innerText()).includes('2'));
  await page.locator('.import .icon-btn').click();
  check('total saved = 3', (await page.locator('.saved-item').count()) === 3);
  const unverifiedImports = await page.locator('.saved-item .badge-unverified').count();
  check('imported rows unverified', unverifiedImports === 2);

  // Layers
  const pins = async () => page.locator('.leaflet-marker-pane .pin').count();
  const before = await pins();
  await page.getByLabel('ตำแหน่งที่ยืนยันแล้ว').uncheck();
  const noVerified = await pins();
  await page.getByLabel('จุดสังเกต').uncheck();
  const noLandmark = await pins();
  await page.getByLabel('แผนที่ฐาน').uncheck();
  const tilesHidden = (await page.locator('.leaflet-tile-pane img').count()) === 0;
  check('layer toggles', before >= 3 && noVerified === before - 1 && noLandmark === noVerified - 1 && tilesHidden, `${before}/${noVerified}/${noLandmark} base hidden=${tilesHidden}`);
  for (const l of ['ตำแหน่งที่ยืนยันแล้ว', 'จุดสังเกต', 'แผนที่ฐาน']) await page.getByLabel(l).check();

  // Delete with confirmation
  await page.locator('.saved-item').first().click();
  await page.getByRole('button', { name: 'ลบ' }).click();
  check('delete asks confirmation', await page.getByRole('alertdialog').isVisible());
  await page.getByRole('alertdialog').getByRole('button', { name: 'ลบ' }).click();
  await page.waitForTimeout(300);
  check('deleted', (await page.locator('.saved-item').count()) === 2);

  // Locate
  await page.getByRole('button', { name: 'ตำแหน่งของฉัน' }).click();
  await page.waitForTimeout(1200);
  check('locate button (mock geolocation)', (await page.locator('.coord-chip').innerText()).includes('13.756300'));
  await page.screenshot({ path: path.join(S, "desktop.png") });

  // Mobile
  const m = await browser.newContext({ ...require('playwright').devices['iPhone 13'] });
  const mp = await m.newPage();
  await mp.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ contentType: 'image/png', body: png }));
  await mp.goto('http://localhost:4173/');
  await mp.waitForSelector('.leaflet-container');
  const sb = await mp.locator('.search-row').boundingBox();
  const sheet = await mp.locator('.sidebar').boundingBox();
  const vw = mp.viewportSize();
  check('mobile: search at top, sheet at bottom', sb.y < 30 && sheet.y + sheet.height >= vw.height - 1);
  const scrollW = await mp.evaluate(() => document.documentElement.scrollWidth);
  check('mobile: no horizontal scroll', scrollW <= vw.width, `${scrollW}/${vw.width}`);
  await mp.screenshot({ path: path.join(S, "mobile.png") });
  await mp.getByRole('button', { name: '＋ เพิ่มตำแหน่ง' }).click();
  await mp.waitForTimeout(400);
  await mp.screenshot({ path: path.join(S, "mobile-form.png") });
  check('mobile: bottom sheet opens with form', await mp.locator('.loc-form').isVisible());

  check('no console/page errors', errors.length === 0, errors.join(' || '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
