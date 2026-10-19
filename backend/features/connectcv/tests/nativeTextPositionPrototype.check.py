"""Local-only prototype: fold adjacent Tm/Td into an equivalent text matrix.

No production integration. Do not change fonts, ToUnicode, strings or glyph programs.
Requires independent extraction and raster comparison before any acceptance claim.
"""
import json
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject, NameObject


def fold(source, target):
    writer = PdfWriter()
    writer.clone_document_from_reader(PdfReader(source))
    count = 0
    for page in writer.pages:
        stream = ContentStream(page.get_contents(), writer)
        operations = []
        inside = False
        i = 0
        while i < len(stream.operations):
            operands, operator = stream.operations[i]
            if operator == b'BT':
                inside = True
            elif operator == b'ET':
                inside = False
            if inside and operator == b'Tm' and len(operands) == 6 and i+1 < len(stream.operations):
                offset, next_op = stream.operations[i+1]
                if next_op == b'Td' and len(offset) == 2:
                    a, b, c, d, e, f = map(float, operands)
                    tx, ty = map(float, offset)
                    matrix = [a, b, c, d, e+tx*a+ty*c, f+tx*b+ty*d]
                    operations.append(([FloatObject(x) for x in matrix], b'Tm'))
                    count += 1
                    i += 2
                    continue
            operations.append((operands, operator))
            i += 1
        stream.operations = operations
        page[NameObject('/Contents')] = writer._add_object(stream)
    with target.open('wb') as output:
        writer.write(output)
    return count


if __name__ == '__main__':
    source, target = map(Path, sys.argv[1:3])
    count = fold(source, target)
    before, after = PdfReader(source), PdfReader(target)
    assert len(before.pages) == len(after.pages)
    assert [list(p.mediabox) for p in before.pages] == [list(p.mediabox) for p in after.pages]
    print(json.dumps({'source': source.name, 'foldedPairs': count, 'pages': len(after.pages), 'bytes': target.stat().st_size,
                      'plainText': '\n'.join(p.extract_text() or '' for p in after.pages), 'productionFix': False}, ensure_ascii=False))
