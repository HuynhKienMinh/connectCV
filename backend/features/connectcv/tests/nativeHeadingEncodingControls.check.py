"""Owned local causal controls for Type3 encoded/decoded width collisions.
Renaming synthetic CharProcs changes resources: diagnostic, never a release fix.
"""
import hashlib,json,logging,shutil,subprocess,sys
from pathlib import Path
from pypdf import PdfReader,PdfWriter
from pypdf._font import Font
from pypdf.generic import (NameObject,DictionaryObject,ArrayObject,NumberObject,
                          FloatObject,DecodedStreamObject)
from PIL import Image,ImageChops
import pdfplumber
import pypdf._text_extraction._text_extractor as extractor_module

logging.getLogger('pypdf').setLevel(logging.ERROR)
root=Path(sys.argv[1]);assert root.is_dir() and shutil.disk_usage(root).free>=256*1024*1024
assert not (root/'encoding-controls.json').exists()
source=PdfReader(root/'position.pdf');native=source.pages[0]['/Resources']['/Font']
base=native['/F21'].get_object();accent=native['/F25'].get_object()
parsed=Font.from_font_resource(base);decoded_m=parsed.character_widths['M']
actual_m=int(base['/Widths'][49-int(base['/FirstChar'])]);raw77=int(base['/Widths'][77-int(base['/FirstChar'])])
assert parsed.character_map[chr(49)]=='M' and parsed.character_map[chr(77)]=='i'
assert actual_m==1793 and decoded_m==raw77==542
assert [float(x) for x in base['/FontMatrix']]==[1/2048,0,0,-1/2048,0,0]

def stream(writer,data):
 s=DecodedStreamObject();s.set_data(data);return writer._add_object(s)

def toy_font(writer,canonical=False,second=False,recoded=False):
 # Name-only variants keep glyph programs/Widths/ToUnicode bytes. Recoding also
 # moves FirstChar/LastChar + ToUnicode codes, keeping the same semantic glyphs.
 widths={117:1105} if second else ({77:1793,105:542} if recoded else {49:1793,77:542})
 names={117:'u'} if second else ({77:'M',105:'i'} if recoded else ({49:'M',77:'i'} if canonical else {49:'g49',77:'g77'}))
 procs=DictionaryObject()
 for code,name in names.items():
  w=widths[code];procs[NameObject('/'+name)]=stream(writer,f'{w} 0 0 0 {w} 700 d1 0 0 {w//2} 600 re f'.encode())
 mappings={117:117} if second else ({77:77,105:105} if recoded else {49:77,77:105})
 cmap='/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Fixture) /Ordering (Fixture) /Supplement 0 >> def /CMapName /Fixture def /CMapType 2 def 1 begincodespacerange <00> <FF> endcodespacerange '+str(len(mappings))+' beginbfchar '+' '.join('<%02X> <%04X>'%(c,u) for c,u in mappings.items())+' endbfchar endcmap CMapName currentdict /CMap defineresource pop end end'
 first,last=min(widths),max(widths);differences=ArrayObject()
 for code,name in names.items():differences.extend([NumberObject(code),NameObject('/'+name)])
 f=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type3'),NameObject('/FontBBox'):ArrayObject(list(map(NumberObject,[0,0,1794,800]))),NameObject('/FontMatrix'):ArrayObject([FloatObject('0.00048828125'),NumberObject(0),NumberObject(0),FloatObject('-0.00048828125'),NumberObject(0),NumberObject(0)]),NameObject('/CharProcs'):procs,NameObject('/Encoding'):DictionaryObject({NameObject('/Type'):NameObject('/Encoding'),NameObject('/Differences'):differences}),NameObject('/FirstChar'):NumberObject(first),NameObject('/LastChar'):NumberObject(last),NameObject('/Widths'):ArrayObject([NumberObject(widths.get(c,0)) for c in range(first,last+1)]),NameObject('/ToUnicode'):stream(writer,cmap.encode()),NameObject('/FontDescriptor'):DictionaryObject({NameObject('/Type'):NameObject('/FontDescriptor'),NameObject('/FontName'):NameObject('/Fixture'),NameObject('/Flags'):NumberObject(0),NameObject('/MissingWidth'):NumberObject(1108),NameObject('/FontBBox'):ArrayObject(list(map(NumberObject,[0,0,1794,800])))})})
 return writer._add_object(f)

