'use strict';
// The model selects source IDs only. No model-written biographical claim is published.
const text = value => typeof value === 'string' ? value.trim() : '';
const list = value => Array.isArray(value) ? value : [];
const uniq = values => [...new Set(values.filter(Boolean))];
function translateKnown(value, language) {
  let result = text(value);
  if (language !== 'en') return result;
  const pairs = [
    [/Hiện tại/gi, 'Present'], [/Đại học FPT Cần Thơ/gi, 'FPT University Can Tho'],
    [/Đại học FPT/gi, 'FPT University'], [/Đại học Cần Thơ/gi, 'Can Tho University'],
    [/Kỹ sư Kỹ thuật Phần mềm/gi, 'Engineer in Software Engineering'],
    [/Kỹ thuật Phần mềm/gi, 'Software Engineering'], [/Công nghệ Thông tin/gi, 'Information Technology'],
    [/Lập trình viên Backend/gi, 'Backend Developer'], [/Lập trình viên Frontend/gi, 'Frontend Developer'],
    [/Lập trình viên/gi, 'Software Developer'], [/Kỹ sư Phần mềm/gi, 'Software Engineer'],
    [/Nền tảng AI Career/gi, 'AI Career Platform'], [/Việt Nam/gi, 'Vietnam'], [/Cần Thơ/gi, 'Can Tho'],
    [/Tốt nghiệp loại Giỏi/gi, 'Graduated: Good classification'], [/Tốt nghiệp loại Xuất sắc/gi, 'Graduated: Excellent classification']
  ];
  for (const [pattern, replacement] of pairs) result = result.replace(pattern, replacement);
  return result;
}
function sourceProfile(profile = {}) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('Profile phải là một object hợp lệ.');
  const p = {};
  for (const key of ['fullName','phone','email','address','birth','gender','summary','targetRole','avatarUrl','avatarDataUrl']) p[key] = text(profile[key]);
  p.avatarCrop = profile.avatarCrop;
  p.skills = uniq((Array.isArray(profile.skills) ? profile.skills : text(profile.skills).split(/[,;\n]/)).map(text));
  p.experience = list(profile.experience).filter(e=>e && typeof e==='object').map((e,index)=>({
    sourceId:`experience:${index}`,role:text(e.role || e.position),company:text(e.company || e.organization),time:text(e.time || e.duration),
    bullets:list(e.bullets || e.achievements).map(text).filter(Boolean)
  })).filter(e=>e.company || e.role || e.time || e.bullets.length);
  p.experience=p.experience.map((e,i)=>({...e,sourceId:`experience:${i}`}));
  p.education = list(profile.education).filter(e=>e && typeof e==='object').map((e,index)=>({
    sourceId:`education:${index}`,school:text(e.school),degree:text(e.degree),time:text(e.time || e.duration),highlight:text(e.highlight || e.highlights)
  })).filter(e=>e.school || e.degree || e.time || e.highlight);
  // Preserve optional sections exactly; the layout renderer already escapes their text.
  for (const key of ['certifications','activities','awards','interests','references','projects','languages','website','linkedin','github']) if (profile[key] !== undefined) p[key]=profile[key];
  return p;
}
function orderSources(sources, ids) {
  const byId = new Map(sources.map(s=>[s.sourceId,s]));
  const result=[];
  for (const id of list(ids)) if (byId.has(id)) { result.push(byId.get(id));byId.delete(id); }
  return [...result, ...byId.values()];
}
function assessKeywords(profile, jd = '') {
  const p=sourceProfile(profile);
  const norm=s=>text(s).normalize('NFKC').toLocaleLowerCase();
  const job=norm(jd);
  const matched=p.skills.filter(s=>{
    const escaped=norm(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,'u').test(job);
  });
  return {atsScore:p.skills.length ? Math.round(matched.length/p.skills.length*100) : 0,
    scoreType:'profile_skill_overlap',scoreLabel:'Tỷ lệ kỹ năng profile xuất hiện trong JD',
    matchedKeywords:matched,missingKeywords:[],
    atsRecommendations:['Điểm này chỉ đo tỷ lệ kỹ năng đã khai báo xuất hiện trong JD, không phải xác nhận của ATS.','Chỉ bổ sung kỹ năng hoặc số liệu thành tích khi có bằng chứng thực tế.']};
}
function groundCv(profile, plan = {}, language = 'vi', context = {}) {
  const p=sourceProfile(profile), tr=value=>translateKnown(value,language);
  const exp=orderSources(p.experience,plan.experienceOrder || list(plan.tailoredExperience).map(e=>e.sourceId));
  const skillIds=list(plan.skillOrder);const skills=uniq([...skillIds.filter(id=>/^skill:\d+$/.test(id)).map(id=>p.skills[Number(id.slice(6))]),...p.skills]);
  const warnings=[];
  if(!p.experience.length)warnings.push('Không có kinh nghiệm trong profile: không tự bổ sung kinh nghiệm.');
  if(!p.education.length)warnings.push('Không có học vấn trong profile: không tự bổ sung học vấn.');
  if(language==='en' && /[à-ỹđ]/i.test([p.summary,...p.experience.flatMap(e=>e.bullets),...p.education.map(e=>e.highlight)].join(' '))) warnings.push('Một số nội dung được giữ nguyên ngôn ngữ nguồn để tránh dịch sai dữ kiện.');
  const result = {
    language,fullName:p.fullName,phone:p.phone,email:p.email,address:tr(p.address),birth:p.birth,gender:language==='en'?({'Nam':'Male','Nữ':'Female'}[p.gender] || tr(p.gender)):p.gender,
    targetRole:tr(text(context.targetRole) || p.targetRole),company:text(context.companyName),
    skillOrder:skills.map(s=>'skill:'+p.skills.indexOf(s)),
    summary:tr(p.summary),highlightedSkills:{technical:skills.map(tr),soft:[]},
    tailoredExperience:exp.map(e=>({sourceId:e.sourceId,role:tr(e.role),organization:tr(e.company),duration:tr(e.time),achievements:e.bullets.map(tr)})),
    education:p.education.map(e=>({sourceId:e.sourceId,school:tr(e.school),degree:tr(e.degree),duration:tr(e.time),highlights:tr(e.highlight)})),
    ...assessKeywords(p,context.jdText || ''),grounding:{version:2,policy:'source_only',warnings},
    ...Object.fromEntries(['certifications','activities','awards','interests','references','projects','languages'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])),
    sourceProfile:p,sourceContext:{targetRole:text(context.targetRole)||p.targetRole,companyName:text(context.companyName),jdText:text(context.jdText)}
  };
  return require('./cvTranslationService').applyBundle(result,plan.translationBundle);
}
function buildPlanningProfile(profile) {
  const p=sourceProfile(profile);
  // Never truncate a JSON string in the middle or silently discard trailing history.
  const json=require('./aiProfilePrivacy').planningProfile(p);
  if(json.length>60000) {const e=new Error('Profile quá dài (tối đa 60.000 ký tự nội dung). Vui lòng rút gọn trước khi tạo CV.');e.statusCode=400;throw e;}
  return json;
}
module.exports={sourceProfile,groundCv,assessKeywords,buildPlanningProfile,translateKnown};
