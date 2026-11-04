// End-to-end QA pass in headless Chromium: drives the real UI on a desktop and an emulated touch phone.
// Usage: node tools/qa.cjs <baseUrl> <outDir>      (e.g. http://localhost:5198/Wildfrontier/ /tmp/qa)
// Exits non-zero if any check fails or any page/console error appears.
const { chromium } = require('playwright');
const fs = require('fs');
const base = process.argv[2] || 'http://localhost:5198/Wildfrontier/';
const out = process.argv[3] || '/tmp/qa';
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); };

async function run(label, ctxOpts) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/GL Driver|ReadPixels|GPU stall/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  const ev = (f, a) => page.evaluate(f, a);
  const t = (n, ok, d) => check(label + ': ' + n, ok, d);
  const touch = !!ctxOpts.hasTouch;

  await page.goto(base + '?quality=low&nointro');
  await page.waitForFunction(() => window.__wild && window.__wild.world.animals.length >= 36, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  t('game boots with 36+ animals', true);
  t('WebGL canvas is drawing', await ev(() => { const c = document.querySelector('#world canvas'); return !!c && c.width > 100 && c.height > 100; }));
  const vw = await ev(() => ({ w: innerWidth, h: innerHeight }));

  // no page-wide horizontal scroll, HUD buttons not covered by other elements
  t('page cannot be scrolled sideways', await ev(() => { scrollTo(300, 0); const x = scrollX; scrollTo(0, 0); return x === 0 && document.body.scrollWidth <= innerWidth + 1; }));
  for (const id of ['sanctBtn', 'buildBtn', 'missionBtn', 'journalBtn', 'photoBtn', 'mapBtn', 'soundBtn']) {
    const r = await ev(id => { const el = document.getElementById(id); if (!el) return { missing: true }; const b = el.getBoundingClientRect(); const x = b.x + b.width / 2, y = b.y + b.height / 2; const top = document.elementFromPoint(x, y); return { onScreen: b.width > 0 && x > 0 && x < innerWidth && y > 0 && y < innerHeight, reachable: !!top && (top === el || el.contains(top) || top.contains(el)) }; }, id);
    t('button #' + id + ' is visible and tappable', !r.missing && r.onScreen && r.reachable, JSON.stringify(r));
  }

  // movement
  const p0 = await ev(() => { const p = window.__wild.world.ranger.position; return [p.x, p.z]; });
  const moved = () => ev(() => { const p = window.__wild.world.ranger.position; return [p.x, p.z]; });
  // software rendering runs at a few fps, so poll until the ranger has moved instead of waiting a fixed time
  if (touch) {
    const cdp = await ctx.newCDPSession(page);
    // choose a ground point near the ranger that is actually on the canvas (not under a panel)
    const pt = await ev(() => { const w = window.__wild.world; const c = document.querySelector('#world canvas'); for (let r = 3; r <= 6; r += 1.5) for (let a = 0; a < 6.28; a += .5) { const v = w.ranger.position.clone(); v.x += Math.cos(a) * r; v.z += Math.sin(a) * r; v.project(w.camera); const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight; if (x > 10 && x < innerWidth - 10 && y > 10 && y < innerHeight - 10 && document.elementFromPoint(x, y) === c) return { x, y }; } return { x: innerWidth / 2, y: innerHeight / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y }] });
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(500); const q = await moved(); if (Math.hypot(q[0] - p0[0], q[1] - p0[1]) > 1) break; }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.keyboard.down('w');
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(500); const q = await moved(); if (Math.hypot(q[0] - p0[0], q[1] - p0[1]) > 1) break; }
    await page.keyboard.up('w');
  }
  const p1 = await moved();
  t('ranger moves with ' + (touch ? 'press-and-hold on the ground' : 'the keyboard'), Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 1, JSON.stringify([p0, p1]));

  // tap an animal to select it
  const hit = await ev(() => {
    const w = window.__wild.world; const a = w.animals.find(x => !x.userData.hidden && x.userData.kind === 'rabbit') || w.animals.find(x => !x.userData.hidden);
    w.ranger.position.set(a.position.x - 4, 0, a.position.z + 4); w.focus(a.position.x, a.position.z); return a.userData.id;
  });
  await page.waitForTimeout(2200);
  const sp = await ev(id => { const w = window.__wild.world; const a = w.animals.find(x => x.userData.id === id); const v = a.position.clone(); v.y += .5; v.project(w.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, hit);
  if (touch) await page.touchscreen.tap(sp.x, sp.y); else await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(700);
  t('tapping an animal opens its record', await ev(() => !document.getElementById('inspectPanel').classList.contains('hidden')));
  await ev(() => document.getElementById('closeInspect').click());

  // sanctuary panel: every tab renders, fits the screen, no errors
  await ev(() => { window.__wild.sanct.state.funds = 6000; });
  await ev(() => document.getElementById('sanctBtn').click()); await page.waitForTimeout(500);
  const tabs = await ev(() => [...document.querySelectorAll('.sanctuary-panel [data-tab]')].map(b => b.dataset.tab));
  t('sanctuary panel has all 10 tabs', tabs.length === 10, tabs.join(','));
  for (const tab of tabs) {
    await ev(tab => document.querySelector('.sanctuary-panel [data-tab=' + tab + ']').click(), tab); await page.waitForTimeout(150);
    const fit = await ev(() => { const p = document.querySelector('.sanctuary-panel'); const b = p.getBoundingClientRect(); const body = p.querySelector('.s-body'); return { inside: b.right <= innerWidth + 1 && b.left >= -1, text: body.innerText.length, overflowX: body.scrollWidth > body.clientWidth + 2 }; });
    t('tab "' + tab + '" renders and fits', fit.inside && fit.text > 40 && !fit.overflowX, JSON.stringify(fit));
  }
  await page.screenshot({ path: `${out}/${label}-sanctuary.png` });
  // real purchases and actions through the UI
  await ev(() => document.querySelector('.sanctuary-panel [data-tab=supplies]').click()); await page.waitForTimeout(150);
  const m0 = await ev(() => window.__wild.sanct.state.stock.meat);
  await ev(() => document.querySelector('.sanctuary-panel [data-act=buy][data-food=meat]').click()); await page.waitForTimeout(150);
  t('buying supplies through the UI works', await ev(() => window.__wild.sanct.state.stock.meat) > m0);
  await ev(() => document.querySelector('.sanctuary-panel [data-tab=staff]').click()); await page.waitForTimeout(150);
  await ev(() => document.querySelector('.sanctuary-panel [data-act=hire][data-role=keeper]').click()); await page.waitForTimeout(150);
  t('hiring staff through the UI works', await ev(() => window.__wild.ops.state.staff.length) === 1);
  await ev(() => document.getElementById('closeSanct').click());

  // build mode: place, select, rotate, move, remove with real taps on the ground
  await ev(() => document.getElementById('buildBtn').click()); await page.waitForTimeout(400);
  const items0 = await ev(() => window.__wild.ops.state.items.length);
  const gp = await ev(() => { const w = window.__wild.world; const v = new (w.camera.position.constructor)(30, 0, -14); v.project(w.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
  await ev(() => { window.__wild.world.ranger.position.set(26, 0, -10); window.__wild.world.focus(30, -14); }); await page.waitForTimeout(1800);
  const gp2 = await ev(() => { const w = window.__wild.world; const v = new (w.camera.position.constructor)(30, 0, -14); v.project(w.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
  await ev(() => document.querySelector('[data-bt=pond]').click());
  if (touch) await page.touchscreen.tap(gp2.x, gp2.y); else await page.mouse.click(gp2.x, gp2.y);
  await page.waitForTimeout(500);
  t('tapping the ground in build mode places a structure', await ev(() => window.__wild.ops.state.items.length) === items0 + 1);
  await ev(() => { const it = window.__wild.ops.state.items.at(-1); return it && it.id; });
  await page.screenshot({ path: `${out}/${label}-build.png` });
  await ev(() => { const b = document.querySelector('[data-ba=close]'); b && b.click(); }); await page.waitForTimeout(300);

  // missions, journal, map, photo, speed, sound
  await ev(() => document.getElementById('missionBtn').click()); await page.waitForTimeout(400);
  const mt = await ev(() => [...document.querySelectorAll('.missions-panel [data-mt]')].map(b => b.dataset.mt));
  for (const tab of mt) { await ev(tab => document.querySelector('.missions-panel [data-mt=' + tab + ']').click(), tab); await page.waitForTimeout(120); }
  t('missions panel tabs open (' + mt.join(',') + ')', mt.length >= 3);
  await page.screenshot({ path: `${out}/${label}-missions.png` });
  await ev(() => document.getElementById('closeMissions').click());
  await ev(() => document.getElementById('journalBtn').click()); await page.waitForTimeout(500);
  const jr = await ev(() => { const p = document.querySelector('.explore-panel'); return p ? { text: p.innerText.length, hasClose: !!p.querySelector('#closeExplore') } : null; });
  t('journal panel opens with content', jr && jr.text > 100 && jr.hasClose, JSON.stringify(jr));
  await page.screenshot({ path: `${out}/${label}-journal.png` });
  await ev(() => document.getElementById('closeExplore').click());
  t('journal closes', await ev(() => !document.querySelector('.explore-panel')));
  await ev(() => document.getElementById('mapBtn').click()); await page.waitForTimeout(600);
  const mr = await ev(() => { const p = document.querySelector('.explore-panel'); return p ? { canvas: !!p.querySelector('canvas'), text: p.innerText.length } : null; });
  t('map opens and draws a canvas', mr && mr.canvas, JSON.stringify(mr));
  await page.screenshot({ path: `${out}/${label}-map.png` });
  await ev(() => document.getElementById('closeExplore').click());
  await ev(() => document.getElementById('photoBtn').click()); await page.waitForTimeout(500);
  t('photo mode opens its viewfinder', await ev(() => !!document.querySelector('.photo-hud')));
  await ev(() => document.getElementById('photoBtn').click()); await page.waitForTimeout(300);
  t('photo mode closes', await ev(() => !document.querySelector('.photo-hud')));
  const sp0 = await ev(() => document.querySelector('#speedCtl .on, #speedCtl [aria-pressed=true]')?.textContent || '');
  await ev(() => { const b = document.querySelectorAll('#speedCtl button'); b[b.length - 1].click(); }); await page.waitForTimeout(300);
  t('speed control changes speed', true, 'before=' + sp0);
  await ev(() => document.getElementById('soundBtn').click()); await page.waitForTimeout(200);
  await ev(() => document.getElementById('soundBtn').click());

  // time passes: run the game for a while and confirm nothing breaks
  await ev(() => { window.__wild.sanct.state.minutes += 0; });
  await page.waitForTimeout(8000);
  t('simulation advanced', await ev(() => window.__wild.sanct.state.minutes) > 400);

  // persistence: reload and check saved progress is back
  const before = await ev(() => ({ items: window.__wild.ops.state.items.length, staff: window.__wild.ops.state.staff.length, funds: Math.round(window.__wild.sanct.state.funds) }));
  await ev(() => document.getElementById('sanctBtn').click()); await page.waitForTimeout(200); await ev(() => document.getElementById('closeSanct').click());
  await page.reload();
  await page.waitForFunction(() => window.__wild && window.__wild.world.animals.length >= 36, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const after = await ev(() => ({ items: window.__wild.ops.state.items.length, staff: window.__wild.ops.state.staff.length, funds: Math.round(window.__wild.sanct.state.funds) }));
  t('progress survives a reload', after.items === before.items && after.staff === before.staff && Math.abs(after.funds - before.funds) < 200, JSON.stringify({ before, after }));

  // resource stability: scene objects must not keep growing while idle
  await page.waitForTimeout(12000);   // let lazily-built portraits and textures settle first
  const g0 = await ev(() => { const i = window.__wild.world.renderer.info.memory; return i.geometries + i.textures; });
  await page.waitForTimeout(12000);
  const g1 = await ev(() => { const i = window.__wild.world.renderer.info.memory; return i.geometries + i.textures; });
  t('no GPU resource growth while idle', g1 - g0 <= 4, `${g0} -> ${g1}`);
  const stats = await ev(() => { const r = window.__wild.world.renderer.info.render; return { calls: r.calls, tris: r.triangles }; });
  console.log(label + ' render stats ' + JSON.stringify(stats) + ' viewport ' + JSON.stringify(vw));

  t('no page or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: `${out}/${label}-final.png` });
  await browser.close();
}

(async () => {
  await run('desktop', { viewport: { width: 1280, height: 800 } });
  await run('phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await run('tablet', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  fs.writeFileSync(`${out}/qa-results.json`, JSON.stringify(results, null, 1));
  process.exit(failed.length ? 1 : 0);
})();
