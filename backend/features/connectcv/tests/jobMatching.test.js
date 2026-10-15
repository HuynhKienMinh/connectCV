const test=require('node:test'),assert=require('node:assert/strict');
const {JOBS_DATABASE,matchJobsWithProfile,getJobById}=require('../src/services/jobService');
const fixtures=require('./fixtures/job-match-profiles.json');
test('100 clearly synthetic jobs: ten distinct roles per industry, complete selectable JDs',()=>{
 const counts={}; assert.equal(JOBS_DATABASE.length,100);
 assert.equal(new Set(JOBS_DATABASE.map(j=>j.id)).size,100);
 for(const j of JOBS_DATABASE){counts[j.industry]=(counts[j.industry]||0)+1;assert.equal(j.isSynthetic,true);assert.match(j.jdText,/DỮ LIỆU GIẢ/);assert.ok(j.requirements.length>=4&&j.responsibilities.length>=3);assert.equal(j.companyLogo,'');assert.equal(getJobById(j.id),j);}
 assert.equal(Object.keys(counts).length,10);assert.ok(Object.values(counts).every(n=>n===10));
});
test('all 100 reference profiles rank their own role first with explicit matching evidence',()=>{
 for(const f of fixtures){const r=matchJobsWithProfile(f.profile);assert.equal(r.matchedJobs[0].id,f.expectedTopJob);assert.equal(r.matchedJobs[0].matchScore,100);assert.equal(r.isSynthetic,true);assert.equal(r.matchedJobs[0].matchedKeywords.length,4);}
});
test('empty, unrelated and contact-only profiles have no fabricated minimum score or IT defaults',()=>{
 for(const p of [{},null,[],{summary:'Không có thông tin nghề nghiệp'},{email:'node.js@example.test',address:'Excel SQL',company:'React Docker'},{skills:{technical:'SQL'}},{targetRole:'Sales',skills:['wholesale'] }])assert.equal(matchJobsWithProfile(p).matchedJobs.length,0);
 const sparse=matchJobsWithProfile({targetRole:'Backend Developer Node.js',skills:['Node.js']});
 const row=sparse.matchedJobs.find(j=>j.id==='synthetic-it-01');assert.ok(row);assert.equal(row.matchScore,48);assert.ok(row.matchScore<85);
});
