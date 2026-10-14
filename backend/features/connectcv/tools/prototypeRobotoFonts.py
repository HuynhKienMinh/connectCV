"""Offline prototype only: instantiate existing variable subsets then merge.

Never edits runtime/source font assets or downloads a replacement font.
Pass a bounded temporary directory as the sole argument.
"""
import hashlib
import copy
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
    preserve_hints = '--preserve-hinting' in sys.argv[2:]
    no_hints = '--no-hinting' in sys.argv[2:]
    assert not (preserve_hints and no_hints), 'Choose one hinting experiment'
    if preserve_hints:
        report['strategy'] = 'instantiated subsets; restore byte-identical shared hint programs after merge'
    elif no_hints:
        report['strategy'] = 'instantiated subsets; remove all TrueType hinting to compare with painted Type3 glyphs'
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
        if preserve_hints:
            # fontTools intentionally drops instructions from every font after
            # the first because generic CVT/function IDs cannot be reconciled.
            # These exact sources share identical programs/CVT: restoring is safe
            # only after checking all global hint tables and the glyph order.
            originals = [TTFont(p, recalcTimestamp=False) for p in intermediate]
            hint_tables = ['fpgm', 'prep', 'cvt ', 'gasp']
            for tag in hint_tables:
                assert all(originals[0].getTableData(tag) == f.getTableData(tag) for f in originals), (weight, 'incompatible hint tables', tag)
                assert font.getTableData(tag) == originals[0].getTableData(tag), (weight, 'merged hint tables', tag)
            order = font.getGlyphOrder()
            assert len(order) == sum(len(f.getGlyphOrder()) for f in originals)
            offset = 0
            for original in originals:
                for index, name in enumerate(original.getGlyphOrder()):
                    source_glyph = original['glyf'][name]
                    target_glyph = font['glyf'][order[offset + index]]
                    if hasattr(source_glyph, 'program'):
                        target_glyph.program = copy.deepcopy(source_glyph.program)
                    else:
                        target_glyph.removeHinting()
                offset += len(original.getGlyphOrder())
            for original in originals:
                original.close()
        if no_hints:
            for glyph in font['glyf'].glyphs.values():
                glyph.removeHinting()
            for tag in ['fpgm', 'prep', 'cvt ', 'gasp']:
                if tag in font:
                    del font[tag]
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
        if no_hints:
            assert not any(tag in merged for tag in ['fpgm', 'prep', 'cvt ', 'gasp'])
            assert not any(getattr(glyph, 'program', None) and glyph.program.getBytecode()
                           for glyph in merged['glyf'].glyphs.values())
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
                if preserve_hints:
                    left = getattr(original['glyf'][glyph], 'program', None)
                    right = getattr(merged['glyf'][cmap[code]], 'program', None)
                    assert (left.getBytecode() if left else b'') == (right.getBytecode() if right else b''), (weight, 'glyph hint program', code)
            original.close()
            path.unlink()
        merged.close()
        report['weights'][str(weight)] = {'file': output.name, 'sha256': sha(output),
                                          'glyphCodepoints': len(cmap), 'instantiatedSourceOutlinesMetricsExact': True,
                                          'sharedHintingRestored': preserve_hints, 'allHintingRemoved': no_hints}
    (out / 'prototype.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'weights': len(report['weights']), 'instantiatedSourceOutlinesMetricsExact': True}))


if __name__ == '__main__':
    main()
