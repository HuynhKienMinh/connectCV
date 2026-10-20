'use strict';
// Whole Studio, deferred synthetic transport (deliberately ignores abort); no AI/device/cloud.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const express = require('express'), { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '../public'), out = process.env.INTERVIEW_SUMMARY_QA_OUTPUT;
assert.ok(out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const source = process.env.INTERVIEW_SUMMARY_SOURCE_REF
  ? execFileSync('git', ['show', `${process.env.INTERVIEW_SUMMARY_SOURCE_REF}:backend/features/connectcv/public/index.html`], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
  : fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = express(), rows = [];
app.get('/ai/runtime.js', (q, s) => s.type('js').send('window.connectCVParentOrigins=[];window.connectCVServerPdf=false;'));
app.get('/ai/', (q, s) => s.type('html').send(source)); app.use('/ai', express.static(root));
app.use('/api', (q, s) => s.status(401).json({ success: false, message: 'Synthetic unavailable' }));
(async () => {
  let server, browser;
  try {
    server = app.listen(0, '127.0.0.1');
    await new Promise((r, j) => { server.once('listening', r); server.once('error', j); });
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: chromium.executablePath() });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } }), page = await context.newPage();
    page.setDefaultTimeout(5000);
    await context.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
    await page.addInitScript(() => {
      const qa = window.__summaryQA = { requests: [], jsonResolvers: [], deadlines: [], timeoutClears: [] };
      const original = fetch.bind(window), nativeTimeout = setTimeout.bind(window), nativeClear = clearTimeout.bind(window);
      window.setTimeout = (fn, ms, ...args) => {
        if (ms === 90000) { const id = nativeTimeout(() => {}, ms); qa.deadlines.push({ id, fire: () => fn(...args) }); return id; }
        return nativeTimeout(fn, ms, ...args);
      };
      window.clearTimeout = id => { qa.timeoutClears.push(id); return nativeClear(id); };
      window.fetch = (url, options) => {
        const route = String(url);
        if (route.endsWith('/live-summary')) return new Promise((resolve, reject) => qa.requests.push({ body: JSON.parse(options.body), signal: options.signal, resolve, reject }));
        if (route.includes('/api/interview/')) return Promise.resolve({ ok: true, json: async () => ({ success: false, message: 'Synthetic unavailable' }) });
        return original(url, options);
      };
      qa.reply = (i, data, holdJson) => qa.requests[i].resolve({ ok: true, json: () => holdJson ? new Promise(r => qa.jsonResolvers.push(() => r(data))) : Promise.resolve(data) });
      window.Audio = class { play() { return Promise.resolve(); } pause() {} };
      window.SpeechRecognition = class { start() {} stop() {} abort() {} }; window.webkitSpeechRecognition = undefined;
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia() { throw Error('No real device permitted'); } } });
    });
    async function reset() {
      await page.goto(base + '/ai/?module=interview'); await page.waitForFunction(() => typeof endLiveInterview === 'function');
      await page.evaluate(() => { switchIntSubMode('practice'); switchIntMode('live'); liveInterviewHistory = [{ role: 'interviewer', message: 'Synthetic question A' }, { role: 'candidate', message: 'Synthetic answer A' }]; });
    }
    const snapshot = () => page.evaluate(() => ({
      hidden: document.getElementById('live-summary-modal').classList.contains('hidden'),
      loading: !document.getElementById('live-summary-loading').classList.contains('hidden'),
      text: document.getElementById('live-summary-result').textContent,
      requests: __summaryQA.requests.length, aborted: __summaryQA.requests.map(r => Boolean(r.signal?.aborted))
    }));
    const end = name => page.evaluate(name => { window[name] = endLiveInterview(); }, name);
    const settle = name => page.evaluate(name => window[name], name);
    const reply = (i, label, holdJson = false) => page.evaluate(({ i, label, holdJson }) => {
      __summaryQA.reply(i, { success: true, data: { overallScore: 0, summary: label, strengths: [], improvements: [], qaBreakdown: [] } }, holdJson);
    }, { i, label, holdJson });
    const requestCount = n => page.waitForFunction(n => __summaryQA.requests.length === n, n);
    const newSummary = async () => { await page.evaluate(() => { closeLiveSummaryModal(); liveInterviewHistory = [{ role: 'interviewer', message: 'Synthetic question B' }, { role: 'candidate', message: 'Synthetic answer B' }]; }); await end('taskB'); await requestCount(2); };
    async function test(phase, fn) {
      let timer;
      try { await reset(); await Promise.race([fn(), new Promise((r, j) => { timer = setTimeout(() => j(Error('Fixture phase deadline')), 8000); })]); rows.push({ phase, pass: true }); }
      catch (e) { rows.push({ phase, pass: false, error: e.message.slice(0, 600), state: await snapshot().catch(() => null) }); }
      finally { clearTimeout(timer); }
    }
    await test('current-summary-renders-zero-and-captured-history', async () => {
      await end('taskA'); await requestCount(1); await reply(0, 'CURRENT_A'); await settle('taskA');
      const s = await snapshot(); assert.equal(s.hidden, false); assert.equal(s.loading, false); assert.match(s.text, /CURRENT_A/); assert.match(s.text, /0\/10/);
      assert.equal(await page.evaluate(() => __summaryQA.requests[0].body.history[1].message), 'Synthetic answer A');
    });
    await test('double-end-shares-one-pending-summary', async () => {
      await end('taskA'); await end('duplicate'); assert.equal((await snapshot()).requests, 1); await reply(0, 'CURRENT_A'); await settle('taskA');
    });
    await test('close-aborts-and-late-success-cannot-populate-dismissed-report', async () => {
      await end('taskA'); await page.evaluate(() => closeLiveSummaryModal()); await reply(0, 'OBSOLETE_A'); await settle('taskA');
      const s = await snapshot(); assert.equal(s.hidden, true); assert.equal(s.aborted[0], true); assert.doesNotMatch(s.text, /OBSOLETE_A/);
    });
    await test('older-success-cannot-overwrite-newer-summary', async () => {
      await end('taskA'); await newSummary(); await reply(1, 'CURRENT_B'); await settle('taskB'); await reply(0, 'OBSOLETE_A'); await settle('taskA');
      const s = await snapshot(); assert.match(s.text, /CURRENT_B/); assert.doesNotMatch(s.text, /OBSOLETE_A/);
    });
    await test('close-during-json-parsing-ignores-late-data', async () => {
      await end('taskA'); await reply(0, 'OBSOLETE_A', true); await page.waitForFunction(() => __summaryQA.jsonResolvers.length === 1);
      await page.evaluate(() => { closeLiveSummaryModal(); __summaryQA.jsonResolvers[0](); }); await settle('taskA'); assert.doesNotMatch((await snapshot()).text, /OBSOLETE_A/);
    });
    for (const [phase, action] of [
      ['new-session', () => { window.restart = startLiveInterview(); }],
      ['reset-session', () => resetLiveInterview()],
      ['practice-question', () => practiceQuestionLive(encodeURIComponent('Synthetic question B'))],
      ['module-departure', () => switchTab('tab-cv-module')],
      ['eval-submode', () => switchIntSubMode('eval')],
      ['script-mode', () => switchIntMode('script')],
      ['pagehide', () => window.dispatchEvent(new Event('pagehide'))],
      ['continued-answer', () => { window.answer = sendCandidateLiveAnswer('Synthetic continued answer'); }]
    ]) {
      await test(phase + '-cancels-summary-and-clears-modal', async () => {
        await end('taskA'); await page.evaluate(action); await reply(0, 'OBSOLETE_A'); await settle('taskA');
        const s = await snapshot(); assert.equal(s.hidden, true); assert.equal(s.aborted[0], true); assert.doesNotMatch(s.text, /OBSOLETE_A/);
      });
    }
    await test('logout-synchronously-aborts-summary-before-bridge-reload', async () => {
      await end('taskA');
      const reloaded = page.waitForEvent('load');
      const s = await page.evaluate(() => {
        window.dispatchEvent(new Event('connectcv:logout'));
        return { aborted: Boolean(__summaryQA.requests[0].signal?.aborted), hidden: document.getElementById('live-summary-modal').classList.contains('hidden') };
      });
      await reloaded;
      assert.equal(s.aborted, true); assert.equal(s.hidden, true);
      // The real bridge reload destroys the old context; no simulated Firebase actor claim.
    });
    await test('obsolete-error-cannot-replace-new-loading-state', async () => {
      await end('taskA'); await newSummary(); await page.evaluate(() => __summaryQA.requests[0].reject(Error('PRIVATE_SYNTHETIC_ERROR'))); await settle('taskA');
      const s = await snapshot(); assert.equal(s.loading, true); assert.equal(s.text, ''); assert.doesNotMatch(s.text, /PRIVATE_SYNTHETIC_ERROR/);
      await reply(1, 'CURRENT_B'); await settle('taskB'); assert.match((await snapshot()).text, /CURRENT_B/);
    });
    await test('current-network-failure-has-generic-retry-without-private-error', async () => {
      await end('taskA'); await page.evaluate(() => __summaryQA.requests[0].reject(Error('PRIVATE_SYNTHETIC_ERROR'))); await settle('taskA');
      const s = await snapshot(); assert.equal(s.loading, false); assert.ok(s.text.length > 10); assert.doesNotMatch(s.text, /PRIVATE_SYNTHETIC_ERROR/);
    });
    await test('deadline-releases-lock-explicit-retry-ignores-old-finally', async () => {
      await end('taskA'); assert.equal(await page.evaluate(() => __summaryQA.deadlines.length), 1);
      await page.evaluate(() => __summaryQA.deadlines[0].fire()); assert.equal((await snapshot()).aborted[0], true); assert.equal((await snapshot()).loading, false);
      await end('taskB'); await requestCount(2); await reply(0, 'OBSOLETE_A'); await settle('taskA');
      assert.equal((await snapshot()).loading, true); await end('duplicate'); assert.equal((await snapshot()).requests, 2);
      await reply(1, 'CURRENT_B'); await settle('taskB'); assert.match((await snapshot()).text, /CURRENT_B/);
    });
    await test('empty-session-does-not-request-ai', async () => {
      await page.evaluate(() => liveInterviewHistory = []); await end('taskA'); await settle('taskA'); assert.equal((await snapshot()).requests, 0); assert.equal((await snapshot()).loading, false);
    });
    await page.setViewportSize({ width: 390, height: 844 }); await reset(); await end('taskA'); await reply(0, 'SYNTHETIC_CURRENT_REPORT'); await settle('taskA');
    await page.screenshot({ path: path.join(out, 'summary-current-390.png') });
    const report = { wholeStudio: true, syntheticTransport: true, realAiCalls: 0, realMicrophone: false, cloudWrites: 0, sourceRef: process.env.INTERVIEW_SUMMARY_SOURCE_REF || 'working-tree', rows };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); assert.equal(rows.filter(r => !r.pass).length, 0);
  } finally { if (browser) await browser.close(); if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); } }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
