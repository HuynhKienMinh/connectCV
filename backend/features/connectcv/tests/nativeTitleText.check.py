"""Independent word and A4 checks for native role-field PDF regressions."""
import json
import sys
from pathlib import Path
from pypdf import PdfReader

root = Path(sys.argv[1])
phase = sys.argv[2] if len(sys.argv) > 2 else 'ci'
manifest = json.loads((root / (phase + '.json')).read_text(encoding='utf-8'))
rows = []
for row in manifest['rows']:
    if 'pages' not in row:  # Long title cases exercise DOM wrapping separately.
        continue
    reader = PdfReader(root / (row['id'] + '-' + phase + '.pdf'))
    assert len(reader.pages) == 1, row['id'] + ' unexpected pagination'
    assert all(abs(float(p.mediabox.width) - 595.28) < 2 and
               abs(float(p.mediabox.height) - 841.89) < 2 for p in reader.pages)
    text = ' '.join(('\n'.join(p.extract_text() or '' for p in reader.pages)).casefold().split())
    # Preserve intra-word whitespace; never glue split accented glyphs to pass.
    missing = [fact for fact in manifest['requiredFacts'] if fact.casefold() not in text]
    rows.append({'id': row['id'], 'missingFacts': missing, 'a4': True, 'pages': 1})
assert len(rows) == 8, 'Expected four layouts in both languages'
print(json.dumps({'parser': 'pypdf', 'rows': rows}, ensure_ascii=False))
assert not any(row['missingFacts'] for row in rows), 'Source facts missing from exported PDFs'
