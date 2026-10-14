"""Independent pypdf matrix report. Split accented words are never joined away."""
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

root = Path(sys.argv[1])
matrix = json.loads((root / 'matrix.json').read_text(encoding='utf-8'))
rows = []
failure_kinds = {}
for row in matrix['rows']:
    reader = PdfReader(root / (row['id'] + '.pdf'))
    a4 = all(abs(float(page.mediabox.width) - 595.28) < 2 and
             abs(float(page.mediabox.height) - 841.89) < 2 for page in reader.pages)
    assert a4, (row['id'], 'unexpected page geometry')
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    # Newlines/tabs are legitimate line wraps; this preserves intra-word spaces.
    searchable = ' '.join(text.casefold().split())
    missing = [fact for fact in row['requiredFacts'] if fact.casefold() not in searchable]
    # Diagnostic only: joining whitespace helps distinguish split font runs from
    # an absent field, but must never turn an exact-word failure into a pass.
    compact = re.sub(r'\s+', '', text.casefold())
    kinds = {fact: ('whitespace_split' if re.sub(r'\s+', '', fact.casefold()) in compact
                    else 'missing_or_changed') for fact in missing}
    for kind in kinds.values():
        failure_kinds[kind] = failure_kinds.get(kind, 0) + 1
    rows.append({key: row[key] for key in ['id', 'slug', 'language', 'bytes', 'pages']} |
                {'a4Verified': a4, 'missingFacts': missing,
                 'failureKinds': kinds, 'exactWordsPass': not missing})
report = {'scope': matrix['scope'], 'parser': 'pypdf', 'cases': len(rows),
          'passed': sum(row['exactWordsPass'] for row in rows),
          'failed': sum(not row['exactWordsPass'] for row in rows),
          'failureKinds': failure_kinds,
          'whitespaceSplitCases': sum('whitespace_split' in row['failureKinds'].values() for row in rows),
          'missingOrChangedCases': sum('missing_or_changed' in row['failureKinds'].values() for row in rows),
          'rows': rows}
(root / 'text-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: report[key] for key in ['cases', 'passed', 'failed']}))
if report['failed']:
    raise SystemExit(1)
