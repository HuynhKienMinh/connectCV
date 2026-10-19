"""Opt-in independent parser contrast. Never join intra-word whitespace to pass."""
import hashlib
import json
import re
import sys
from pathlib import Path
import pypdf
import pdfplumber
from pypdf import PdfReader

root = Path(sys.argv[1])
render = json.loads((root / 'render-report.json').read_text(encoding='utf-8-sig'))
rows = []
for row in render['rows']:
    source = root / (row['id'] + '.pdf')
    reader = PdfReader(source)
    a4 = all(abs(float(p.mediabox.width)-595.28) < 2 and abs(float(p.mediabox.height)-841.89) < 2 for p in reader.pages)
    assert a4
    fonts = []
    for p in reader.pages:
        for key, value in p.get('/Resources', {}).get('/Font', {}).items():
            f = value.get_object()
            fonts.append({'key': key, 'type': str(f.get('/Subtype')), 'base': str(f.get('/BaseFont')), 'matrix': list(map(float, f.get('/FontMatrix', []))), 'hasToUnicode': '/ToUnicode' in f})
    with pdfplumber.open(source) as pdf:
        plumber = '\n'.join(p.extract_text() or '' for p in pdf.pages)
        char_fonts = sorted({c['fontname'] for p in pdf.pages for c in p.chars})
    texts = {'pypdf-plain': '\n'.join(p.extract_text() or '' for p in reader.pages),
             'pypdf-layout': '\n'.join(p.extract_text(extraction_mode='layout') or '' for p in reader.pages),
             'pdfplumber-default': plumber}
    checks = {}
    for name, text in texts.items():
        searchable = ' '.join(text.casefold().split())
        missing = [f for f in row['requiredFacts'] if f.casefold() not in searchable]
        compact = re.sub(r'\s+', '', text.casefold())
        kinds = {f: ('whitespace_split' if re.sub(r'\s+', '', f.casefold()) in compact else 'absent_or_changed') for f in missing}
        checks[name] = {'exactWordsPass': not missing, 'missingFacts': missing, 'failureKinds': kinds,
                        'syntheticTextPreview': text[:900]}
    rows.append({'id': row['id'], 'pages': len(reader.pages), 'a4': a4, 'pdfSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                 'fonts': fonts, 'pdfplumberFontNames': char_fonts, 'checks': checks})
report = {'scope': render['scope'], 'pypdf': pypdf.__version__, 'pdfplumber': pdfplumber.__version__,
          'allParsersPass': all(c['exactWordsPass'] for r in rows for c in r['checks'].values()),
          'cases': rows, 'actualCloudExportVerified': False}
(root / 'parser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'allParsersPass': report['allParsersPass'], 'cases': [{'id': r['id'], 'pages': r['pages'], 'missingByParser': {n: len(c['missingFacts']) for n, c in r['checks'].items()}} for r in rows]}))
if not report['allParsersPass']:
    raise SystemExit(1)
