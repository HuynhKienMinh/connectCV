'use strict';
(function(root){
 const MAX_AVATAR_CHARS=240000,MAX_PROFILE_BYTES=850*1024;
 const imagePattern=/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
 const cache=new Map();
 function failure(message){const e=new Error(message);e.retryable=false;return e;}
 async function encode(source){
  const image=new Image();let url=source;
  if(typeof source!=='string')url=URL.createObjectURL(source);
  try{
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(failure('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WEBP khác; bản nháp vẫn được giữ.'));image.src=url;});
   if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw failure('Độ phân giải ảnh quá lớn. Hãy chọn ảnh dưới 40 megapixel; bản nháp vẫn được giữ.');
   const canvas=document.createElement('canvas');let edge=768;
   while(edge>=192){
    const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw failure('Trình duyệt chưa xử lý được ảnh. Hãy chọn ảnh nhỏ hơn; bản nháp vẫn được giữ.');
    // Preserve the entire portrait and flatten transparency onto a white CV background.
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.86,.74,.6]){const data=canvas.toDataURL('image/jpeg',quality);if(data.startsWith('data:image/jpeg;base64,')&&data.length<=MAX_AVATAR_CHARS)return data;}
    edge=Math.floor(edge*.75);
   }
   throw failure('Chưa thu nhỏ được ảnh để lưu. Hãy chọn ảnh khác; bản nháp vẫn được giữ.');
  }finally{if(typeof source!=='string')URL.revokeObjectURL(url);}
 }
 function compactAvatar(data){
  if(!data)return Promise.resolve('');
  if(typeof data!=='string'||!imagePattern.test(data)||data.length>4200000)return Promise.reject(failure('Ảnh hồ sơ không hợp lệ hoặc vượt 3 MB. Chọn lại ảnh; bản nháp vẫn được giữ.'));
  if(!data.startsWith('data:image/gif;')&&data.length<=MAX_AVATAR_CHARS)return Promise.resolve(data);
  if(!cache.has(data)){
   // One transient legacy image, never a persistent cache of profiles/photos.
   cache.clear();const pending=encode(data);cache.set(data,pending);pending.catch(()=>cache.delete(data));
  }
  return cache.get(data);
 }
 function canonical(profile,avatar){const result={...profile};delete result.avatarDataUrl;if(avatar)result.avatarUrl=avatar;else if('avatarUrl' in result)result.avatarUrl='';return result;}
 function checkSize(profile){
  const bytes=new TextEncoder().encode(JSON.stringify(profile)).byteLength;
  if(bytes>MAX_PROFILE_BYTES)throw failure('Hồ sơ còn quá dài sau khi thu nhỏ ảnh. Hãy rút gọn nội dung/dự án rồi lưu lại; bản nháp vẫn được giữ.');
  return profile;
 }
 async function prepare(profile){
  if(!profile||typeof profile!=='object'||Array.isArray(profile))throw failure('Hồ sơ chưa đúng định dạng; bản nháp vẫn được giữ.');
  const avatar=profile.avatarUrl||profile.avatarDataUrl||'';
  return checkSize(canonical(profile,await compactAvatar(avatar)));
 }
 const api={MAX_AVATAR_CHARS,MAX_PROFILE_BYTES,encode,compactAvatar,canonical,checkSize,prepare};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.connectCVProfileImage=api;
})(typeof window==='undefined'?{}:window);
