'use strict';
const AdmZip = require('adm-zip');
const {groundCv,sourceProfile}=require('./cvGroundingService');
const esc=s=>String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function blocks(cv = {}, profile = {}, language='vi') {
 const source=cv.sourceProfile || (Object.keys(profile || {}).length?profile:null);
 if(!source) {const e=new Error('Bản ATS cần profile nguồn. Vui lòng tạo lại CV.');e.statusCode=400;throw e;}
 const d=groundCv(source,cv,language,cv.sourceContext || {targetRole:cv.targetRole});const p=sourceProfile(source);
 const en=language==='en',out=[];
 const add=(text,type='text')=>{if(text)out.push({text:String(text),type})};
 add(d.fullName,'name');add(d.targetRole);add([d.phone,d.email,d.address].filter(Boolean).join(' | '));
 if(d.summary){add(en?'Professional Summary':'Mục tiêu nghề nghiệp','heading');add(d.summary)}
 if(d.tailoredExperience.length){add(en?'Work Experience':'Kinh nghiệm làm việc','heading');for(const e of d.tailoredExperience){add([e.role,e.organization].filter(Boolean).join(' - '),'bold');add(e.duration);for(const a of e.achievements)add(a,'bullet')}}
 if(d.education.length){add(en?'Education':'Học vấn','heading');for(const e of d.education){add(e.school,'bold');add(e.degree);add(e.duration);add(e.highlights)}}
 if(d.highlightedSkills.technical.length){add(en?'Skills':'Kỹ năng','heading');add(d.highlightedSkills.technical.join(', '))}
 for(const [key,label] of [['certifications',en?'Certifications':'Chứng chỉ'],['projects',en?'Projects':'Dự án'],['activities',en?'Activities':'Hoạt động'],['awards',en?'Awards':'Giải thưởng'],['languages',en?'Languages':'Ngôn ngữ']]){
  const vals=p[key];if(!vals || !vals.length)continue;add(label,'heading');
  for(const v of Array.isArray(vals)?vals:[vals]) add(typeof v==='string'?v:Object.entries(v).filter(([k])=>k!=='sourceId').map(([,val])=>Array.isArray(val)?val.join('; '):typeof val==='string'?val:'').filter(Boolean).join(' - '));
 }
 return out;
}
function buildAtsHtml(cv,profile,language) {
 const body=blocks(cv,profile,language).map(b=>b.type==='heading'?`<h2>${esc(b.text)}</h2>`:b.type==='name'?`<h1>${esc(b.text)}</h1>`:`<p${b.type==='bold'?' class="bold"':''}>${b.type==='bullet'?'- ':''}${esc(b.text)}</p>`).join('');
 return `<!doctype html><html lang="${language==='en'?'en':'vi'}"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font:11pt Arial,sans-serif;color:#111;margin:0}.cv-page-container{width:180mm;padding:0!important;min-height:0!important;height:auto!important}h1{font-size:20pt;margin:0 0 8pt}h2{font-size:12pt;margin:14pt 0 6pt;break-after:avoid}p{margin:0 0 6pt;line-height:1.35;overflow-wrap:anywhere}.bold{font-weight:bold}</style></head><body><main class="cv-page-container">${body}</main></body></html>`;
}
function buildAtsDocx(cv,profile,language) {
 const zip=new AdmZip();
 const paragraphs=blocks(cv,profile,language).map(b=>`<w:p><w:pPr><w:spacing w:before="${b.type==='heading'?200:0}" w:after="100"/>${['heading','name'].includes(b.type)?'<w:keepNext/>':''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${b.type==='name'?40:b.type==='heading'?26:22}"/>${['name','heading','bold'].includes(b.type)?'<w:b/>':''}</w:rPr><w:t xml:space="preserve">${b.type==='bullet'?'- ':''}${esc(b.text)}</w:t></w:r></w:p>`).join('');
 zip.addFile('[Content_Types].xml',Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
 zip.addFile('_rels/.rels',Buffer.from('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
 zip.addFile('word/document.xml',Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:bottom="850" w:left="850" w:right="850"/></w:sectPr></w:body></w:document>`));
 return zip.toBuffer();
}
module.exports={buildAtsHtml,buildAtsDocx,blocks};
