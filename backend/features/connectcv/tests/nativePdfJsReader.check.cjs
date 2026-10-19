'use strict';
// Opt-in third-reader diagnostic for owned synthetic PDFs. This does not replace
// either default Python text gate, resource comparison, or independent raster QA.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

async function readOwnedPdf(filename) {
  const bytes = fs.readFileSync(filename);
  assert.ok(bytes.length < 4 * 1024 * 1024);
  const { getDocument, version } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false,
    useSystemFonts: false, disableFontFace: true, useWorkerFetch: false, verbosity: 0 });
  try {
    const pdf = await task.promise;
    assert.ok(pdf.numPages <= 8);
    const pages = [];
    let count = 0, chars = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent(); // Default PDF.js extraction.
      const items = content.items.filter(item => typeof item.str === 'string');
      count += items.length;
      chars += items.reduce((total, item) => total + item.str.length, 0);
      assert.ok(count <= 20000 && chars <= 100000);
      const geometry = items.map(item => ({ str: item.str, transform: item.transform,
        width: item.width, height: item.height, dir: item.dir, hasEOL: item.hasEOL }));
      pages.push({ page: pageNumber, itemCount: items.length,
        text: items.map(item => item.str + (item.hasEOL ? '\n' : '')).join(''),
        geometrySha256: sha(JSON.stringify(geometry)) });
      page.cleanup();
    }
    return { version, pdfSha256: sha(bytes), bytes: bytes.length, pages };
  } finally {
    await task.destroy();
  }
}

if (process.argv[2] === '--read') {
  readOwnedPdf(process.argv[3]).then(result => process.stdout.write(JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
} else {
  const root = fs.realpathSync(process.argv[2]);
  const manifestPath = path.join(root, 'pdfjs-inputs.json');
  assert.ok(fs.statSync(manifestPath).size < 64 * 1024);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(Array.isArray(manifest.cases) && manifest.cases.length <= 24);
  const rows = manifest.cases.map(entry => {
    assert.ok(typeof entry.file === 'string' && path.basename(entry.file) === entry.file);
    const filename = fs.realpathSync(path.join(root, entry.file));
    assert.equal(path.dirname(filename), root);
    // Child wall-clock/output/V8-old-space bounds are diagnostic containment,
    // not proof of total RSS, hostile-PDF safety, or production worker isolation.
    const stdout = execFileSync(process.execPath,
      ['--max-old-space-size=256', __filename, '--read', filename],
      { timeout: 30000, maxBuffer: 1024 * 1024, encoding: 'utf8', windowsHide: true });
    const result = JSON.parse(stdout);
    const text = result.pages.map(page => page.text).join('\n');
    const normalized = text.toLocaleLowerCase('en').split(/\s+/u).join(' ');
    const missingFacts = (entry.requiredFacts || []).filter(fact =>
      !normalized.includes(fact.toLocaleLowerCase('en').split(/\s+/u).join(' ')));
    return { id: entry.id, file: entry.file, ...result, missingFacts,
      expectedExact: entry.expectedExact ?? null,
      exactMatch: entry.expectedExact == null ? null : text.trim() === entry.expectedExact };
  });
  const report = { scope: 'Installed PDF.js third-reader diagnostics; no ATS certification',
    node: process.version, harnessSha256: sha(fs.readFileSync(__filename)),
    textAssembly: 'Default getTextContent item order; concatenate str and append LF only at hasEOL; no intra-word repair or spatial sorting',
    readerOptions: { isEvalSupported: false, useSystemFonts: false, disableFontFace: true,
      useWorkerFetch: false }, runtimeChanged: false, strictAcceptanceGateChanged: false, cases: rows };
  fs.writeFileSync(path.join(root, 'pdfjs-reader-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(rows.map(row => ({ id: row.id, missingFacts: row.missingFacts,
    exactMatch: row.exactMatch, text: row.pages.map(page => page.text).join('\n') }))));
}
