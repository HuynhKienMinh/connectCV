'use strict';
const crypto=require('node:crypto');
const reasons=new Set(['personal-information','harassment','spam','misleading','other']);
const fail=(status,message)=>Object.assign(new Error(message),{status});
// Missing status is legacy public content. Unknown future states fail closed.
const isVisible=entry=>entry.moderationStatus===undefined||entry.moderationStatus==='visible';
function reportInput(user,postId,body){
 if(!user?.id)throw fail(401,'Vui lòng đăng nhập.');
 if(!/^[a-zA-Z0-9-]{1,100}$/.test(postId))throw fail(400,'ID không hợp lệ.');
 if(!body||!reasons.has(body.reason))throw fail(400,'Vui lòng chọn lý do báo cáo hợp lệ.');
 return {id:crypto.createHash('sha256').update(postId+'\0'+user.id).digest('hex'),reason:body.reason};
}
function requireAdmin(user){if(user?.role!=='admin'||user.emailVerified!==true)throw fail(403,'Bạn không có quyền kiểm duyệt.');}
const reportReceipt=(id,alreadyReported)=>({reportId:id,status:'received',alreadyReported});
// Review queue does not need reporter identity or account/reward metadata.
const reviewEntry=(entry,id)=>({reportId:id,postId:entry.postId,reason:entry.reason,createdAt:entry.createdAt,status:entry.status});
module.exports={fail,isVisible,reportInput,requireAdmin,reportReceipt,reviewEntry};
