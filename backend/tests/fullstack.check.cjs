'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('../app');

async function withServer(app, check) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try { await check('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

(async () => {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  await withServer(createApp(), async base => {
    for (const route of ['/', '/jobs', '/dashboard']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), html);
    }
    console.log('PASS: existing React home and client routes preserved');
    const asset = html.match(/src="([^"]+\.js)"/)[1];
    assert.equal((await fetch(base + asset)).status, 200);
    assert.equal((await (await fetch(base + '/health')).json()).status, 'OK');
    assert.equal((await (await fetch(base + '/api/features/health')).json()).authenticationIntegrated, false);
    const ui = await (await fetch(base + '/ai/')).text();
    assert(ui.includes('ConnectCV'));
    assert.notEqual(ui, html);
    console.log('PASS: built React assets, shared health and isolated AI UI');
    for (const route of ['/api/cv/templates?lang=en', '/api/cv/templates?lang=vi']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert(response.headers.get('content-type').includes('application/json'));
      const result = await response.json();
      assert.equal((result.data || result.templates).length, 74);
    }
    const unknown = await fetch(base + '/api/does-not-exist');
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).code, 'API_NOT_FOUND');
    assert.equal((await fetch(base + '/ai/missing.js')).status, 404);
    console.log('PASS: API routes precede SPA; missing API/AI files return 404');
    for (const route of ['/api/cv/generate', '/api/interview/start', '/api/chatbot/message']) {
      const response = await fetch(base + route, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer forged' },
        body: JSON.stringify({ html: 'x'.repeat(256 * 1024), userId: 'admin' })
      });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).code, 'AUTH_INTEGRATION_REQUIRED');
    }
    console.log('PASS: feature identity guard precedes legacy 100KB JSON parser');
    const options = await fetch(base + '/api/cv/generate', { method: 'OPTIONS' });
    assert.equal(options.status, 200);
    assert.equal(options.headers.get('access-control-allow-origin'), '*');
    console.log('PASS: upstream CORS preflight remains compatible');
  });
  await withServer(createApp({ frontendDistPath: path.join(dist, 'missing') }), async base => {
    assert((await (await fetch(base + '/')).text()).includes('ConnectCV API is ready'));
    assert.equal((await fetch(base + '/api/features/health')).status, 200);
    console.log('PASS: backend-only development remains supported');
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
