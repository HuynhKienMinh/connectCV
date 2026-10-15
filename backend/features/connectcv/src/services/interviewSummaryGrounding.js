'use strict';
function answeredPairs(history) {
 const pairs=[];let question='';
 for(const turn of history.slice(-20)){
  const text=String(turn.message||turn.content||'').trim();if(!text)continue;
  if(turn.role==='interviewer')question=text;
  else if(turn.role==='candidate'&&question){pairs.push({answerId:'answer-'+(pairs.length+1),question,candidateAnswer:text});question='';}
  else if(turn.role==='candidate'&&pairs.length)pairs[pairs.length-1].candidateAnswer+='\n'+text;
 }
 return pairs;
}
function groundSummary(result,pairs){
 if(!pairs.length)throw Error('No answered interview turns');
 const {groundEvaluation}=require('./interviewEvaluationService');
 const rows=Array.isArray(result.qaBreakdown)?result.qaBreakdown:[];
 const qaBreakdown=pairs.map(pair=>{
  const matches=rows.filter(row=>row.answerId===pair.answerId);
  if(matches.length!==1||typeof matches[0].score!=='number'||!Number.isFinite(matches[0].score)||matches[0].score<0||matches[0].score>10)throw Error('AI evaluation does not match answered turns');
  // Apply the same complete-sentence/negation rule as single-answer evaluation.
  // Facts and scores cannot borrow evidence from another turn. Model prose and
  // unknown fields are omitted; practice guidance is derived from verified gaps.
  const grounded=groundEvaluation(matches[0],pair);
  return {...pair,score:grounded.score,scoreNote:grounded.scoreNote,
   suggestedStarAnswer:grounded.suggestedStarAnswer,
   verifiedComponents:grounded.verifiedComponents,rejectedComponents:grounded.rejectedComponents,
   strengths:grounded.strengths,followUpQuestions:grounded.followUpQuestions,
   practiceTask:grounded.practiceTask,critique:grounded.practiceTask};
 });
 const overallScore=qaBreakdown.every(row=>typeof row.score==='number')?Math.round(qaBreakdown.reduce((sum,row)=>sum+row.score,0)/qaBreakdown.length*10)/10:null;
 return {qaBreakdown,overallScore,
  scoreNote:'Điểm là ước lượng của AI để luyện tập dựa trên trích dẫn đã kiểm tra. Chất lượng rubric vẫn cần đánh giá bởi người thử.',
  strengths:qaBreakdown.flatMap((row,i)=>row.strengths.length?[`Câu ${i+1}: có trích dẫn nguồn cho ${row.verifiedComponents.length} phần STAR.`]:[]),
  improvements:qaBreakdown.flatMap((row,i)=>row.followUpQuestions.map(q=>`Câu ${i+1}: ${q}`)),
  finalAdvice:'Chọn một câu cần làm rõ, bổ sung thông tin thực tế rồi luyện lại. Giữ nguyên phủ định và chỉ dùng số liệu có bằng chứng.',
  rating:overallScore===null?'Chưa xác minh':overallScore>=8.5?'Xuất Sắc':overallScore>=7?'Rất Tốt':'Cần Trau Dồi Thêm',
  summary:`Đã ghi nhận ${pairs.length} câu trả lời. Khung STAR giữ các câu/dòng nguyên văn từ đúng lượt; điểm chưa xác minh được để trống. Câu hỏi chưa trả lời không được chấm.`};
}
module.exports={answeredPairs,groundSummary};
