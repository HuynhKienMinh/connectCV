'use strict';
(function(root){
 function validate(input,{checkJD=true}={}){
  const errors={};const jd=typeof input.jdText==='string'?input.jdText.trim():'';
  if(checkJD&&(jd.length<20||jd.length>6000))errors.jdText='Mô tả công việc (JD): nhập từ 20 đến 6.000 ký tự, không chỉ khoảng trắng.';
  let profile=input.profile;
  if(typeof profile==='string'){try{if(profile.length>1000000)throw Error();profile=JSON.parse(profile);}catch{profile=null;}}
  if(!profile||typeof profile!=='object'||Array.isArray(profile))errors.profile='Hồ sơ: kiểm tra JSON hợp lệ; dữ liệu phải là một đối tượng hồ sơ.';
  if(typeof input.companyName==='string'&&input.companyName.length>150)errors.companyName='Tên công ty: nhập tối đa 150 ký tự.';
  return errors;
 }
 function errorMessage(response){
  const fields=Object.values(response.fieldErrors||{}).filter(v=>typeof v==='string');
  return fields.length?fields.join(' '):response.message||'Không thể tạo CV. Vui lòng thử lại.';
 }
 const api={validate,errorMessage};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.connectCVCvInput=api;
})(typeof window==='undefined'?{}:window);
