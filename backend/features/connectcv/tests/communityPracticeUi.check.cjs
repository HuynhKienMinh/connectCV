'use strict';
// Actual community cards -> Studio interview controller. Loopback fake transport only.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const express = require('express'), { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '../public'), out = process.env.COMMUNITY_PRACTICE_QA_OUTPUT;
assert.ok(out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const source = process.env.COMMUNITY_PRACTICE_SOURCE_REF
  ? execFileSync('git', ['show', `${process.env.COMMUNITY_PRACTICE_SOURCE_REF}:backend/features/connectcv/public/index.html`], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
  : fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const company = "Synthetic O'Reilly", role = 'Retail Advisor';
const questions = ['How would you handle a returned item?', "Bạn xử lý câu hỏi 'đổi hàng' và <script>window.__injected=1</script> thế nào?"];
const entry = { id: 'synthetic-practice-post', anonymous: true, companyName: company, position: role, interviewQuestions: questions, reviewText: 'Synthetic local community fixture', sharedAt: '2026-10-20T00:00:00Z', tags: ['Retail'], likesCount: 0, difficultyRating: 3 };
const app = express(), rows = [];
app.get('/ai/runtime.js', (q, s) => s.type('js').send('window.connectCVParentOrigins=[];window.connectCVServerPdf=false;'));
app.get('/ai/', (q, s) => s.type('html').send(source)); app.use('/ai', express.static(root));
app.use('/api', (q, s) => s.status(401).json({ success: false }));
(async () => {
  let server, browser;
  try {
    server = app.listen(0, '127.0.0.1'); await new Promise((r, j) => { server.once('listening', r); server.once('error', j); });
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: chromium.executablePath() });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } }), page = await context.newPage(); page.setDefaultTimeout(5000);
    await context.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
    await page.addInitScript(({ entry }) => {
      const qa = window.__practiceQA = { entry, tts: [], chats: [], otherWrites: [], audio: [], warnings: [] }, original = fetch.bind(window);
      window.fetch = (url, options = {}) => {
        const u = new URL(String(url), location.href);
        if (u.pathname === '/api/interview/community-questions') return Promise.resolve({ json: async () => ({ success: true, data: [qa.entry] }) });
        if (u.pathname === '/api/interview/tts') { qa.tts.push(JSON.parse(options.body).text); return Promise.resolve({ ok: true, blob: async () => new Blob(['synthetic audio']) }); }
        if (u.pathname === '/api/interview/live-chat') { qa.chats.push(JSON.parse(options.body)); return Promise.resolve({ json: async () => ({ success: true, data: { interviewerReply: 'Synthetic next question' } }) }); }
        // Unrelated Studio startup template/job helpers are outside this handoff contract.
        if (u.pathname.startsWith('/api/cv/')) return Promise.resolve({ json: async () => ({ success: false }) });
        if (options.method && options.method !== 'GET') qa.otherWrites.push(u.pathname);
        return original(url, options);
      };
      window.Audio = class { constructor() { qa.audio.push(this); } play() { this.onplay?.(); return Promise.resolve(); } pause() {} };
      window.SpeechRecognition = class { start() {} stop() {} abort() {} }; window.webkitSpeechRecognition = undefined;
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia() { throw Error('No real device permitted'); } } });
    }, { entry });
    const buttons = () => page.locator('#debrief-feed article button[onclick^="practiceQuestionWithAI("]');
    async function reset() {
      await page.setViewportSize({ width: 1366, height: 900 }); await page.goto(base + '/ai/?module=social');
      await page.waitForFunction(() => typeof practiceQuestionWithAI === 'function');
      await page.evaluate(() => { switchTab('tab-debrief'); liveInterviewHistory = [{ role: 'interviewer', message: 'Previous question' }, { role: 'candidate', message: 'Previous answer' }]; document.getElementById('int-title').value = 'Previous role'; document.getElementById('int-jd').value = 'Retained user JD draft'; document.getElementById('int-exp').value = 'Retained user experience draft'; });
      await page.locator('#debrief-feed article').waitFor();
    }
    const state = () => page.evaluate(() => ({ history: liveInterviewHistory, title: document.getElementById('int-title').value, caption: document.getElementById('live-caption-text').textContent, tts: __practiceQA.tts, chats: __practiceQA.chats, otherWrites: __practiceQA.otherWrites, injected: window.__injected || 0 }));
    async function assertPractice(question) {
      await page.locator('#int-mode-live').waitFor({ state: 'visible' });
      const s = await state(); assert.equal(s.history.length, 1); assert.equal(s.history[0].role, 'interviewer');
      const opening = s.history[0].message; assert.ok(opening.includes(question), 'Selected source question must be preserved verbatim in the opening'); assert.doesNotMatch(opening, /Previous question|Previous answer/);
      assert.equal(s.title, role); assert.equal(s.caption, 'AI: ' + opening);
      await page.waitForFunction(() => __practiceQA.tts.length === 1); assert.deepEqual((await state()).tts, [opening]);
      assert.equal(await page.locator('#int-jd').inputValue(), 'Retained user JD draft'); assert.equal(await page.locator('#int-exp').inputValue(), 'Retained user experience draft');
      assert.deepEqual((await state()).chats, []); assert.deepEqual((await state()).otherWrites, []);
      return opening;
    }
    async function test(phase, fn) {
      try { await reset(); await fn(); rows.push({ phase, pass: true }); }
      catch (e) { rows.push({ phase, pass: false, error: e.message.slice(0, 600), state: await state().catch(() => null) }); }
    }
    await test('feed-read-does-not-start-interview-provider-or-publication', async () => { assert.equal(await buttons().count(), 3); const s = await state(); assert.deepEqual(s.tts, []); assert.deepEqual(s.chats, []); assert.deepEqual(s.otherWrites, []); });
    await test('question-button-opens-visible-selected-question-and-role', async () => { await buttons().nth(0).click(); await assertPractice(questions[0]); });
    await test('deck-button-practices-first-question', async () => { await buttons().nth(2).click(); await assertPractice(questions[0]); });
    await test('handoff-from-prior-evaluation-restores-live-practice-submode', async () => {
      await page.evaluate(() => { switchIntSubMode('eval'); }); await buttons().nth(0).click(); await assertPractice(questions[0]);
    });
    await test('selected-question-is-the-history-sent-with-next-typed-answer', async () => {
      await buttons().nth(1).click(); const opening = await assertPractice(questions[1]);
      await page.locator('#live-quick-input').fill('Synthetic answer about a returned item'); await page.evaluate(() => sendQuickLiveAnswer());
      await page.waitForFunction(() => __practiceQA.chats.length === 1);
      const s = await state(); assert.equal(s.chats[0].jobTitle, role); assert.deepEqual(s.chats[0].history, [{ role: 'interviewer', message: opening }, { role: 'candidate', message: 'Synthetic answer about a returned item' }]); assert.equal(s.injected, 0);
    });
    await test('empty-deck-keeps-current-module-and-previous-transcript', async () => {
      await page.evaluate(async () => { __practiceQA.entry = { ...__practiceQA.entry, interviewQuestions: [] }; await loadCommunityQuestions(); });
      const before = await state(); await buttons().nth(0).click();
      await page.locator('#tab-debrief').waitFor({ state: 'visible' }); const after = await state(); assert.deepEqual(after.history, before.history); assert.equal(after.title, before.title); assert.deepEqual(after.tts, []);
    });
    await test('unicode-apostrophes-and-html-like-question-remain-inert-and-exact', async () => { await buttons().nth(1).click(); await assertPractice(questions[1]); assert.equal((await state()).injected, 0); });
    await test('mobile-card-handoff-shows-selected-question', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await buttons().nth(0).click(); await assertPractice(questions[0]);
      await page.locator('#live-caption-text').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'selected-question-390.png') });
    });
    const report = { wholeStudio: true, actualCommunityButtons: true, syntheticTransport: true, realAiCalls: 0, realTtsCalls: 0, realMicrophone: false, cloudWrites: 0, sourceRef: process.env.COMMUNITY_PRACTICE_SOURCE_REF || 'working-tree', rows };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); assert.equal(rows.filter(x => !x.pass).length, 0);
  } finally { if (browser) await browser.close(); if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); } }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
