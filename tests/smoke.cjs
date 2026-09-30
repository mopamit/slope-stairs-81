const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.audioEvents = []; HTMLMediaElement.prototype.play = function () { window.audioEvents.push(this.src); return Promise.resolve(); }; });
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    assert.equal(await page.locator('#welcome mfrac').count(), 1);
    await page.click('#start');
    assert.equal(await page.locator('#dx, #dy').count(), 0);
    const layout = await page.evaluate(() => ({ panel: document.querySelector('.answer-panel').getBoundingClientRect().x, graph: document.querySelector('.graph-panel').getBoundingClientRect().x }));
    assert.ok(layout.panel > layout.graph, 'controls must be on the right');
    const ticks = await page.evaluate(() => {
      const plot = document.querySelector('#plot'), [,, w, h] = plot.getAttribute('viewBox').split(' ').map(Number);
      return [...plot.querySelectorAll('.axis-number[data-axis]')].every(t => t.dataset.axis === 'x' ? Math.abs(+t.getAttribute('y') - h / 2) < 25 : Math.abs(+t.getAttribute('x') - w / 2) < 20);
    });
    assert.ok(ticks, 'tick labels beside axes');
    await page.locator('#slope').fill('0'); await page.click('#check');
    assert.equal(await page.locator('#feedback').getAttribute('data-kind'), 'error');
    await page.waitForTimeout(510);
    // Read the selected problem, then enter an equivalent (unreduced) fraction.
    const run = await page.evaluate(() => questions.map(q => ({a:q.a,b:q.b})));
    const firstTop=2*(run[0].b[1]-run[0].a[1]),firstBottom=2*(run[0].b[0]-run[0].a[0]);
    await page.locator('#slope').fill(String(firstTop)); await page.locator('#slope').press('/');
    assert.equal(await page.locator('#numerator').inputValue(), String(firstTop));
    assert.ok(await page.locator('#denominator').evaluate(e => e === document.activeElement));
    for(const digit of String(firstBottom))await page.getByRole('button',{name:digit,exact:true}).click();
    assert.equal(await page.locator('#denominator').inputValue(),String(firstBottom));
    await page.click('#check');
    assert.equal(await page.locator('#feedback').getAttribute('data-kind'), 'success');
    assert.equal(await page.locator('#feedback mfrac').count(), 1);
    const coin = await page.locator('#coins').innerText();
    await page.locator('#answer-form').evaluate(f => f.requestSubmit());
    assert.equal(await page.locator('#coins').innerText(), coin, 'no duplicate rewards');
    await page.click('#next');
    const answers = run.slice(1).map(q=>{const dx=q.b[0]-q.a[0],dy=q.b[1]-q.a[1];return dx===0?{undefined:true}:Number.isInteger(dy/dx)?{n:String(dy/dx)}:{top:String(dy),bottom:String(dx)};});
    for (const answer of answers) {
      if (answer.undefined) await page.click('#undefined');
      else if (answer.n !== undefined) await page.locator('#slope').fill(answer.n);
      else { await page.click('#fraction-mode'); await page.locator('#numerator').fill(answer.top); await page.locator('#denominator').fill(answer.bottom); }
      await page.click('#check');
      assert.equal(await page.locator('#feedback').getAttribute('data-kind'), 'success');
      await page.click('#next');
    }
    assert.match(await page.locator('#summary').innerText(), /8 מתוך 8/);
    const finishBounds=await page.evaluate(()=>{const a=document.querySelector('#restart').getBoundingClientRect(),b=document.querySelector('#finish-lab').getBoundingClientRect();return {ay:a.y,by:b.y,aw:a.width,bw:b.width,ah:a.height,bh:b.height};});
    assert.equal(finishBounds.ay,finishBounds.by);assert.equal(finishBounds.aw,finishBounds.bw);assert.equal(finishBounds.ah,finishBounds.bh);
    if(process.env.SCREENSHOT_DIR){await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'slope-finish-v3.png'),fullPage:true});await page.setViewportSize({width:360,height:850});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'slope-finish-mobile-v3.png'),fullPage:true});await page.setViewportSize({width:1280,height:950});}
    await page.click('#restart');
    const secondRun=await page.evaluate(()=>questions.map(q=>({a:q.a,b:q.b})));
    run.forEach((q,i)=>assert.notDeepEqual(q,secondRun[i],'new exercise for each stage'));
    await page.click('#home');await page.click('#explore');
    await page.locator('[data-k="b"][data-j="0"]').fill('5');
    assert.match(await page.locator('#coordinates').innerText(), /5, 2/);
    assert.equal(await page.locator('#values mfrac').count(), 2);
    assert.ok(!(await page.locator('#values').innerText()).includes('/'));
    await page.click('#help'); assert.equal(await page.locator('#dialog mfrac').count(), 1); await page.click('#close-dialog');
    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 850 });
      await page.click('#home'); await page.click('#start'); await page.click('#fraction-mode');
      const bounds = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, logo: document.querySelector('.logo').getBoundingClientRect().x, nav: document.querySelector('nav').getBoundingClientRect().x, missing: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src) }));
      assert.ok(!bounds.overflow); assert.ok(bounds.logo < bounds.nav); assert.deepEqual(bounds.missing, []);
    }
    await page.locator('#numerator').fill('2'); await page.locator('#denominator').fill('0'); await page.click('#check');
    assert.match(await page.locator('#feedback').innerText(), /מכנה לא יכול/);
    assert.equal(await page.locator('#hearts').innerText(), '3');
    const audio = await page.evaluate(() => window.audioEvents);
    for (const kind of ['success', 'error', 'finish']) assert.ok(audio.some(a => a.endsWith(kind + '.mp3')));
    await page.click('#mute'); await page.click('#number-mode'); await page.locator('#slope').fill('0'); await page.click('#check');
    assert.equal(await page.evaluate(() => window.audioEvents.length), audio.length);
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'slope-mobile-v3.png'), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 950 }); await page.click('#home'); await page.click('#explore');
      await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'slope-desktop-v3.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: textbook fractions, slope-only answers, fraction keyboard, equivalent fractions, axis labels, right controls, 8 challenges, zero denominator, mobile 320/360, audio and mute.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
