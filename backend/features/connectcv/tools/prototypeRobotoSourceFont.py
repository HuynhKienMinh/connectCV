"""Prototype the same official variable font without merging subset programs.

Input official-roboto.ttf/OFL/provenance must already be in the temporary folder.
No runtime assets are changed. Keep the wght axis, pin original default wdth=100.
"""
import hashlib
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from prototypeRobotoFonts import ASSETS, SOURCES, outline, sha


def main():
    staging = Path(sys.argv[1]).resolve()
    official = staging / 'official-roboto.ttf'
    provenance = json.loads((staging / 'official-source.json').read_text(encoding='utf-8'))
    expected = next(row['sha256'] for row in provenance if row['file'] == official.name)
    assert sha(official) == expected
    license_text = (staging / 'official-OFL.txt').read_text(encoding='utf-8')
    assert 'SIL OPEN FONT LICENSE Version 1.1' in license_text
    assert 'The Roboto Project Authors' in license_text
    source = TTFont(official, recalcTimestamp=False)
    assert source['name'].getDebugName(1) == 'Roboto'
    assert source['name'].getDebugName(5).startswith('Version 3.015;')
    assert source['name'].getDebugName(0).startswith('Copyright 2011 The Roboto Project Authors')
    result = instantiateVariableFont(source, {'wdth': 100}, inplace=False)
    result.recalcTimestamp = False
    result.flavor = 'woff2'
    out = staging / 'full-source'
    out.mkdir(exist_ok=True)
    output = out / 'full-source.woff2'
    result.save(output)
    result.close()
    source.close()
    merged = TTFont(output, recalcTimestamp=False)
    assert [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in merged['fvar'].axes] == [('wght', 100, 400, 900)]
    proofs = []
    for weight in [400, 500, 600, 700]:
        candidate = instantiateVariableFont(merged, {'wght': weight}, inplace=False)
        cmap = candidate.getBestCmap()
        glyphs = 0
        for file in SOURCES:
            subset = TTFont(ASSETS / file, recalcTimestamp=False)
            original = instantiateVariableFont(subset, {'wght': weight}, inplace=False)
            for table, keys in [('head', ['unitsPerEm']), ('hhea', ['ascent', 'descent', 'lineGap'])]:
                for key in keys:
                    assert getattr(original[table], key) == getattr(candidate[table], key), (weight, table, key)
            for code, glyph in original.getBestCmap().items():
                assert code in cmap, (weight, 'missing glyph', code)
                assert original['hmtx'][glyph] == candidate['hmtx'][cmap[code]], (weight, 'metrics', code)
                assert outline(original, glyph) == outline(candidate, cmap[code]), (weight, 'outline', code)
                glyphs += 1
            original.close()
            subset.close()
        proofs.append({'weight': weight, 'sourceCodepointsChecked': glyphs, 'outlinesMetricsExact': True})
        candidate.close()
    merged.close()
    report = {'prototypeOnly': True, 'family': 'Roboto', 'style': 'normal', 'version': '3.015',
              'strategy': 'official full source, wdth100, retained variable wght axis',
              'sources': [{'file': file, 'sha256': sha(ASSETS / file)} for file in SOURCES],
              'officialSources': provenance, 'proofs': proofs,
              'weights': {str(w): {'file': output.name, 'sha256': sha(output)} for w in [400, 500, 600, 700]}}
    (out / 'prototype.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'sourceOutlinesMetricsExact': True, 'bytes': output.stat().st_size, 'proofs': proofs}))


if __name__ == '__main__':
    main()
