"""Offline prototype only: instantiate existing variable subsets then merge.

Never edits runtime/source font assets or downloads a replacement font.
Pass a bounded temporary directory as the sole argument.
"""
import hashlib
import json
import sys
from pathlib import Path
from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'topcv-source' / 'assets'
SOURCES = ['ce075ab86dc1c623078b.woff2', '890de452eac592c62afc.woff2']


def outline(font, glyph):
    glyphs = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyphs)
    glyphs[glyph].draw(pen)
    return pen.value


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    out = Path(sys.argv[1]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    report = {'prototypeOnly': True, 'family': 'Roboto', 'style': 'normal',
              'version': '3.015', 'weights': {},
              'sources': [{'file': file, 'sha256': sha(ASSETS / file)} for file in SOURCES]}
    for weight in [400, 500, 600, 700]:
        intermediate = []
        for file in SOURCES:
            source = TTFont(ASSETS / file, recalcTimestamp=False)
            assert source['name'].getDebugName(1) == 'Roboto'
            assert source['name'].getDebugName(5).startswith('Version 3.015;')
            assert [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in source['fvar'].axes] == [('wght', 100, 400, 900)]
            font = instantiateVariableFont(source, {'wght': weight}, inplace=False)
            font.recalcTimestamp = False
            font.flavor = None
            path = out / f'{weight}-{file}.ttf'
            font.save(path)
            font.close()
            source.close()
            intermediate.append(path)
        font = Merger().merge([str(p) for p in intermediate])
        first = TTFont(intermediate[0], recalcTimestamp=False)
        font['head'].created = first['head'].created
        font['head'].modified = first['head'].modified
        first.close()
        font.recalcTimestamp = False
        font.flavor = 'woff2'
        output = out / f'roboto-{weight}.woff2'
        font.save(output)
        font.close()
        merged = TTFont(output, recalcTimestamp=False)
        cmap = merged.getBestCmap()
        assert 'fvar' not in merged, 'Prototype must be a fully instantiated face'
        for path in intermediate:
            original = TTFont(path, recalcTimestamp=False)
            for table, keys in [('head', ['unitsPerEm']), ('hhea', ['ascent', 'descent', 'lineGap']),
                                ('OS/2', ['sTypoAscender', 'sTypoDescender', 'sTypoLineGap', 'usWinAscent', 'usWinDescent'])]:
                for key in keys:
                    assert getattr(original[table], key) == getattr(merged[table], key), (weight, table, key)
            for code, glyph in original.getBestCmap().items():
                assert code in cmap, (weight, 'missing glyph', code)
                assert original['hmtx'][glyph] == merged['hmtx'][cmap[code]], (weight, 'advance metrics', code)
                assert outline(original, glyph) == outline(merged, cmap[code]), (weight, 'outline', code)
            original.close()
            path.unlink()
        merged.close()
        report['weights'][str(weight)] = {'file': output.name, 'sha256': sha(output),
                                          'glyphCodepoints': len(cmap), 'instantiatedSourceOutlinesMetricsExact': True}
    (out / 'prototype.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'weights': len(report['weights']), 'instantiatedSourceOutlinesMetricsExact': True}))


if __name__ == '__main__':
    main()
