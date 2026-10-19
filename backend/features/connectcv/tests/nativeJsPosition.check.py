"""Independent local acceptance of the JS opt-in prototype; no whitespace joining."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
import pypdf
import pdfplumber
from pypdf import PdfReader
from pypdf.generic import ContentStream, IndirectObject, StreamObject, ByteStringObject
from PIL import Image, ImageChops

root = Path(sys.argv[1])
render = json.loads((root/'render-report.json').read_text(encoding='utf-8-sig'))
sha = lambda b: hashlib.sha256(b).hexdigest()
def canonical(value, seen=None):
    seen = set() if seen is None else seen
    if isinstance(value, IndirectObject):
        key = (id(value.pdf), value.idnum, value.generation)
        assert key not in seen, 'Unexpected resource cycle: refuse incomplete comparison'
        return canonical(value.get_object(), seen | {key})
    if isinstance(value, dict):
        result = {str(k): canonical(v, seen) for k,v in sorted(value.items()) if k != '/Length'}
        if isinstance(value, StreamObject):
            result['streamRawSha256'] = sha(value._data)
            result['streamDecodedSha256'] = sha(value.get_data())
        return result
    if isinstance(value, (list,tuple)):
        return [canonical(v, seen) for v in value]
    if isinstance(value, (bytes,ByteStringObject)):
        return {'bytes': bytes(value).hex()}
    if isinstance(value, (float,int)):
        return float(value)
    if value is None:
        return None
    return str(value)
def digest(v):
    return sha(json.dumps(canonical(v),sort_keys=True,ensure_ascii=True).encode())
def non_position_ops(reader):
    return [[(op.decode('ascii'),canonical(args)) for args,op in ContentStream(p.get_contents(),reader).operations if op not in (b'Tm',b'Td')] for p in reader.pages]
rows=[]
for case in render['rows']:
    paths=[root/(case['id']+'-'+suffix+'.pdf') for suffix in ('before','after')]
    readers=[PdfReader(p) for p in paths]
    before,after=readers
    assert len(before.pages)==len(after.pages)==case['pages']
    assert non_position_ops(before)==non_position_ops(after), 'Glyph strings/other paint operators changed'
    assert dict(before.metadata)==dict(after.metadata), 'Document info changed'
    resources=[]
    for a,b in zip(before.pages,after.pages):
        for key in ('/MediaBox','/CropBox','/Rotate','/UserUnit','/Annots'):
            assert canonical(a.get(key))==canonical(b.get(key)), key
        assert abs(float(b.mediabox.width)-595.28)<2 and abs(float(b.mediabox.height)-841.89)<2
        x,y=digest(a['/Resources']),digest(b['/Resources'])
        assert x==y, 'Full font/ToUnicode/descendant/font-file/image resource graph changed'
        resources.append(x)
    checks=[]
    for filename,reader in zip(paths,readers):
        with pdfplumber.open(filename) as pdf:
            plumber='\n'.join(p.extract_text() or '' for p in pdf.pages)
        texts={'pypdf-plain':'\n'.join(p.extract_text() or '' for p in reader.pages),'pdfplumber-default':plumber}
        checks.append({name:[fact for fact in case['requiredFacts'] if fact.casefold() not in ' '.join(text.casefold().split())] for name,text in texts.items()})
    pixels=[]
    for suffix,filename in zip(('before','after'),paths):
        subprocess.run(['pdftoppm','-scale-to','1200','-png',str(filename),str(root/(case['id']+'-'+suffix))],check=True,capture_output=True)
    for page in range(1,len(after.pages)+1):
        a=Image.open(root/(case['id']+'-before-'+str(page)+'.png')).convert('RGB')
        b=Image.open(root/(case['id']+'-after-'+str(page)+'.png')).convert('RGB')
        assert a.size==b.size
        diff=ImageChops.difference(a,b)
        extrema=diff.getextrema();maximum=max(x[1] for x in extrema)
        changed=sum(pixel!=(0,0,0) for pixel in diff.get_flattened_data())
        pixels.append({'page':page,'size':list(a.size),'differentPixels':changed,'maximumChannelDifference':maximum})
    rows.append({'id':case['id'],'pages':case['pages'],'folded':case['folded'],'beforeBytes':paths[0].stat().st_size,'afterBytes':paths[1].stat().st_size,'pdfSha256':[sha(p.read_bytes()) for p in paths],'fullResourceGraphSha256':resources,'metadataEqual':True,'nonPositionOperatorsAndGlyphStringsEqual':True,'missingFactsBefore':checks[0],'missingFactsAfter':checks[1],'pixels':pixels})
    assert sum(p.stat().st_size for p in root.iterdir())<16*1024*1024, 'Owned staging cap'
report={'scope':render['scope'],'pypdf':pypdf.__version__,'pdfplumber':pdfplumber.__version__,'raster':'Poppler pdftoppm scale-to1200','allCasesPass':all(all(not v for v in r['missingFactsAfter'].values()) and all(p['differentPixels']==0 for p in r['pixels']) for r in rows),'cases':rows,'productionRuntimeChanged':False,'full148MatrixVerified':False,'linuxNativePrototypeVerified':False,'actualCloudExportVerified':False}
(root/'acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'cases':len(rows),'pages':sum(r['pages'] for r in rows),'allCasesPass':all(all(not v for v in r['missingFactsAfter'].values()) and all(p['differentPixels']==0 for p in r['pixels']) for r in rows),'rows':[{'id':r['id'],'folded':r['folded'],'missingFactsBefore':{k:len(v) for k,v in r['missingFactsBefore'].items()},'differentPixels':sum(p['differentPixels'] for p in r['pixels'])} for r in rows]}))

if not report['allCasesPass']:
    raise SystemExit(1)
