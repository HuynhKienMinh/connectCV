"""Local positive-kerning/word-gap controls; unchanged fonts and default extractors."""
import hashlib,json,subprocess,sys
from decimal import Decimal
from pathlib import Path
from pypdf import PdfReader,PdfWriter
from pypdf._font import Font
from pypdf.generic import ContentStream,DictionaryObject,NameObject,DecodedStreamObject
from PIL import Image,ImageChops
import pdfplumber
root=Path(sys.argv[1]);reader=PdfReader(root/'native.pdf');page=reader.pages[0]
resource=page['/Resources']['/Font']['/F23'].get_object();font=Font.from_font_resource(resource)
assert list(map(float,resource['/FontMatrix']))==[1/2048,0,0,-1/2048,0,0]
reverse={v:ord(k) for k,v in font.character_map.items() if isinstance(k,str) and len(k)==1 and ord(k)<256};codes=[reverse[c] for c in 'PDF.'];ops=ContentStream(page.get_contents(),reader).operations
selected=None;current_font=None;size=None
for i,(args,op) in enumerate(ops):
 if op==b'BT':current_font=None
 if op==b'Tf':current_font=str(args[0]);size=float(args[1])
 if op!=b'Tj' or current_font!='/F23' or size!=13:continue
 shows=[];offsets=[]
 for k in range(4):
  n=i+2*k
  if n>=len(ops) or ops[n][1]!=b'Tj':break
  value=ops[n][0][0];shows.append(value.original_bytes if hasattr(value,'original_bytes') else bytes(value))
  if k<3:
   if ops[n+1][1]!=b'Td' or float(ops[n+1][0][1])!=0:break
   offsets.append(Decimal(str(ops[n+1][0][0])))
 if shows==[bytes([c]) for c in codes] and len(offsets)==3:selected=offsets
assert selected is not None
scale=Decimal(1)/2048;size=Decimal(13);first=int(resource['/FirstChar']);width=lambda c:Decimal(str(resource['/Widths'][c-first]))
def split(value,positive_only):
 if positive_only and value<=0:return [value]
 sign=1 if value>=0 else -1;remaining=abs(value);parts=[]
 while remaining>50:parts.append(Decimal(sign*50));remaining-=50
 parts.append(remaining*sign);return parts
# Same copied native font graph; compare full resources, including raw/decoded streams.
def fingerprint(v):
 from pypdf.generic import IndirectObject,StreamObject
 if isinstance(v,IndirectObject):return fingerprint(v.get_object())
 if isinstance(v,dict):
  out={str(k):fingerprint(x) for k,x in sorted(v.items()) if k!='/Length'}
  if isinstance(v,StreamObject):out['rawSha']=hashlib.sha256(v._data).hexdigest();out['decodedSha']=hashlib.sha256(v.get_data()).hexdigest()
  return out
 if isinstance(v,(list,tuple)):return [fingerprint(x) for x in v]
 if isinstance(v,bytes):return v.hex()
 return str(v)
expected=fingerprint(resource);rows=[]
for gap in (False,True):
 code_run=codes+codes if gap else codes
 offsets=selected+[width(codes[-1])*scale*size+Decimal('.35')*size]+selected if gap else selected
 corrections=[(width(c)*scale*size-dx)*1000/size for c,dx in zip(code_run,offsets)]
 for variant in ('native-relative','raw-TJ','positive-only-split','all-signs-split'):
  hexes=['<'+bytes([c]).hex()+'>' for c in code_run];initial='BT /Probe 13 Tf 1 0 0 -1 40 60 Tm '
  if variant=='native-relative':content=initial+hexes[0]+' Tj '+''.join(str(dx)+' 0 Td '+h+' Tj ' for dx,h in zip(offsets,hexes[1:]))+'ET'
  else:
   pieces=[hexes[0]]
   for correction,h in zip(corrections,hexes[1:]):
    parts=[correction] if variant=='raw-TJ' else split(correction,variant=='positive-only-split')
    pieces.extend(format(v,'.12f') for v in parts);pieces.append(h)
   content=initial+'['+' '.join(pieces)+'] TJ ET'
  content='q 1 0 0 -1 0 841.89 cm '+content+' Q';id=('gap-' if gap else 'word-')+variant
  writer=PdfWriter();p=writer.add_blank_page(width=595.28,height=841.89);p[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/Probe'):writer._add_object(resource.clone(writer))})});stream=DecodedStreamObject();stream.set_data(content.encode('ascii'));p[NameObject('/Contents')]=writer._add_object(stream)
  target=root/(id+'.pdf')
  with target.open('wb') as output:writer.write(output)
  reopened=PdfReader(target);assert fingerprint(reopened.pages[0]['/Resources']['/Font']['/Probe'])==expected;plain=reopened.pages[0].extract_text()
  with pdfplumber.open(target) as pdf:other=pdf.pages[0].extract_text()
  subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1200','-png',str(target),str(root/id)],check=True,capture_output=True)
  base=Image.open(root/(('gap-' if gap else 'word-')+'native-relative.png')).convert('RGB');image=Image.open(root/(id+'.png')).convert('RGB');diff=ImageChops.difference(base,image);changed=sum(p!=(0,0,0) for p in diff.get_flattened_data())
  expected_text='PDF. PDF.' if gap else 'PDF.'
  rows.append({'id':id,'expected':expected_text,'pypdfPlain':plain,'pdfplumberDefault':other,'plainExact':plain==expected_text,'plumberExact':other==expected_text,'differentPixels':changed,'maximumChannelDifference':max(hi for lo,hi in diff.getextrema()),'content':content,'fullFontResourceEqual':True})
  assert sum(p.stat().st_size for p in root.iterdir())<8*1024*1024
report={'scope':'Positive tightening versus negative position-only word gap; diagnostic controls, not universal ATS proof','nativeOffsets':list(map(str,selected)),'kerningCorrectionUnits':'thousandths of text space','capPerPositivePart':'50','matrixAndFontUnchanged':True,'verifierUnmodified':True,'cases':rows,'generalRuntimeAccepted':False}
(root/'punctuation-controls.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps([{'id':r['id'],'plain':r['pypdfPlain'],'plumber':r['pdfplumberDefault'],'pixels':r['differentPixels']} for r in rows]))
assert all(r['plainExact'] and r['plumberExact'] and r['differentPixels']==0 for r in rows if r['id'].endswith('positive-only-split'))
assert not next(r for r in rows if r['id']=='gap-all-signs-split')['plainExact'], 'Do not lose the word-gap counterexample'
