"""Opt-in placement/continuation and synthetic Type3 spacing controls.
These block glyphs test PDF state semantics, not native template design fidelity.
"""
import hashlib,importlib.util,json,os,shutil,subprocess,sys
from pathlib import Path
from decimal import Decimal
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject,DictionaryObject,ArrayObject,NumberObject,FloatObject,DecodedStreamObject
from PIL import Image,ImageChops
import pdfplumber
root=Path(sys.argv[1]);phase=sys.argv[2];out=root/phase
if not root.exists():root.mkdir(parents=True)
assert not out.exists();out.mkdir();assert shutil.disk_usage(root).free>=256*1024*1024
module_path=Path(__file__).with_name('nativeRelativeTjPrototype.check.py');spec=importlib.util.spec_from_file_location('tj_prototype',module_path);prototype=importlib.util.module_from_spec(spec);spec.loader.exec_module(prototype)
repo=Path(__file__).resolve().parents[4];bridge=Path(__file__).with_name('nativeRelativeTjBridge.check.cjs');rows=[]

def stream(writer,data):
 s=DecodedStreamObject();s.set_data(data);return writer._add_object(s)
def font(writer,units,space):
 scale=Decimal(1)/units;first,last=32,67;widths={32:space,46:200,65:600,66:600,67:600};names={32:'space',46:'period',65:'A',66:'B',67:'C'};charprocs=DictionaryObject()
 for code,name in names.items():
  w=widths[code];paint='' if code==32 else '0 0 '+str(w//2)+' 600 re f'
  charprocs[NameObject('/'+name)]=stream(writer,(str(w)+' 0 0 0 '+str(w)+' 700 d1 '+paint).encode('ascii'))
 cmap='/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Fixture) /Ordering (Fixture) /Supplement 0 >> def /CMapName /Fixture def /CMapType 2 def 1 begincodespacerange <00> <FF> endcodespacerange 5 beginbfchar '+ ' '.join('<%02X> <%04X>'%(c,c) for c in names)+' endbfchar endcmap CMapName currentdict /CMap defineresource pop end end'
 differences=ArrayObject([NumberObject(32),NameObject('/space'),NumberObject(46),NameObject('/period'),NumberObject(65),NameObject('/A'),NameObject('/B'),NameObject('/C')])
 f=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type3'),NameObject('/FontBBox'):ArrayObject(list(map(NumberObject,[0,0,1000,800]))),NameObject('/FontMatrix'):ArrayObject([FloatObject(str(scale)),NumberObject(0),NumberObject(0),FloatObject(str(-scale)),NumberObject(0),NumberObject(0)]),NameObject('/CharProcs'):charprocs,NameObject('/Encoding'):DictionaryObject({NameObject('/Type'):NameObject('/Encoding'),NameObject('/Differences'):differences}),NameObject('/FirstChar'):NumberObject(first),NameObject('/LastChar'):NumberObject(last),NameObject('/Widths'):ArrayObject([NumberObject(widths.get(c,0)) for c in range(first,last+1)]),NameObject('/ToUnicode'):stream(writer,cmap.encode('ascii'))})
 return writer._add_object(f)

def canonical(v):
 from pypdf.generic import IndirectObject,StreamObject
 if isinstance(v,IndirectObject):return canonical(v.get_object())
 if isinstance(v,dict):
  d={str(k):canonical(x) for k,x in sorted(v.items()) if k!='/Length'}
  if isinstance(v,StreamObject):d['raw']=hashlib.sha256(v._data).hexdigest();d['decoded']=hashlib.sha256(v.get_data()).hexdigest()
  return d
 if isinstance(v,(list,tuple)):return [canonical(x) for x in v]
 if isinstance(v,bytes):return v.hex()
 return str(v)

cases=[('supported',1000,600,'(A) Tj 8 0 Td (B) Tj 8 0 Td (C) Tj'),('consecutive-show',1000,600,'(A) Tj (B) Tj 8 0 Td (C) Tj'),('font-change-continuation',1000,600,'(A) Tj /Other 13 Tf (B) Tj 8 0 Td (C) Tj'),('relative-reset',1000,600,'(A) Tj (B) Tj 8 0 Td (C) Tj 8 0 Td (A) Tj'),('character-spacing-skip',1000,600,'1 Tc (A) Tj 8 0 Td (B) Tj'),('large-positive-skip',1000,600,'(A) Tj -30 0 Td (B) Tj')]
for units,space in [(1000,80),(2048,600)]:
 advance=Decimal(600)/units*13;dx=advance-Decimal('114.257813')*13/1000
 cases.append(('punctuation-'+str(units)+'-'+str(space),units,space,'(A) Tj '+str(advance)+' 0 Td (B) Tj '+str(dx)+' 0 Td (.) Tj'))
for id,units,space,body in cases:
 writer=PdfWriter();page=writer.add_blank_page(width=595.28,height=841.89);f=font(writer,units,space);page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/Probe'):f,NameObject('/Other'):f})});page[NameObject('/Contents')]=stream(writer,('q 1 0 0 -1 0 841.89 cm BT /Probe 13 Tf 1 0 0 -1 40 60 Tm '+body+' ET Q').encode('ascii'))
 before=out/(id+'-before.pdf');after=out/(id+'-after.pdf');plan=out/(id+'-plan.json')
 with before.open('wb') as output:writer.write(output)
 result=prototype.transform(before,plan,split_positive=True)
 subprocess.run(['node',str(bridge),str(before),str(plan),str(after)],check=True,capture_output=True,creationflags=0x08000000 if os.name=='nt' else 0)
 a,b=PdfReader(before),PdfReader(after);assert canonical(a.pages[0]['/Resources'])==canonical(b.pages[0]['/Resources']);plain=b.pages[0].extract_text()
 with pdfplumber.open(after) as pdf:other=pdf.pages[0].extract_text()
 for suffix,file in [('before',before),('after',after)]:subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1200','-png',str(file),str(out/(id+'-'+suffix))],check=True,capture_output=True)
 first_image=Image.open(out/(id+'-before.png')).convert('RGB');second_image=Image.open(out/(id+'-after.png')).convert('RGB');diff=ImageChops.difference(first_image,second_image)
 rows.append({'id':id,'units':units,'spaceWidth':space,'body':body,'beforeSha256':hashlib.sha256(before.read_bytes()).hexdigest(),'groups':result['groups'],'positiveSplitCount':result['positiveCorrectionsSplit'],'largePositiveSkips':result['largePositiveRunsSkipped'],'pdfByteIdentity':before.read_bytes()==after.read_bytes(),'pypdfPlain':plain,'pdfplumberDefault':other,'differentPixels':sum(p!=(0,0,0) for p in diff.get_flattened_data()),'maximumChannelDifference':max(hi for lo,hi in diff.getextrema()),'resourceGraphEqual':True})
 assert sum(p.stat().st_size for p in root.rglob('*') if p.is_file())<16*1024*1024
report={'scope':'Synthetic block-glyph fonts for text-matrix placement and spacing guard controls; no native design or ATS certification','phase':phase,'prototypeSha256':hashlib.sha256(module_path.read_bytes()).hexdigest(),'harnessSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'runtimeChanged':False,'cases':rows}
(out/'guard-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(rows))
if phase=='after':
 assert all(r['differentPixels']==0 for r in rows), 'Placement regression'
 for id in ['consecutive-show','font-change-continuation','character-spacing-skip','large-positive-skip']:
  r=next(r for r in rows if r['id']==id);assert r['groups']==0 and r['pdfByteIdentity'],id
 assert next(r for r in rows if r['id']=='relative-reset')['groups']>0
 assert next(r for r in rows if r['id']=='punctuation-1000-80')['pypdfPlain']!='AB.', 'Keep narrow-space counterexample'
