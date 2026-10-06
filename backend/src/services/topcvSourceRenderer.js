'use strict';
// Native fonts are served as public immutable resources for srcdoc/PDF loading.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=process.env.TOPCV_SOURCE_ROOT||path.resolve(__dirname,'../../assets/topcv-source');
const cache=new Map(),cssCache=new Map();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TRANSPARENT='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const value=(o,key)=>key.split('.').reduce((p,k)=>p?.[k],o)??'';
function load(slug,language){
 if(!/^[a-z0-9_]+$/.test(slug))throw new Error('Invalid CV template');
 const key=slug+'-'+(language==='en'?'en':'vi');
 if(cache.has(key))return cache.get(key);
 const file=path.join(ROOT,'templates',key+'.json');
 if(!fs.existsSync(file))throw new Error('Missing original TopCV variant: '+key);
 const t=JSON.parse(fs.readFileSync(file,'utf8'));cache.set(key,t);return t;
}
function cssFor(t){return t.cssFiles.map(file=>{if(!cssCache.has(file))cssCache.set(file,fs.readFileSync(path.join(ROOT,'styles',file),'utf8'));return cssCache.get(file)}).join('\n')}
function dates(time=''){
 const parts=String(time).split(/\s*[-–—]\s*(?=\d{4}\b|\d{1,2}\/\d{4}\b|Present\b|Hiện tại\b|Nay\b)/i);
 return {start:parts[0]||'',end:parts.slice(1).join(' - ')};
}
function optional(items){return (Array.isArray(items)?items:items?[items]:[]).map(item=>{
 const x=typeof item==='string'?{title:item}:item||{};
 const text=[x.name||x.title||x.organization,x.role,x.description||x.content].filter(Boolean).join(' · '),time=x.year||x.date||x.duration||x.time||'';
 return {...x,title:x.title||x.name||text,content:x.content||text,details:x.description||text,experience:x.bullets||[x.description].filter(Boolean),organization:x.organization||x.company||'',position:x.role||'',project_name:x.title||x.name||'',my_position:x.role||'',my_responsibility:x.description||x.content||'',certification_time:time,award_time:time,time,...dates(time)};
}).filter(x=>[x.title,x.content,x.organization,x.position,x.details,...(x.experience||[])].some(v=>String(v??'').trim()));}
function valuesFor(cv={},profile={}){
 const avatar=profile.avatarUrl||profile.avatarDataUrl||cv.avatarUrl||cv.avatarDataUrl||'';
 const safeAvatar=/^(data:image\/(png|jpeg|jpg|webp|gif);base64,|https?:\/\/|\/(?!\/))/.test(avatar)?avatar:TRANSPARENT;
 const skills=cv.highlightedSkills?.technical||(Array.isArray(profile.skills)?profile.skills:[]);
 return {
  profile:{fullname:profile.fullName||cv.fullName||'',title:cv.targetRole||profile.targetRole||'',phone:profile.phone||cv.phone||'',email:profile.email||cv.email||'',address:cv.address||profile.address||'',dob:profile.birth||cv.birth||'',gender:cv.gender||profile.gender||'',website:profile.website||profile.linkedin||profile.github||'',avatar:safeAvatar},
  objective:{objective:cv.summary||profile.summary||''},
  experience:(cv.tailoredExperience||profile.experience||[]).map(e=>({company:e.organization||e.company||'',position:e.role||e.position||'',...dates(e.duration||e.time),experience:e.achievements||e.bullets||[],details:e.achievements||e.bullets||[]})),
  education:(cv.education||profile.education||[]).map(e=>({school:e.school||'',title:e.degree||'',...dates(e.duration||e.time),details:e.highlights||e.highlight||''})),
  skillgroup:skills.map(area=>({area,skill_description:''})),skillrate:skills.map(title=>({title})),
  award:optional(cv.awards||profile.awards),certification:optional(cv.certifications||profile.certifications),activity:optional(cv.activities||profile.activities),reference:optional(cv.references||profile.references),project:optional(cv.projects||profile.projects),language:optional(cv.languages||profile.languages),
  interests:{interests:(cv.interests||profile.interests||[]).toString()},additional_info:{details:''}
 };
}
function substitute(source,values,t){
 let body=source.replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,(_,g,inside)=>values[g]&&(Array.isArray(values[g])?values[g].length:Object.values(values[g]).some(v=>String(v??'').trim()))?inside:'');
 body=body.replace(/\{\{#(\w+)\}\}/g,(_,g)=>(values[g]||[]).map(item=>t.rows[g].replace(/\{\{(!?)([^}]+)\}\}/g,(_,rich,key)=>{
  const text=value(item,key.split('.').slice(1).join('.'));
  if(rich){const unit=t.rich[key];return unit?unit.before+(Array.isArray(text)?text:[text]).map(v=>unit.item.replace('{{.}}',escape(v))).join('')+unit.after:''}
  return escape(text);
 })).join(''));
 return body.replace(/\{\{([^}]+)\}\}/g,(_,key)=>escape(value(values,key)));
}
let version;
function sourceVersion(){if(version)return version;const hash=crypto.createHash('sha256');for(const dir of ['templates','styles'])for(const file of fs.readdirSync(path.join(ROOT,dir)).sort())hash.update(fs.readFileSync(path.join(ROOT,dir,file)));hash.update(fs.readFileSync(__filename));return version='topcv-'+hash.digest('hex').slice(0,12)}
function renderTopcvSource(tmpl,cv,profile={},language='vi',{preview=false}={}){
 const slug=tmpl.slug||tmpl.id,t=load(slug,language),values=valuesFor(cv,profile);
 let body=preview?t.originalBody:substitute(t.body,values,t);
 body=body.replace(/(<div\b[^>]*>)\s*©\s*topcv\.vn\s*(<\/div>)/gi,'$1© ConnectCV$2');
 if(!preview){
  // Existing native text boxes remain editable; no wrapper changes their geometry.
  body=body.replace(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/g,list=>list.replace(/<[^>]*>/g,'').replace(/&nbsp;|•|\s/g,'')?list:'');
  body=body.replace(/class="ql-editor"/g,'class="ql-editor" contenteditable="true"');
  const crop=profile.avatarCrop||{},zoom=Math.max(1,Math.min(3,Number(crop.zoom)||1)),limit=(zoom-1)*50;
  const x=Math.max(-limit,Math.min(limit,Number(crop.x)||0)),y=Math.max(-limit,Math.min(limit,Number(crop.y)||0));
  body=body.replace(/<img\b/g,`<img data-photo-zoom="${zoom}" data-photo-x="${x}" data-photo-y="${y}"`);
 }
 const exportRules=`html,body,body.in-iframe{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}#cvo-document{margin:0!important;box-shadow:none!important}.cv-page-container{width:210mm;margin:0;overflow:visible}.cvo-page:last-child{break-after:auto!important;page-break-after:auto!important}.cv-photo-editor,.no-print{display:none}@page{size:A4;margin:0}`;
 const scripts=preview?'':`<script>for(const item of [...document.querySelectorAll(".cv-page-container section")].reverse()){if(!item.textContent.trim()&&!item.querySelector("img,svg,input,textarea"))item.remove()}</script><script src="/js/cv-photo-editor.js" defer></script><script>
async function cvExport(extension){const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,.cv-photo-editor,.no-print').forEach(e=>e.remove());const response=await fetch('/api/cv/export-'+extension,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html:'<!doctype html>'+clone.outerHTML,templateId:${JSON.stringify(slug)},language:${JSON.stringify(language)},fileName:'CV'})});if(!response.ok)throw new Error('Export failed');const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download='CV.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}function downloadAsPdf(){return cvExport('pdf')}function downloadAsDocx(){return cvExport('docx')}
</script>`;
 return `<!doctype html><html lang="${escape(language)}" style="${escape(t.rootConfig.htmlStyle)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(preview?tmpl.title:values.profile.fullname)} — ${escape(tmpl.title)}</title><style>${cssFor(t)}</style><style>${exportRules}</style></head><body class="${escape(t.rootConfig.bodyClass)}"><div class="cv-page-container" id="cv-content" data-template="${slug}" data-native-topcv="${slug}" data-design-version="${sourceVersion()}">${body}</div>${scripts}</body></html>`;
}
module.exports={renderTopcvSource,sourceVersion,valuesFor,substitute,load,ROOT};
