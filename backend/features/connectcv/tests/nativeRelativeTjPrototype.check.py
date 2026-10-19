"""Local-only Tj/Td-to-TJ stream plan for generated PDFs; use pdf-lib bridge to preserve resource numeric literals. Never a public PDF parser.
Requires the separate font/glyph/raster/text verifier; unsupported runs stay unchanged.
"""
from decimal import Decimal
from pathlib import Path
import json,sys,base64
from pypdf import PdfReader
from pypdf.generic import ContentStream,ByteStringObject,ArrayObject,FloatObject

def raw(value):
    if isinstance(value,(str,bytes)):
        return value.original_bytes if hasattr(value,'original_bytes') else bytes(value)
    raise ValueError('Unsupported text string')
def transform(source,target):
    assert source.stat().st_size<16*1024*1024
    reader=PdfReader(source);assert len(reader.pages)<=64
    groups=0;glyphs=0;plans=[]
    for page_index,page in enumerate(reader.pages):
        content=page.get_contents()
        if content is None:continue
        assert len(content.get_data())<4*1024*1024
        stream=ContentStream(content,reader);ops=stream.operations;assert len(ops)<200000
        # Public/runtime safety is not inferred from these owned-artifact bounds.
        if any((op in (b'Tc',b'Tw') and list(map(float,args))!=[0.0]) or (op==b'Tz' and list(map(float,args))!=[100.0]) for args,op in ops):continue
        fonts=page['/Resources'].get('/Font',{});inside=False;font=None;size=None;out=[];i=0
        while i<len(ops):
            args,op=ops[i]
            if op==b'BT':inside=True;font=None;size=None
            elif op==b'ET':inside=False
            elif op==b'Tf' and inside:
                font=fonts.get(args[0]);font=font.get_object() if font else None;size=Decimal(str(args[1]))
            elif op in (b'q',b'Q'):font=None;size=None
            supported=inside and font is not None and size is not None and 0<size<=512 and str(font.get('/Subtype'))=='/Type3'
            if supported:
                matrix=list(map(Decimal,map(str,font.get('/FontMatrix',[]))))
                supported=len(matrix)==6 and matrix[0] in (Decimal(1)/2048,Decimal('.001')) and matrix[1:3]==[0,0] and matrix[3]==-matrix[0] and matrix[4:]==[0,0]
            if not supported or op!=b'Tj':out.append((args,op));i+=1;continue
            chunks=[raw(args[0])];offsets=[];j=i+1
            while j+1<len(ops) and ops[j][1]==b'Td' and len(ops[j][0])==2 and float(ops[j][0][1])==0 and ops[j+1][1]==b'Tj':
                dx=Decimal(str(ops[j][0][0]));assert dx.is_finite() and abs(dx)<10000000
                chunks.append(raw(ops[j+1][0][0]));offsets.append(dx);j+=2
            if len(chunks)<2 or j>=len(ops) or ops[j][1] not in (b'ET',b'Tm') or sum(map(len,chunks))>4096:
                out.append((args,op));i+=1;continue
            first=int(font['/FirstChar']);widths=font['/Widths'];values=[];valid=True
            for k,chunk in enumerate(chunks):
                values.append(ByteStringObject(chunk))
                if k>=len(offsets):continue
                if any(not first<=code<first+len(widths) for code in chunk):valid=False;break
                width=sum((Decimal(str(widths[code-first])) for code in chunk),Decimal(0))
                correction=(width*matrix[0]*size-offsets[k])*1000/size
                values.append(FloatObject(format(correction,'.12f')))
            if not valid:out.append((args,op));i+=1;continue
            out.append(([ArrayObject(values)],b'TJ'));groups+=1;glyphs+=sum(map(len,chunks));assert groups<=20000;i=j
        if out!=ops:
            stream.operations=out;plans.append({'page':page_index,'contentBase64':base64.b64encode(stream.get_data()).decode('ascii')})
    result={'groups':groups,'glyphBytesGrouped':glyphs,'pages':plans,'runtimeIntegrated':False}
    target.write_text(json.dumps(result),encoding='utf-8');assert target.stat().st_size<16*1024*1024
    return {'groups':groups,'glyphBytesGrouped':glyphs,'planBytes':target.stat().st_size,'runtimeIntegrated':False}
if __name__=='__main__':print(json.dumps(transform(Path(sys.argv[1]),Path(sys.argv[2]))))
