"""Observe the unmodified pypdf spacing decision; instrumentation must preserve output."""
import inspect
import json
import math
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, DictionaryObject, NameObject, NumberObject, DecodedStreamObject
from pypdf._font import Font
import pypdf._text_extraction._text_extractor as extractor
from pypdf._text_extraction import mult

root = Path(sys.argv[1])
render = json.loads((root / 'switch-render.json').read_text(encoding='utf-8-sig'))
reports = []
original = extractor.crlf_space_check
signature = inspect.signature(original)
for result in render['results']:
    reader = PdfReader(root / (result['variant']+'.pdf'))
    assert len(reader.pages) == 1
    events = []
    current = {'operator': None, 'font': None, 'opIndex': 0}

    def visitor(operator, operands, cm, tm):
        current['operator'] = operator.decode('ascii', 'replace')
        current['opIndex'] += 1
        if operator == b'Tf':
            current['font'] = str(operands[0])

    def observe(*args, **kwargs):
        bound = signature.bind(*args, **kwargs).arguments
        answer = original(*args, **kwargs)
        # Detect only an inserted space, keeping all original function decisions.
        if answer[0] == bound['text']+' ':
            cm0, tm0 = bound['cmtm_prev']
            cm1, tm1 = bound['cmtm_matrix']
            before, after = mult(tm0, cm0), mult(tm1, cm1)
            scale = math.hypot(tm0[0], tm0[1])
            f = bound['font_resource']
            events.append({**current, 'textBefore': bound['text'], 'outputTail': bound['output'][-70:],
                           'movedX': after[4]-before[4], 'movedY': after[5]-before[5],
                           'priorStringWidth': bound['str_widths'], 'halfSpaceWidth': bound['spacewidth'],
                           'threshold': (bound['str_widths']+bound['spacewidth'])*scale,
                           'fontSize': bound['font_size'], 'fontType': str(f.get('/Subtype')) if f else None})
        return answer

    untraced = reader.pages[0].extract_text()
    try:
        extractor.crlf_space_check = observe
        traced = reader.pages[0].extract_text(visitor_operand_before=visitor)
    finally:
        extractor.crlf_space_check = original
    assert traced == untraced, 'Observation must not alter extraction behavior'
    normalized = ' '.join(untraced.split())
    matches = {row['id']: row['id']+' '+row['text'] in normalized for row in render['rows']}
    stream = ContentStream(reader.pages[0].get_contents(), reader)
    operators = {op.decode('ascii'): sum(o == op for _, o in stream.operations) for op in [b'Tf', b'Tm', b'Tj', b'TJ', b'Td']}
    reports.append({'variant': result['variant'], 'exactLinePass': matches, 'text': untraced,
                    'spacingEvents': events, 'operatorCounts': operators, 'instrumentedOutputByteEqual': True})
report = {'scope': render['scope'], 'geometryExact': render['geometryExact'], 'productionRuntimeChanged': False,
          'fontControlApprovedForDeployment': False, 'reports': reports}
# A same-font/same-glyph intervention isolates text-object boundaries from font
# substitution. These tiny PDFs are diagnostic artifacts only; no export code uses it.
source = PdfReader(root / 'original-subsets.pdf')
word = 'Company'
selected = None
for ref in source.pages[0]['/Resources']['/Font'].values():
    resource = ref.get_object()
    if resource.get('/Subtype') != '/Type3':
        continue
    font = Font.from_font_resource(resource)
    reverse = {v: k for k, v in font.character_map.items() if isinstance(k, str) and len(k) == 1 and ord(k) < 256}
    if set(word) <= reverse.keys():
        codes = [ord(reverse[c]) for c in word]
        widths = [float(resource['/Widths'][c-int(resource['/FirstChar'])]) for c in codes]
        if widths == [600.0]*len(word):
            selected = resource
            break
assert selected is not None, 'Need an actual monospaced Type3 resource covering Company'
assert abs(float(selected['/FontMatrix'][0])-.001) < 1e-9
control_rows = []
for variant in ['one-object-one-show', 'per-glyph-object', 'one-object-per-glyph-position', 'per-glyph-two-step-position']:
    writer = PdfWriter()
    page = writer.add_blank_page(width=595.28, height=841.89)
    font_ref = writer._add_object(selected.clone(writer))
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/Probe'): font_ref})})
    if variant == 'one-object-one-show':
        operators = f'BT /Probe 20 Tf 1 0 0 -1 40 60 Tm <{bytes(codes).hex()}> Tj ET'
    else:
        pieces = [f'1 0 0 -1 {40+12*i} 60 Tm <{code:02x}> Tj' for i, code in enumerate(codes)]
        if variant == 'per-glyph-two-step-position':
            pieces = [f'1 0 0 -1 0 60 Tm {40+12*i} 0 Td <{code:02x}> Tj' for i, code in enumerate(codes)]
            operators = '\n'.join('BT /Probe 20 Tf '+piece+' ET' for piece in pieces)
        elif variant == 'per-glyph-object':
            operators = '\n'.join('BT /Probe 20 Tf '+piece+' ET' for piece in pieces)
        else:
            operators = 'BT /Probe 20 Tf '+'\n'.join(pieces)+' ET'
    stream = DecodedStreamObject()
    stream.set_data(operators.encode('ascii'))
    page[NameObject('/Contents')] = writer._add_object(stream)
    filename = root / ('object-control-'+variant+'.pdf')
    with filename.open('wb') as target:
        writer.write(target)
    reopened = PdfReader(filename)
    text = reopened.pages[0].extract_text()
    layout_text = reopened.pages[0].extract_text(extraction_mode='layout')
    control_rows.append({'variant': variant, 'text': text, 'layoutText': layout_text, 'bytes': filename.stat().st_size,
                         'exactPlainWord': word in text, 'sameFontResourceAndGlyphs': True, 'glyphAdvance': 12})
report['sameFontTextObjectControls'] = control_rows
(root / 'switch-parser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'geometryExact': report['geometryExact'], 'variants': [{'name': r['variant'], 'passedLines': sum(r['exactLinePass'].values()), 'failedLines': [k for k, v in r['exactLinePass'].items() if not v], 'insertedSpaces': len(r['spacingEvents'])} for r in reports], 'sameFontTextObjectControls': control_rows}))
