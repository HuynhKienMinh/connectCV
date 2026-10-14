"""Independent exact-word check using pypdf; never normalizes split words away."""
import json
import sys
from pathlib import Path
from pypdf import PdfReader

root = Path(sys.argv[1])
report = json.loads((root / 'results.json').read_text(encoding='utf-8'))
results = []
for row in report['cases']:
    pdf = PdfReader(root / (row['id'] + '-fixed.pdf'))
    text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
    assert row['marker'] in text, (row['id'], 'missing final source marker')
    if row['wholeWordsRequired']:
        for fact in ['Ứng viên thử nghiệm', 'Kỹ sư kiểm thử', 'Công ty giả']:
            # Native templates may capitalize names. Case folding preserves
            # spaces and word boundaries; never join split accented runs.
            assert fact.casefold() in text.casefold(), (row['id'], 'split or missing words', fact)
    results.append({'id': row['id'], 'sourceTailPreserved': True,
                    'wholeWordsVerified': row['wholeWordsRequired'], 'pages': len(pdf.pages)})
(root / 'text-results.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
print(json.dumps(results))
