'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.FIREBASE_PROJECT_ID='demo-connectcv-upload';
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:9';process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9';
process.env.FEATURE_STORE_BACKEND='firestore';process.env.GEMINI_API_KEY='';process.env.GEMINI_API_KEYS='';
const {createApp}=require('../app');
let server,base;
const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,16,0x4a,0x46,0x49,0x46,0,1]);
test.before(async()=>{
 const app=createApp({authenticate:(req,res,next)=>{if(req.headers['x-local-fixture']!=='synthetic')return res.status(401).json({success:false});req.user={id:'synthetic-upload',emailVerified:true};next();}});
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
function form({bytes=jpeg,mime='image/jpeg',filename='synthetic.jpg',field=false,second=false,empty=false}={}){
 const body=new FormData();if(!empty)body.append('avatar',new Blob([bytes],{type:mime}),filename);
 if(field)body.append('unexpected','synthetic');if(second)body.append('avatar',new Blob([jpeg],{type:'image/jpeg'}),'synthetic-second.jpg');return body;
}
async function send(body,authenticated=true){return fetch(base+'/api/upload/avatar',{method:'POST',headers:authenticated?{'x-local-fixture':'synthetic'}:{},body});}
test('anonymous avatar request is denied before upload parsing',async()=>{assert.equal((await send(form(),false)).status,401);});
test('synthetic image retains its exact bytes and MIME in the response',async()=>{const r=await send(form());assert.equal(r.status,200);const b=await r.json();assert.equal(b.dataUrl,'data:image/jpeg;base64,'+jpeg.toString('base64'));assert.equal(b.size,jpeg.length);assert.equal(b.type,'image/jpeg');});
for(const [name,options] of [
 ['unsupported MIME',{mime:'application/octet-stream'}],
 ['unsupported extension',{filename:'synthetic.exe'}],
 ['mismatched content signature',{bytes:Buffer.from('synthetic-not-an-image')}],
 ['missing file',{empty:true}],
 ['oversized file',{bytes:Buffer.concat([jpeg,Buffer.alloc(3*1024*1024+1)])}],
 ['extra form field',{field:true}],
 ['second file',{second:true}]
])test('upload rejects '+name+' and remains responsive',async()=>{const r=await send(form(options));assert.equal(r.status,400);const h=await fetch(base+'/health');assert.equal(h.status,200);assert.equal((await h.json()).status,'OK');});