rows=[]
for id in ['native-two-fonts','synthetic-unknown-names','synthetic-adobe-names','synthetic-recoded']:
 writer=PdfWriter();page=writer.add_blank_page(width=595.28,height=841.89)
 if id=='native-two-fonts':
  fonts=DictionaryObject({NameObject('/M'):writer._add_object(base.clone(writer)),NameObject('/U'):writer._add_object(accent.clone(writer))});second='7b';expected='Mụ'
 else:
  fonts=DictionaryObject({NameObject('/M'):toy_font(writer,id.endswith('adobe-names'),recoded=id.endswith('recoded')),NameObject('/U'):toy_font(writer,second=True)});second='75';expected='Mu'
 page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):fonts})
 # The native heading's observed M-to-accent displacement is14.015625.
 # Its integer /Widths advance is14.0078125. Separate BT/Tm boundaries mirror
 # the native heading; neither font is assumed to contain an encoded space.
 mcode='4d' if id.endswith('recoded') else '31'
 content=f'q 1 0 0 -1 0 841.89 cm BT /M 16 Tf 1 0 0 -1 40 60 Tm <{mcode}> Tj ET BT /U 16 Tf 1 0 0 -1 54.015625 60 Tm <{second}> Tj ET Q'
 page[NameObject('/Contents')]=stream(writer,content.encode())
 file=root/(id+'.pdf')
 with file.open('wb') as out:writer.write(out)
 reopened=PdfReader(file);font=reopened.pages[0]['/Resources']['/Font']['/M'].get_object();fp=Font.from_font_resource(font)
 with pdfplumber.open(file) as pdf:other=pdf.pages[0].extract_text()
 text=reopened.pages[0].extract_text();original_check=extractor_module.crlf_space_check;space_events=[]
 def observe(*args,**kwargs):
  result=original_check(*args,**kwargs)
  if result[0]!=args[0]:
   space_events.append({'beforeText':args[0],'afterText':result[0],'beforeOutput':args[6],
    'priorStringWidthPoints':args[9],'effectiveHalfSpacePoints':args[10],
    'previousTm':args[1][1].copy(),'currentTm':args[2][1].copy()})
  return result
 try:
  extractor_module.crlf_space_check=observe;observed=reopened.pages[0].extract_text()
 finally:extractor_module.crlf_space_check=original_check
 assert observed==text # Read-only observation calls original, never repairs output.
 subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1200','-png',str(file),str(root/id)],check=True,capture_output=True,timeout=30)
 programs={str(k):hashlib.sha256(v.get_object().get_data()).hexdigest() for k,v in font['/CharProcs'].items()}
 rows.append({'id':id,'pdfSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'expected':expected,'pypdfPlain':text,'pdfplumberDefault':other,'encodedMWidth':actual_m,'decodedMWidth':fp.character_widths['M'],'fontObjectSpaceWidthBeforePageOverride':fp.space_width,'spaceInsertionEvents':space_events,'fontHasEncodedSpace':any(v==' ' for v in fp.character_map.values()),'firstChar':int(font['/FirstChar']),'lastChar':int(font['/LastChar']),'widthArraySha256':hashlib.sha256(str(font['/Widths']).encode()).hexdigest(),'toUnicodeSha256':hashlib.sha256(font['/ToUnicode'].get_data()).hexdigest(),'charProcProgramSha256ByName':programs})
 assert sum(p.stat().st_size for p in root.rglob('*') if p.is_file())<8*1024*1024
a,b,c=rows[1:];assert a['widthArraySha256']==b['widthArraySha256'] and a['toUnicodeSha256']==b['toUnicodeSha256']
assert sorted(a['charProcProgramSha256ByName'].values())==sorted(b['charProcProgramSha256ByName'].values())
first=Image.open(root/'synthetic-unknown-names.png').convert('RGB');last=Image.open(root/'synthetic-adobe-names.png').convert('RGB');assert first.size==last.size;diff=ImageChops.difference(first,last)
pixels=sum(p!=(0,0,0) for p in diff.get_flattened_data());assert pixels==0
recoded=Image.open(root/'synthetic-recoded.png').convert('RGB');assert recoded.size==first.size;recode_diff=ImageChops.difference(first,recoded);recode_pixels=sum(p!=(0,0,0) for p in recode_diff.get_flattened_data());assert recode_pixels==0
assert sorted(a['charProcProgramSha256ByName'].values())==sorted(c['charProcProgramSha256ByName'].values())
assert rows[0]['pypdfPlain']=='M ụ' and a['pypdfPlain']==b['pypdfPlain']=='M u' and c['pypdfPlain']=='Mu'
assert all(r['pdfplumberDefault']==r['expected'] for r in rows)
assert rows[0]['spaceInsertionEvents'][0]['effectiveHalfSpacePoints']==1.6
assert not c['spaceInsertionEvents']
report={'scope':'Native two-font heading boundary and synthetic encoding-width collision; diagnostic only, resource-changing controls rejected for runtime','sourcePdfSha256':hashlib.sha256((root/'position.pdf').read_bytes()).hexdigest(),'nativeMEncodedCode':49,'nativeEncodedAdvance':actual_m,'nativeWidthAtRaw77':raw77,'nativeDecodedMWidth':decoded_m,'nativeEncodedSpaceCodePresent':any(v==' ' for v in parsed.character_map.values()),'nativeFontObjectSpaceWidthBeforePageOverride':parsed.space_width,'nativeActualAdvancePoints':actual_m/2048*16,'nativeObservedDisplacementPoints':14.015625,'nativePypdfAdvancePoints':decoded_m/1000*16,'pageDefaultSpaceWidthOverride':200,'effectiveHalfSpacePointsAtInsertion':1.6,'syntheticNameChangeDifferentPixels':pixels,'syntheticRecodeDifferentPixels':recode_pixels,'maximumChannelDifference':max(hi for lo,hi in recode_diff.getextrema()),'syntheticFontResourcesEqual':False,'nameOnlyControlSameWidthArrayToUnicodeAndProgramBytes':True,'recodeControlChangesFirstLastCharToUnicodeAndShowCodes':True,'runtimeChanged':False,'verifierUnmodified':True,'cases':rows}
(root/'encoding-controls.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
