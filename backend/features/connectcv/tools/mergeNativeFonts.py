"""Offline build tool; never invoked by the server.

Use Python with fonttools==4.66.1, brotli==1.2.0, zopfli==0.4.3.
Merge the existing OFL Be Vietnam Pro v1.002 Latin/Vietnamese subsets.
Preserve outlines, advance metrics, family metadata and original assets.
"""
import hashlib
import json
from pathlib import Path

from fontTools.merge import Merger
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'topcv-source'
PAIRS = {
    '400': ['192831e68d5da19beeea.woff2', '15cdfa1fd883cec29715.woff2'],
    '500': ['4c25826416358c17312d.woff2', '24af766ee9bbfc8b6f84.woff2'],
    '600': ['1f09cf2cad8deace5af5.woff2', 'a4a19814300ef353dcec.woff2'],
    '700': ['d0a722dfe679d853f5d2.woff2', 'cc213dd9a52f29568177.woff2'],
}


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def outline(font, name):
    glyphs = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyphs)
    glyphs[name].draw(pen)
    return pen.value


def main():
    manifest = {'family': 'Be Vietnam Pro', 'style': 'normal',
                'version': '1.002', 'license': 'font-licenses/be-vietnam-pro/OFL.txt',
                'tools': {'fonttools': '4.66.1', 'brotli': '1.2.0', 'zopfli': '0.4.3'},
                'weights': {}}
    for weight, names in PAIRS.items():
        files = [ROOT / 'assets' / name for name in names]
        font = Merger().merge([str(p) for p in files])
        # Fixed source timestamps allow byte-for-byte reproducible outputs.
        original = TTFont(files[0], recalcTimestamp=False)
        font['head'].created = original['head'].created
        font['head'].modified = original['head'].modified
        original.close()
        font.recalcTimestamp = False
        font.flavor = 'woff2'
        temporary = ROOT / 'assets' / ('merged-' + weight + '.woff2')
        font.save(temporary)
        result = TTFont(temporary, recalcTimestamp=False)
        cmap = result.getBestCmap()
        for file in files:
            source = TTFont(file, recalcTimestamp=False)
            for table, keys in [('head', ['unitsPerEm']), ('hhea', ['ascent', 'descent', 'lineGap'])]:
                for key in keys:
                    assert getattr(source[table], key) == getattr(result[table], key), (weight, table, key)
            for code, glyph in source.getBestCmap().items():
                assert code in cmap, (weight, 'missing glyph', code)
                assert source['hmtx'][glyph] == result['hmtx'][cmap[code]], (weight, 'metrics', code)
                assert outline(source, glyph) == outline(result, cmap[code]), (weight, 'outline', code)
            source.close()
        result.close()
        sha = digest(temporary)
        target = ROOT / 'assets' / (sha[:20] + '.woff2')
        temporary.replace(target)
        manifest['weights'][weight] = {'file': target.name, 'sha256': sha,
                                      'glyphCodepoints': len(cmap),
                                      'sources': [{'file': p.name, 'sha256': digest(p)} for p in files]}
    (ROOT / 'merged-fonts.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'weights': len(PAIRS), 'outlinesAndMetricsPreserved': True}))


if __name__ == '__main__':
    main()
