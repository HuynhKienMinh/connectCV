"""Independent text + measured layout differences for a local font prototype."""
import json
import sys
from pathlib import Path
from pypdf import PdfReader

root = Path(sys.argv[1])
source = json.loads((root / 'fidelity.json').read_text(encoding='utf-8'))
manifest = json.loads((root / 'prototype.json').read_text(encoding='utf-8'))
rows = []
for case in source['cases']:
    text = {}
    for variant in ['baseline', 'prototype']:
        reader = PdfReader(root / (case['id'] + '-' + variant + '.pdf'))
        text[variant] = ' '.join(('\n'.join(page.extract_text() or '' for page in reader.pages)).casefold().split())
    differences = []
    before, after = case['baseline']['rows'], case['prototype']['rows']
    if len(before) == len(after):
        for left, right in zip(before, after):
            delta = {key: right[key] - left[key] for key in ['x', 'y', 'width', 'height'] if right[key] != left[key]}
            if delta or left['text'] != right['text']:
                differences.append({'text': left['text'], 'delta': delta,
                                    'textUnchanged': left['text'] == right['text']})
    else:
        differences.append({'textRunCountChanged': [len(before), len(after)]})
    missing = {variant: [fact for fact in [*case['requiredFacts'], case['marker']]
                        if fact.casefold() not in text[variant]] for variant in text}
    rows.append({'id': case['id'], 'pages': case['pages'],
                 'geometryExact': case['geometryExact'], 'paginationExact': case['paginationExact'],
                 'cropExact': case['baseline']['photos'] == case['prototype']['photos'],
                 'missingFacts': missing, 'differences': differences,
                 'maxGeometryDeltaPx': max((abs(value) for item in differences for value in item.get('delta', {}).values()), default=0)})
report = {'scope': manifest.get('strategy', source['scope']), 'parser': 'pypdf', 'cases': rows,
          'allPrototypeFactsExact': all(not row['missingFacts']['prototype'] for row in rows),
          'allGeometryExact': all(row['geometryExact'] for row in rows)}
(root / 'prototype-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: report[key] for key in ['allPrototypeFactsExact', 'allGeometryExact']}))
print(json.dumps([{key: row[key] for key in ['id', 'maxGeometryDeltaPx', 'missingFacts']} for row in rows], ensure_ascii=True))
# A fidelity failure is a gate; text improvements alone cannot release the font.
if not report['allPrototypeFactsExact'] or not report['allGeometryExact']:
    raise SystemExit(1)
