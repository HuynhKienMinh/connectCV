'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=process.env.CHAT_UI_BASELINE==='1'?require('node:child_process').execFileSync('git',['show','HEAD:backend/features/connectcv/public/index.html'],{encoding:'utf8',maxBuffer:2*1024*1024}):fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const source=html.slice(html.indexOf('    let chatbotHistory = [];'),html.indexOf('    // Gắn sự kiện Enter gửi tin nhắn cho Chatbot'));
function fixture(){
 const fields={'chatbot-input':{value:''},'chat-user-name':{value:'PRIVATE_NAME<script>fake</script>'},'chat-user-role':{value:'Bán lẻ'},'btn-chatbot-send':{disabled:false}},events={},calls=[],timers=new Map();let timerId=0;
 function element(){return {innerHTML:'',innerText:'',children:[],appendChild(child){child.parent=this;this.children.push(child);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},get scrollHeight(){return this.children.length;}};}
 const container=element();let intro='';Object.defineProperty(container,'innerHTML',{get(){return intro;},set(v){intro=v;container.children=[];}});fields['chatbot-messages']=container;
 const scope={AbortController,document:{getElementById:id=>fields[id]||container.children.find(n=>n.id===id),createElement:element},window:{addEventListener:(name,handler)=>events[name]=handler},setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),showToastError(){},fetch:(url,options)=>new Promise((resolve,reject)=>calls.push({url,options,resolve:body=>resolve({json:async()=>body}),raw:resolve,reject}))};
 vm.createContext(scope);vm.runInContext(source,scope);
 return {scope,fields,calls,timers,container,send(text){fields['chatbot-input'].value=text;return scope.sendChatbotMessage();},history:()=>JSON.parse(vm.runInContext('JSON.stringify(chatbotHistory)',scope)),text:()=>container.innerHTML+container.children.map(n=>n.innerHTML+n.innerText).join(''),logout:()=>events['connectcv:logout']?.()};
}
const answer=text=>({success:true,data:{reply:text,suggestedQuestions:[],responseKind:'ai-advice'}}),tick=()=>new Promise(r=>setImmediate(r));
test('clear history during pending response prevents deleted private conversation from reappearing',async()=>{
 const f=fixture(),pending=f.send('PRIVATE_OLD_QUESTION');f.scope.clearChatHistory();f.calls[0].resolve(answer('PRIVATE_OLD_REPLY'));await pending;assert.deepEqual(f.history(),[]);assert.ok(!f.text().includes('PRIVATE_OLD_REPLY'));assert.equal(f.fields['btn-chatbot-send'].disabled,false);
});
test('late old completion cannot append to a new conversation or unlock its active request',async()=>{
 const f=fixture(),a=f.send('OLD');f.scope.clearChatHistory();const b=f.send('NEW');f.calls[0].resolve(answer('OLD_REPLY'));await a;assert.equal(f.fields['btn-chatbot-send'].disabled,true);assert.deepEqual(f.history(),[{role:'user',message:'NEW'}]);f.calls[1].resolve(answer('NEW_REPLY'));await b;assert.deepEqual(f.history(),[{role:'user',message:'NEW'},{role:'assistant',message:'NEW_REPLY'}]);assert.equal(f.timers.size,0);
});
test('late failure after clear cannot restore removed question or replace a newer draft',async()=>{
 const f=fixture(),pending=f.send('REMOVED_PRIVATE_QUESTION');f.scope.clearChatHistory();f.fields['chatbot-input'].value='NEW_DRAFT';f.calls[0].reject(Error('PRIVATE_PROVIDER_ERROR'));await pending;assert.equal(f.fields['chatbot-input'].value,'NEW_DRAFT');assert.deepEqual(f.history(),[]);assert.ok(!f.text().includes('PRIVATE_PROVIDER_ERROR'));
});
test('clear while response JSON is pending discards late parsed answer',async()=>{
 const f=fixture(),pending=f.send('PRIVATE_QUESTION');let finish;f.calls[0].raw({json:()=>new Promise(r=>finish=r)});await tick();f.scope.clearChatHistory();finish(answer('PRIVATE_PARSED_REPLY'));await pending;assert.deepEqual(f.history(),[]);assert.ok(!f.text().includes('PRIVATE_PARSED_REPLY'));
});
test('deadline covers an ignored fetch signal, retains question once, cleans history and never retries',async()=>{
 const f=fixture(),pending=f.send('RETRY_QUESTION');assert.equal(f.timers.size,1);[...f.timers.values()][0]();await pending;assert.equal(f.calls[0].options.signal.aborted,true);assert.equal(f.fields['chatbot-input'].value,'RETRY_QUESTION');assert.deepEqual(f.history(),[]);assert.equal(f.calls.length,1);assert.equal(f.fields['btn-chatbot-send'].disabled,false);f.calls[0].resolve(answer('LATE_AFTER_TIMEOUT'));await tick();assert.ok(!f.text().includes('LATE_AFTER_TIMEOUT'));assert.equal(f.timers.size,0);
});
test('logout event aborts current work, clears local personalization/draft and ignores late response',async()=>{
 const f=fixture(),pending=f.send('PRIVATE_LOGOUT_QUESTION');f.logout();f.calls[0].resolve(answer('PRIVATE_LOGOUT_REPLY'));await pending;assert.deepEqual(f.history(),[]);for(const id of ['chat-user-name','chat-user-role','chatbot-input'])assert.equal(f.fields[id].value,'');assert.ok(!f.text().includes('PRIVATE_NAME'));assert.ok(!f.text().includes('PRIVATE_LOGOUT_REPLY'));
});
test('literal hostile text stays escaped; payload excludes display name/profile and duplicate send is blocked',async()=>{
 const f=fixture(),pending=f.send('<img src=x onerror=PRIVATE_SENTINEL>');await f.scope.sendChatbotMessage();assert.equal(f.calls.length,1);const body=JSON.parse(f.calls[0].options.body);assert.deepEqual(Object.keys(body).sort(),['context','history','message']);assert.deepEqual(body.context,{targetRole:'Bán lẻ'});assert.ok(!JSON.stringify(body).includes('PRIVATE_NAME'));assert.ok(f.text().includes('&lt;img'));assert.ok(!f.text().includes('<img src=x'));f.calls[0].resolve(answer('<script>PRIVATE_SENTINEL</script>'));await pending;assert.ok(!f.text().includes('<script>PRIVATE_SENTINEL</script>'));assert.ok(f.text().includes('&lt;script&gt;'));
});
