// Monkey test: random taps, drags and key presses against the real UI for a while; reports any page or console error.
// Usage: node tools/monkey.cjs <baseUrl> [seconds] [phone]
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:5198/Wildfrontier/';
const seconds = Number(process.argv[3]) || 60;
const phone = process.argv[4] === 'phone';
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 800, height: 500 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/GL Driver|ReadPixels|GPU stall/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('dialog', d => d.dismiss().catch(() => {}));   // "start a new sanctuary?" confirm etc.
  await page.goto(base + '?quality=low&nointro');
  await page.waitForFunction(() => window.__wild && window.__wild.world.animals.length >= 36, null, { timeout: 120000 });
  await page.evaluate(() => { window.__wild.sanct.state.funds = 8000; });
  const keys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'Escape', 'e', 'E', 'Enter', ' ', '1', '2', '3', 'b', 'm', 'j'];
  const end = Date.now() + seconds * 1000; let actions = 0;
  while (Date.now() < end) {
    const r = rnd(); actions++;
    try {
      if (r < .55) {
        // click a random visible button / interactive element
        const pts = await page.evaluate(() => {
          const els = [...document.querySelectorAll('button,[data-act],[data-tab],[data-bt],[data-m],[data-mt],select,a')].filter(e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 4 && b.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth; });
          return els.slice(0, 400).map(e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, id: e.id || e.dataset.act || e.dataset.tab || e.className }; });
        });
        if (pts.length) { const p = pts[Math.floor(rnd() * pts.length)]; if (/reset|dismiss/.test(String(p.id)) && rnd() < .7) continue; phone ? await page.touchscreen.tap(p.x, p.y) : await page.mouse.click(p.x, p.y); }
      } else if (r < .75) {
        const x = 20 + rnd() * 350, y = 120 + rnd() * 600; phone ? await page.touchscreen.tap(x, y) : await page.mouse.click(x * (phone ? 1 : 3), y);
      } else if (r < .85 && !phone) {
        const x0 = 300 + rnd() * 600, y0 = 200 + rnd() * 400; await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x0 + (rnd() - .5) * 300, y0 + (rnd() - .5) * 200, { steps: 4 }); await page.mouse.up();
      } else if (r < .9) {
        await page.mouse.wheel(0, (rnd() - .5) * 600);
      } else {
        await page.keyboard.press(keys[Math.floor(rnd() * keys.length)]);
      }
    } catch (e) { /* element vanished mid-click: fine */ }
    if (actions % 10 === 0) await page.waitForTimeout(150);
    if (rnd() < .02) await page.evaluate(() => { const w = window.__wild; w.sanct.state.minutes += 720; });   // jump through the day to trigger daily logic
  }
  const state = await page.evaluate(() => { const w = window.__wild; return { day: w.sanct.state.day, funds: Math.round(w.sanct.state.funds), items: w.ops.state.items.length, staff: w.ops.state.staff.length, animals: w.sanct.residents().length, nan: [w.sanct.state.funds, w.sanct.state.reputation, w.sanct.state.credits].some(v => !Number.isFinite(v)) }; });
  console.log((phone ? 'phone' : 'desktop') + ' monkey: ' + actions + ' actions in ' + seconds + 's, state ' + JSON.stringify(state));
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? 'ERRORS (' + uniq.length + '):\n' + uniq.slice(0, 8).join('\n---\n') : 'no page or console errors');
  await browser.close();
  process.exit(uniq.length || state.nan ? 1 : 0);
})();
