(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ConnectCVCommunityPublication=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // A narrow contact detector, not a guarantee of anonymity or complete PII removal.
  function hasContact(text){
    const normalized=String(text).normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'');
    return /[\w.+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/u.test(normalized)||
      /(?<![\p{L}\d])(?:\+?84|0)[\s().-]*[35789](?:[\s().-]*\d){8}(?!\d)/u.test(normalized);
  }
  function validate(input,{requireConsent=true}={}){
    const fieldErrors={};
    if(!input||typeof input!=='object'||Array.isArray(input))return {fieldErrors:{form:'Nội dung chia sẻ không hợp lệ.'}};
    const value={};
    for(const [key,min,max,label] of [['companyName',3,100,'Tên công ty'],['position',5,100,'Vị trí'],['reviewText',0,1000,'Đánh giá']]){
      const text=input[key]===undefined&&key==='reviewText'?'':input[key];
      if(typeof text!=='string'||text.trim().length<min||text.trim().length>max)fieldErrors[key]=label+' cần từ '+min+' đến '+max+' ký tự.';
      else value[key]=text.trim();
    }
    const questions=typeof input.interviewQuestions==='string'?input.interviewQuestions.split('\n').map(s=>s.trim()).filter(Boolean):input.interviewQuestions;
    if(!Array.isArray(questions)||questions.length<1||questions.length>20||questions.some(q=>typeof q!=='string'||q.trim().length<15||q.trim().length>500))fieldErrors.interviewQuestions='Cần 1–20 câu hỏi; mỗi câu 15–500 ký tự.';
    else value.interviewQuestions=questions.map(q=>q.trim());
    for(const key of ['companyName','position','reviewText','interviewQuestions']){
      if(value[key]!==undefined&&hasContact(Array.isArray(value[key])?value[key].join('\n'):value[key]))fieldErrors[key]='Hãy bỏ email/số điện thoại khỏi nội dung công khai trước khi đăng.';
    }
    if(input.anonymous!==undefined&&typeof input.anonymous!=='boolean')fieldErrors.anonymous='Chế độ ẩn danh cần là true hoặc false.';
    value.anonymous=input.anonymous===undefined?true:input.anonymous;
    const rating=input.difficultyRating===undefined?3:input.difficultyRating;
    if(typeof rating!=='number'||!Number.isInteger(rating)||rating<1||rating>5)fieldErrors.difficultyRating='Độ khó cần từ 1 đến 5.';
    value.difficultyRating=rating;
    if(requireConsent&&input.publicAcknowledged!==true)fieldErrors.publicAcknowledged='Hãy xem trước và xác nhận đăng công khai; ẩn danh chỉ giấu tên/avatar.';
    value.publicAcknowledged=input.publicAcknowledged===true;
    return {value,fieldErrors};
  }
  function errorResponse(result){return {success:false,code:'COMMUNITY_INPUT_INVALID',message:Object.values(result.fieldErrors)[0],fieldErrors:result.fieldErrors};}
  return {hasContact,validate,errorResponse};
});
