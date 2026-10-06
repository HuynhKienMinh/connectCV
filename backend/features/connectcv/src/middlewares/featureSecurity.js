 'use strict';
// Identity is supplied by the existing authentication middleware, never by body/headers.
// This module owns feature admission, not login/token verification.
function createFeatureSecurity({consumeBudget=userId=>require('../services/featureBudget').consumeFeatureBudget(userId),clock=Date.now}={}){
 const buckets=new Map();

async function featureSecurity(req,res,next){
 if((req.method==='GET'||req.method==='HEAD')&&!String(req.path||'').endsWith('/download-docx'))return next();
 if(process.env.NODE_ENV==='production'&&req.featureIdentityVerified!==true)return res.status(503).json({success:false,code:'AUTH_INTEGRATION_REQUIRED',message:'Tính năng đang chờ tích hợp xác thực tài khoản.'});
 if(!req.user||typeof req.user.id!=='string'||!req.user.id||req.user.id.length>200)
  return res.status(401).json({success:false,code:'AUTH_REQUIRED',message:'Vui lòng đăng nhập để sử dụng chức năng này.'});
 res.setHeader('Cache-Control','no-store');
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({success:false,message:'Nội dung yêu cầu không hợp lệ.'});
 for(const key of ['history','messages','conversationHistory'])if(body[key]!==undefined){
  const a=body[key];
  if(!Array.isArray(a)||a.length>100||JSON.stringify(a).length>32000)return res.status(400).json({success:false,message:'Lịch sử hội thoại quá dài hoặc không hợp lệ.'});
 }
 for(const key of ['message','userMessage','question','candidateAnswer','jobTitle','companyName','position','reviewText','answer','text','jdText'])if(body[key]!==undefined&&typeof body[key]!=='string')
  return res.status(400).json({success:false,message:'Trường văn bản không hợp lệ: '+key});
 for(const key of ['userProfile','profile','candidateProfile'])if(body[key]!==undefined){
  const p=body[key];
  if(p===null||Array.isArray(p)||!['object','string'].includes(typeof p))return res.status(400).json({success:false,message:'Hồ sơ không hợp lệ.'});
  const text=JSON.stringify(p,(k,v)=>/avatar|photo/i.test(k)?undefined:v);
  if(text.length>60000)return res.status(400).json({success:false,message:'Hồ sơ quá dài.'});
 }
 // Account bucket cannot be reset by spoofing X-Forwarded-For. Socket bucket is
 // deliberately conservative behind a proxy; use a shared store for replicas.
 const fullPath=(req.baseUrl||'')+(req.path||'');
 const utility=['/api/cv/templates/recommend','/api/cv/auto-match-jobs','/api/cv/render'].includes(fullPath);
 const ai=['/api/cv/generate','/api/cv/translate','/api/cv/ats-score','/api/chatbot/message','/api/interview/start','/api/interview/transcribe','/api/interview/live-chat','/api/interview/live-summary','/api/interview/evaluate','/api/interview/proposal','/api/interview/debrief'].includes(fullPath);
 const group=utility?'utility':'action';
 const now=clock(),window=300000,limit=utility?120:15;
 if(buckets.size>10000)for(const [k,v]of buckets)if(v.until<=now)buckets.delete(k);
 const keys=['account:'+group+':'+req.user.id,'socket:'+group+':'+(req.socket?.remoteAddress||'unknown')];
 for(const key of keys){const v=buckets.get(key);if(v&&v.until>now&&v.count>=(key.startsWith('account:')?limit:300)){
  res.setHeader('Retry-After',String(Math.ceil((v.until-now)/1000)));
  return res.status(429).json({success:false,code:'FEATURE_RATE_LIMIT',message:'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'});
 }}
 if(buckets.size>=12000)return res.status(503).json({success:false,message:'Hệ thống đang bận.'});
 for(const key of keys){let v=buckets.get(key);if(!v||v.until<=now)v={count:0,until:now+window};v.count++;buckets.set(key,v);}
 try{if(ai)await consumeBudget(req.user.id);}
 catch(error){return res.status(error.status||503).json({success:false,code:'FEATURE_BUDGET',message:error.status===429?'Đã đạt giới hạn 100 yêu cầu/ngày. Vui lòng quay lại ngày mai.':'Chưa cấu hình kho quota bền vững hoặc dịch vụ đang bận.'});}
 next();
}
return featureSecurity;
}
const featureSecurity=createFeatureSecurity();
module.exports={featureSecurity,createFeatureSecurity};
