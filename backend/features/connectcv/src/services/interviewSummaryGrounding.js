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
 const rows=Array.isArray(result.qaBreakdown)?result.qaBreakdown:[];
 const normalized=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim();
 const qaBreakdown=pairs.map(pair=>{
  const matches=rows.filter(row=>row.answerId===pair.answerId);
  if(matches.length!==1||typeof matches[0].score!=='number'||!Number.isFinite(matches[0].score)||matches[0].score<0||matches[0].score>10)throw Error('AI evaluation does not match answered turns');
  const row=matches[0],source=normalized(pair.candidateAnswer),suggestedStarAnswer={};
  for(const key of ['situation','task','action','result']){
   const quote=String(row.suggestedStarAnswer?.[key]||'').trim();
   suggestedStarAnswer[key]=quote&&source.includes(normalized(quote))?quote:'';
  }
  return {...row,...pair,suggestedStarAnswer};
 });
 const overallScore=Math.round(qaBreakdown.reduce((sum,row)=>sum+row.score,0)/qaBreakdown.length*10)/10;
 return {...result,qaBreakdown,overallScore,rating:overallScore>=8.5?'Xuất Sắc':overallScore>=7?'Rất Tốt':'Cần Trau Dồi Thêm',summary:`Đánh giá dựa trên ${pairs.length} câu trả lời đã được ghi nhận. Các câu hỏi chưa trả lời không được chấm điểm.`};
}
module.exports={answeredPairs,groundSummary};
