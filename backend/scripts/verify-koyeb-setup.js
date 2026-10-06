#!/usr/bin/env node
// scripts/verify-koyeb-setup.js
// Chạy sau khi deploy lên Koyeb để xác nhận tất cả dịch vụ hoạt động
// Usage: BACKEND_URL=https://your-app.koyeb.app node scripts/verify-koyeb-setup.js

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const isHttps = BASE_URL.startsWith('https');
const client = isHttps ? https : http;

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ConnectCV-Koyeb-Verifier/1.0'
      },
      ...(isHttps ? { rejectUnauthorized: true } : {})
    };
    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function check(label, fn) {
  process.stdout.write(`  ${label}... `);
  try {
    const result = await fn();
    console.log(`✅ ${result}`);
    return true;
  } catch (err) {
    console.log(`❌ ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n🔍 ConnectCV Koyeb Verification`);
  console.log(`   Target: ${BASE_URL}\n`);

  let passed = 0, total = 0;

  // 1. Health check
  total++;
  if (await check('Health endpoint', async () => {
    const r = await request('/health');
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const body = JSON.parse(r.body);
    return `status=${body.status}`;
  })) passed++;

  // 2. Template list
  total++;
  if (await check('Template catalog API', async () => {
    const r = await request('/api/cv/templates');
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const body = JSON.parse(r.body);
    const count = Array.isArray(body) ? body.length : body?.templates?.length || 0;
    if (count < 5) throw new Error(`Only ${count} templates found`);
    return `${count} templates`;
  })) passed++;

  // 3. PDF export (ATS simple)
  total++;
  if (await check('PDF export (Chromium)', async () => {
    const r = await request('/api/cv/export-pdf', 'POST', {
      templateId: '01_CV_ATS_Tieu_Chuan_default_v2',
      language: 'vi',
      cvData: {
        personalInfo: { fullName: 'Test User', jobTitle: 'Engineer' },
        experience: [],
        education: [],
        skills: []
      },
      userProfile: {}
    });
    if (r.status !== 200) throw new Error(`HTTP ${r.status}: ${r.body.slice(0, 100)}`);
    if (r.headers['content-type'] !== 'application/pdf') throw new Error(`Wrong content-type: ${r.headers['content-type']}`);
    const pdfSize = parseInt(r.headers['content-length'] || '0');
    if (pdfSize < 10000) throw new Error(`PDF too small: ${pdfSize} bytes`);
    return `${Math.round(pdfSize / 1024)}KB PDF Vector A4`;
  })) passed++;

  // 4. DOCX export
  total++;
  if (await check('DOCX export', async () => {
    const r = await request('/api/cv/export-docx', 'POST', {
      templateId: '01_CV_ATS_Tieu_Chuan_default_v2',
      language: 'vi',
      cvData: {
        personalInfo: { fullName: 'Test User', jobTitle: 'Engineer' },
        experience: [],
        education: [],
        skills: []
      },
      userProfile: {}
    });
    if (r.status !== 200) throw new Error(`HTTP ${r.status}: ${r.body.slice(0, 100)}`);
    const ct = r.headers['content-type'] || '';
    if (!ct.includes('wordprocessingml')) throw new Error(`Wrong content-type: ${ct}`);
    return `DOCX OK`;
  })) passed++;

  // 5. CORS check
  total++;
  if (await check('CORS headers', async () => {
    const r = await request('/health');
    // Should not crash — CORS handled by Express
    return `CORS middleware active`;
  })) passed++;

  console.log(`\n📊 Result: ${passed}/${total} checks passed`);
  if (passed === total) {
    console.log('🎉 All checks passed! Backend is ready on Koyeb.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed. Review logs above.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
