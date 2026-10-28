'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {cleanTextForSpeech}=require('../src/services/ttsService');
test('speech keeps conditions, negation and meaningful bracket contents',()=>{
 const s='Có thể dùng lại (nếu còn quyền truy cập), nhưng [không gửi OTP].';
 const out=cleanTextForSpeech(s);assert.ok(out.includes('nếu còn quyền truy cập'));assert.ok(out.includes('không gửi OTP'));
});
test('speech removes STAR markers and markup while preserving ordinary content',()=>{
 const out=cleanTextForSpeech('[S] **Bối cảnh** [T] Công việc [A] Cách làm [R] Kết quả https://example.invalid/private');
 assert.doesNotMatch(out,/\[S\]|\*\*|https:/);assert.match(out,/Bối cảnh/);assert.match(out,/Kết quả/);
});
async function fixture(t,provider){
 const gp=require.resolve('../src/services/geminiService'),rp=require.resolve('../src/routes/interview'),oldG=require.cache[gp],oldR=require.cache[rp];let calls=0;
 require.cache[gp]={loaded:true,exports:{genAI:{getGenerativeModel(){return {generateContent:async()=>{calls++;return provider();}}}}}};delete require.cache[rp];
 const app=express();app.use(express.json(),require(rp));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>{server.closeAllConnections();server.close();if(oldG)require.cache[gp]=oldG;else delete require.cache[gp];if(oldR)require.cache[rp]=oldR;else delete require.cache[rp];});
 return {calls:()=>calls,request:async body=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}};
}
test('empty audio and unsupported MIME never reach transcription provider',async t=>{
 const f=await fixture(t,()=>({response:{text:()=> 'synthetic'}}));
 for(const body of [{audioBase64:'',mimeType:'audio/wav'},{audioBase64:'UklGRg==',mimeType:'text/html'}])assert.equal((await f.request(body)).status,400);
 assert.equal(f.calls(),0);
});
test('transcription provider errors cannot expose private exception text in logs',async t=>{
 const logs=[],warn=console.warn,error=console.error;console.warn=(...a)=>logs.push(a.join(' '));console.error=(...a)=>logs.push(a.join(' '));t.after(()=>{console.warn=warn;console.error=error;});
 const f=await fixture(t,()=>{throw Error('PRIVATE_TRANSCRIPTION_SENTINEL');});
 const r=await f.request({audioBase64:'UklGRg==',mimeType:'audio/wav'});assert.equal(r.body.success,false);assert.doesNotMatch(JSON.stringify(r.body)+logs.join(' '),/PRIVATE_TRANSCRIPTION_SENTINEL/);
});
test('successful transcription clears its deadline and returns text once',async t=>{
 const nativeSet=setTimeout,nativeClear=clearTimeout,pending=new Set();global.setTimeout=(fn,ms,...args)=>{const id=nativeSet(fn,ms,...args);if(ms===30000)pending.add(id);return id;};global.clearTimeout=id=>{pending.delete(id);return nativeClear(id);};t.after(()=>{global.setTimeout=nativeSet;global.clearTimeout=nativeClear;for(const id of pending)nativeClear(id);});
 const f=await fixture(t,()=>({response:{text:()=> 'Em chưa biết câu này.'}}));const r=await f.request({audioBase64:'UklGRg==',mimeType:'audio/wav'});assert.equal(r.body.data.transcript,'Em chưa biết câu này.');assert.equal(f.calls(),1);assert.equal(pending.size,0);
});
