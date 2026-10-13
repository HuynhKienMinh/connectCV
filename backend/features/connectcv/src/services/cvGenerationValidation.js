'use strict';
const Joi=require('joi');
const profileSchema=Joi.alternatives().try(
 Joi.object().unknown(true),
 Joi.string().max(1000000).custom((value,helpers)=>{
  try{const p=JSON.parse(value);return p&&typeof p==='object'&&!Array.isArray(p)?p:helpers.error('any.invalid');}
  catch{return helpers.error('any.invalid');}
 })
).required();
const generateSchema=Joi.object({
 jdText:Joi.string().trim().min(20).max(6000).required(),
 profile:profileSchema,
 companyName:Joi.string().max(150).allow('').optional(),
 targetRole:Joi.string().max(150).allow('').optional(),
 companyCulture:Joi.string().max(1000).allow('').optional(),
 language:Joi.string().valid('vi','en').default('vi'),
 templateMode:Joi.string().valid('auto','manual').default('auto'),
 selectedTemplateId:Joi.string().max(100).allow('').optional()
}).required();
const messages={
 jdText:'Mô tả công việc (JD): nhập từ 20 đến 6.000 ký tự, không chỉ khoảng trắng.',
 profile:'Hồ sơ: kiểm tra JSON hợp lệ; dữ liệu phải là một đối tượng hồ sơ.',
 companyName:'Tên công ty: nhập tối đa 150 ký tự.',
 targetRole:'Vị trí ứng tuyển: nhập tối đa 150 ký tự.',
 companyCulture:'Văn hóa công ty: nhập tối đa 1.000 ký tự.',
 language:'Ngôn ngữ: chọn Tiếng Việt hoặc English.',
 templateMode:'Mẫu CV: chọn chế độ tự động hoặc thủ công.',
 selectedTemplateId:'Mẫu CV: chọn lại mẫu từ kho mẫu.'
};
function validationResponse(error){
 const fieldErrors={};
 for(const detail of error.details||[]){const field=detail.path?.[0];if(Object.hasOwn(messages,field))fieldErrors[field]=messages[field];}
 const details=Object.values(fieldErrors);
 return {success:false,code:'CV_INPUT_INVALID',message:details[0]||'Kiểm tra lại dữ liệu tạo CV.',fieldErrors,details};
}
function validateGeneration(body){return generateSchema.validate(body,{abortEarly:false,stripUnknown:true});}
module.exports={profileSchema,generateSchema,validationResponse,validateGeneration};
