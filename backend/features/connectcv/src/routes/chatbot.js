'use strict';
const express=require('express');
const router=express.Router();
const {callGeminiJSON}=require('../services/geminiService');
const {validateChat,chatError,guides,localReply,buildPrompt,aiReply}=require('../services/chatbotService');
function capabilities(){return {pdfReady:require('../services/pdfService').isRendererReady(),transactionalCredits:process.env.FEATURE_STORE_BACKEND==='firestore'};}
router.post('/message',async(req,res)=>{
 try{
  const checked=validateChat(req.body);
  if(checked.error)return res.status(400).json(chatError(checked.error));
  const input=checked.value,config=capabilities();
  const answer=localReply(input.message,config);
  if(answer)return res.json({success:true,data:answer});
  const result=await callGeminiJSON(buildPrompt(input,config));
  return res.json({success:true,data:aiReply(result)});
 // Provider error text is untrusted and may contain conversation/profile data.
 // Keep a fixed diagnostic code instead of copying that text into route logs.
 }catch{console.error('[Chatbot message] CHAT_PROVIDER_UNAVAILABLE');return res.status(503).json({success:false,code:'CHAT_PROVIDER_UNAVAILABLE',message:'Không thể nhận gợi ý AI lúc này. Bạn có thể hỏi cách sử dụng CV, PDF, phỏng vấn hoặc Credits để xem hướng dẫn ứng dụng.'});}
});
router.get('/faq',(req,res)=>res.json({success:true,data:guides(capabilities())}));
module.exports=router;
