'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const http = require('node:http');
const zlib = require('node:zlib');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
// Only synthetic loopback traffic; emulator addresses prevent cloud access.
const FIXTURE = `
process.env.NODE_ENV='test';
process.env.FIREBASE_PROJECT_ID='demo-connectcv-security';
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:9';
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9';
process.env.FEATURE_STORE_BACKEND='firestore';
process.env.GEMINI_API_KEY='';process.env.GEMINI_API_KEYS='';
const {createApp}=require('./backend/app');
const app=createApp({authenticate:(req,res,next)=>{req.user={id:'synthetic-parser-check',emailVerified:true};next();}});
const server=app.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
process.on('message',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Local fixture startup timed out')), 5000);
    const onExit = () => finish(new Error('Local fixture exited before listening'));
    const onMessage = message => finish(null, message.port);
    function finish(error, port) {
      clearTimeout(timer);child.off('exit', onExit);child.off('message', onMessage);
      error ? reject(error) : resolve(port);
    }
    child.once('exit', onExit);child.once('message', onMessage);child.once('error', finish);
  });
}
async function health(port) {
  return new Promise((resolve, reject) => {
    const req = http.get({host:'127.0.0.1',port,path:'/health',agent:false}, res => {
      let body='';res.on('data', d => body += d);res.on('end', () => resolve({status:res.statusCode,body:JSON.parse(body)}));
    });
    req.setTimeout(2000, () => req.destroy(new Error('Local health timeout')));req.on('error', reject);
  });
}
async function checkParser(route, kind) {
  const child = spawn(process.execPath, ['-e', FIXTURE], {cwd:ROOT,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,NODE_ENV:'test',GEMINI_API_KEY:'',GEMINI_API_KEYS:''}});
  const exited = new Promise(resolve => child.once('exit', (code,signal) => resolve({code,signal})));
  let stderr='';child.stdout.resume();child.stderr.on('data', d => { stderr += d; });
  let socket;
  try {
    const port = await ready(child);
    const frame=zlib.gzipSync(Buffer.from(kind==='invalid-json'?'not-json':'{"synthetic":true}'));
    const first=kind==='trailing'?Buffer.concat([frame,Buffer.from([0])]):frame;
    const tail=kind==='trailing'?Buffer.alloc(100*1024,88):Buffer.alloc(0);
    let response='';socket=net.connect(port,'127.0.0.1');socket.on('error',()=>{});socket.on('data',d=>response+=d);
    await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});
    socket.write('POST '+route+' HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Encoding: gzip\r\nContent-Length: '+(first.length+tail.length)+'\r\nConnection: keep-alive\r\n\r\n');
    socket.write(first);await delay(30);if(tail.length&&!socket.destroyed)socket.write(tail);await delay(200);
    assert.equal(child.exitCode,null,'Synthetic compressed request terminated the app; decoderError='+/Z_DATA_ERROR|Unhandled .error./.test(stderr));
    assert.equal(Number(response.match(/HTTP\/1\.1 (\d+)/)?.[1]),kind==='invalid-json'?400:404);
    const live=await health(port);assert.equal(live.status,200);assert.equal(live.body.status,'OK');
  } finally {
    socket?.destroy();
    if(child.exitCode===null&&child.signalCode===null){if(child.connected)child.send({shutdown:true});await Promise.race([exited,delay(1000)]);if(child.exitCode===null&&child.signalCode===null)child.kill();}
    await exited;
  }
}
for(const [scope,route] of [['global','/api/synthetic-missing'],['feature','/api/chatbot/synthetic-missing']]){
  for(const kind of ['valid','invalid-json','trailing']){
    test(`${scope} JSON parser survives ${kind} gzip request`,{timeout:10000},()=>checkParser(route,kind));
  }
}
