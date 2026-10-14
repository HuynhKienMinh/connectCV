"""Local prototype: normalize Type3 glyph units, preserving painted geometry.

This tests the hypothesis that normalizing glyph units helps extraction.
It has NOT resolved the observed split words and is NOT a production fix.
Rescale the font matrix, widths and glyph programs together; preserve Unicode
and text operators, then independently verify both painted geometry and text.
"""
import json
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ContentStream, FloatObject, NameObject


def normalize(source, output):
    writer = PdfWriter()
    writer.clone_document_from_reader(PdfReader(source))
    seen = set()
    fonts = glyphs = 0
    for page in writer.pages:
        for reference in page.get('/Resources', {}).get('/Font', {}).values():
            font = reference.get_object()
            if id(font) in seen or font.get('/Subtype') != '/Type3':
                continue
            seen.add(id(font))
            matrix = list(map(float, font['/FontMatrix']))
            if matrix != [1/2048, 0, 0, -1/2048, 0, 0]:
                continue
            scale = matrix[0] / 0.001
            programs = []
            for name, ref in font['/CharProcs'].items():
                stream = ContentStream(ref.get_object(), writer)
                operands, operator = stream.operations[0]
                assert operator in [b'd0', b'd1'], 'Unsupported glyph preamble'
                assert len(operands) == (2 if operator == b'd0' else 6)
                stream.operations = [([FloatObject(float(v)*scale) for v in operands], operator),
                                     ([], b'q'),
                                     ([FloatObject(scale), FloatObject(0), FloatObject(0), FloatObject(scale), FloatObject(0), FloatObject(0)], b'cm'),
                                     *stream.operations[1:], ([], b'Q')]
                programs.append((name, stream))
            font[NameObject('/FontMatrix')] = ArrayObject([FloatObject(.001), FloatObject(0), FloatObject(0), FloatObject(-.001), FloatObject(0), FloatObject(0)])
            for key in ['/Widths', '/FontBBox']:
                font[NameObject(key)] = ArrayObject([FloatObject(float(v)*scale) for v in font[key]])
            for name, stream in programs:
                font['/CharProcs'][name] = writer._add_object(stream)
                glyphs += 1
            fonts += 1
    with Path(output).open('wb') as target:
        writer.write(target)
    return {'fontsNormalized': fonts, 'glyphProgramsRescaled': glyphs,
            'pages': len(writer.pages), 'bytes': Path(output).stat().st_size}


if __name__ == '__main__':
    print(json.dumps(normalize(Path(sys.argv[1]), Path(sys.argv[2]))))
