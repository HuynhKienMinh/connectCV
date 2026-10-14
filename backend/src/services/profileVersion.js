'use strict';
const crypto=require('node:crypto');
function canonical(value,depth=0){
 if(depth>30)throw Object.assign(new Error('Hồ sơ có cấu trúc quá sâu.'),{status:400});
 if(!value||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
 return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
}
// Account-bound opaque content version; no database migration or contact data in errors.
function profileVersion(uid,profile){return '"'+crypto.createHash('sha256').update(uid+'\n'+canonical(profile||{})).digest('hex')+'"';}
function requireVersion(version){
 if(typeof version!=='string'||!/^"[a-f0-9]{64}"$/.test(version))throw Object.assign(new Error('Hãy nạp lại hồ sơ trước khi lưu. Bản nháp chưa bị thay đổi.'),{status:428,code:'PROFILE_VERSION_REQUIRED'});
}
module.exports={profileVersion,requireVersion};
