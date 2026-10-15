'use strict';
// Owner-authorized synthetic catalogue, never represented as real vacancies.
const JOBS_DATABASE = require('../catalog/jobs.synthetic.json');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
const contains = (text, phrase) => (' '+text+' ').includes(' '+normalize(phrase)+' ');
function matchJobsWithProfile(profile = {}) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) profile = {};
  const list = value => Array.isArray(value) ? value : [];
  // Contact details/location/employer names are not evidence of job skills.
  const skills = Array.isArray(profile.skills) ? profile.skills : typeof profile.skills === 'string' ? profile.skills.split(/[,;\n]/) : [...list(profile.skills?.technical), ...list(profile.skills?.soft)];
  const role = normalize(profile.targetRole || profile.role);
  const text = normalize([role, profile.summary, ...skills, ...list(profile.experience).map(e => [e?.role, ...list(e?.achievements), ...list(e?.bullets)].join(' ')), ...list(profile.projects).map(p => [p?.name, p?.technologies, p?.description].join(' '))].join(' '));
  const matchedJobs = JOBS_DATABASE.map(job => {
    const matchedKeywords = job.keywords.filter(kw => contains(text, kw));
    const roleWords = [...new Set(normalize(job.role).split(' ').filter(w => w.length > 1))];
    const roleRatio = roleWords.filter(w => contains(role, w)).length / roleWords.length;
    const matchScore = Math.round(70 * matchedKeywords.length / job.keywords.length + 30 * roleRatio);
    return {...job, matchScore, matchedKeywords, matchingReasons:[`Trùng ${matchedKeywords.length}/${job.keywords.length} từ khóa yêu cầu: ${matchedKeywords.join(', ') || 'chưa có'}.`, 'Điểm đối chiếu từ khóa, không phải xác suất được tuyển hoặc đánh giá văn hóa.']};
  }).filter(job => job.matchedKeywords.length && job.matchScore >= 40).sort((a,b) => b.matchScore-a.matchScore || a.id.localeCompare(b.id));
  return {success:true, isSynthetic:true, dataSource:'synthetic-test-catalog', scoreLabel:'Đối chiếu từ khóa', minimumScore:40, catalogCount:JOBS_DATABASE.length, suggestedRoles:[...new Set(matchedJobs.slice(0,4).map(j=>j.role))], suggestedFields:[...new Set(matchedJobs.map(j=>j.industry))], profileKeywords:[...new Set(matchedJobs.flatMap(j=>j.matchedKeywords))], totalMatched:matchedJobs.length, matchedJobs};
}
module.exports = {JOBS_DATABASE, matchJobsWithProfile, getAllJobs:()=>JOBS_DATABASE, getJobById:id=>JOBS_DATABASE.find(j=>j.id===id)||null};
