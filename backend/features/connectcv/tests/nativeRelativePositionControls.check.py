"""Opt-in same-native-font controls for remaining relative Tj/Td word splitting.
No renderer/font/verifier patch, production integration or broad acceptance claim.
"""
import hashlib,json,subprocess,sys
from decimal import Decimal
from pathlib import Path
from pypdf import PdfReader,PdfWriter
from pypdf._font import Font
from pypdf.generic import NameObject,DictionaryObject,DecodedStreamObject,ContentStream
import pdfplumber
from PIL import Image,ImageChops

root=Path(sys.argv[1]);source=PdfReader(root/'native.pdf');page=source.pages[0]
resource=page['/Resources']['/Font']['/F23'].get_object();font=Font.from_font_resource(resource)
assert str(resource['/Subtype'])=='/Type3'
assert list(map(float,resource['/FontMatrix']))==[1/2048,0,0,-1/2048,0,0]
reverse={v:ord(k) for k,v in font.character_map.items() if isinstance(k,str) and len(k)==1 and ord(k)<256}
word='MATRIX';codes=[reverse[c] for c in word]
# Locate actual Chrome word positions; refuse guessed metrics or a changed font subset.
ops=ContentStream(page.get_contents(),source).operations;selected=None;current_font=None;current_size=None
for i,(a,op) in enumerate(ops):
 if op==b'BT':current_font=None;current_size=None
 if op==b'Tf':current_font=str(a[0]);current_size=float(a[1])
 if op!=b'Tj' or current_font!='/F23' or current_size!=13:continue
 shows=[];offsets=[]
 for j in range(6):
  pos=i+j*2
  if pos>=len(ops) or ops[pos][1]!=b'Tj':break
  value=ops[pos][0][0];raw=value.original_bytes if hasattr(value,'original_bytes') else bytes(value)
  shows.append(raw)
  if j<5:
   args,next_op=ops[pos+1]
   if next_op!=b'Td' or len(args)!=2 or float(args[1])!=0:break
   offsets.append(Decimal(str(args[0])))
 if shows==[bytes([c]) for c in codes] and len(offsets)==5:selected=offsets
assert selected is not None
widths=[Decimal(str(resource['/Widths'][c-int(resource['/FirstChar'])])) for c in codes]
size=Decimal(13);scale=Decimal(1)/Decimal(2048)
x=[Decimal(40)]
for offset in selected:x.append(x[-1]+offset)
hexes=['<'+bytes([c]).hex()+'>' for c in codes]
initial='BT /Probe 13 Tf 1 0 0 -1 40 60 Tm '
relative=initial+hexes[0]+' Tj '+''.join(str(dx)+' 0 Td '+h+' Tj ' for dx,h in zip(selected,hexes[1:]))+'ET'
absolute='BT /Probe 13 Tf '+''.join('1 0 0 -1 '+str(at)+' 60 Tm '+h+' Tj ' for at,h in zip(x,hexes))+'ET'
objects='\n'.join('BT /Probe 13 Tf 1 0 0 -1 '+str(at)+' 60 Tm '+h+' Tj ET' for at,h in zip(x,hexes))
natural=initial+'<'+bytes(codes).hex()+'> Tj ET'
adjustments=[(width*scale*size-dx)*1000/size for width,dx in zip(widths,selected)]
tj=initial+'['+hexes[0]+''.join(' '+format(k,'.12f')+' '+h for k,h in zip(adjustments,hexes[1:]))+'] TJ ET'
variants={'relative-Td':relative,'absolute-Tm':absolute,'per-glyph-object':objects,'single-natural-Tj':natural,'adjusted-TJ':tj}
# Font bytes/Widths/ToUnicode stay identical; only the content operations differ.
def fingerprint(value,seen=None):
 from pypdf.generic import IndirectObject,StreamObject
 seen=set() if seen is None else seen
 if isinstance(value,IndirectObject):
  key=(id(value.pdf),value.idnum);assert key not in seen;return fingerprint(value.get_object(),seen|{key})
 if isinstance(value,dict):
  out={str(k):fingerprint(v,seen) for k,v in sorted(value.items()) if k!='/Length'}
  if isinstance(value,StreamObject):out['raw']=hashlib.sha256(value._data).hexdigest();out['decoded']=hashlib.sha256(value.get_data()).hexdigest()
  return out
 if isinstance(value,(list,tuple)):return [fingerprint(v,seen) for v in value]
 if isinstance(value,bytes):return value.hex()
 return str(value)
expected=fingerprint(resource);rows=[]
for variant,content in variants.items():
 content='q 1 0 0 -1 0 841.89 cm '+content+' Q'
 writer=PdfWriter();p=writer.add_blank_page(width=595.28,height=841.89)
 p[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/Probe'):writer._add_object(resource.clone(writer))})})
 stream=DecodedStreamObject();stream.set_data(content.encode('ascii'));p[NameObject('/Contents')]=writer._add_object(stream)
 target=root/(variant+'.pdf')
 with target.open('wb') as output:writer.write(output)
 reopened=PdfReader(target);assert fingerprint(reopened.pages[0]['/Resources']['/Font']['/Probe'])==expected
 text=reopened.pages[0].extract_text()
 with pdfplumber.open(target) as pdf:
  other=pdf.pages[0].extract_text();positions=[{'text':c['text'],'x0':c['x0'],'top':c['top']} for c in pdf.pages[0].chars]
 subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1200','-png',str(target),str(root/variant)],check=True,capture_output=True)
 baseline=Image.open(root/'relative-Td.png').convert('RGB');image=Image.open(root/(variant+'.png')).convert('RGB');assert baseline.size==image.size
 diff=ImageChops.difference(baseline,image);changed=sum(p!=(0,0,0) for p in diff.get_flattened_data());maximum=max(hi for lo,hi in diff.getextrema())
 rows.append({'variant':variant,'content':content,'pypdfPlain':text,'pdfplumberDefault':other,'plainWholeWord':word in text,'fullFontResourceEqual':True,'differentPixels':changed,'maximumChannelDifference':maximum,'positions':positions,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 assert sum(p.stat().st_size for p in root.iterdir())<8*1024*1024
report={'scope':'Same actual Type3 glyph/font MATRIX controls; native relative positions preserved where claimed; not runtime integration','nativeOffsets':list(map(str,selected)),'codes':codes,'widths':list(map(str,widths)),'fontMatrixScale':str(scale),'tjCorrections':list(map(str,adjustments)),'pypdfDecodedMWidth':font.character_widths.get('M'),'pypdfEncodedCodeWidth':font.character_widths.get(chr(codes[0])),'cases':rows,'fontReplacementPerformed':False,'verifierBehaviorChanged':False,'fullMatrixAccepted':False}
(root/'control-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'cases':[{'variant':r['variant'],'text':r['pypdfPlain'],'pixels':r['differentPixels'],'max':r['maximumChannelDifference']} for r in rows]}))
