'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const dir = path.join(__dirname, '../src/services');
const PRIVATE = 'PRIVATE_PERSON_SENTINEL private-person@example.invalid 0900000123 confidential career conversation';
function source(name) {
  return process.env.AI_DIAGNOSTIC_BASELINE === '1'
    ? execFileSync('git', ['show', `HEAD:backend/features/connectcv/src/services/${name}.js`], {encoding:'utf8'})
    : fs.readFileSync(path.join(dir, `${name}.js`), 'utf8');
}
function fixture({fail, keyCount=1, fileFailure=false, timeout=false}={}) {
  const logs=[], calls=[], alerts=[], timers=new Set();
  const modules={};
  const env={NODE_ENV:'production', GEMINI_API_KEYS:Array.from({length:keyCount}, (_,i)=>`synthetic-key-${i}`).join(',')};
  function load(name) {
    if(modules[name])return modules[name];
    const module={exports:{}};
    const context={module,exports:module.exports,__dirname:dir,Buffer,Date,
      process:{env,on(){}},
      console:Object.fromEntries(['log','warn','error'].map(level=>[level,(...args)=>logs.push([level,...args].join(' '))])),
      setTimeout(fn,ms){const t=setTimeout(fn,timeout?0:ms);timers.add(t);return t;},
      clearTimeout(t){timers.delete(t);clearTimeout(t);},
      require(id){
        if(id.startsWith('./'))return load(id.slice(2));
        if(id==='path')return path;
        if(id==='fs')return {existsSync:()=>fileFailure,readFileSync(){throw Error(PRIVATE);},writeFileSync(){throw Error(PRIVATE);}};
        if(id==='https')return {request(){throw Error('Network forbidden in diagnostic fixture');}};
        if(id==='dotenv')return {config(){}};
        if(id==='@google/generative-ai')return {GoogleGenerativeAI:class {
          constructor(key){this.key=key;}
          getGenerativeModel(options){return {generateContent:async prompt=>{
            calls.push({key:this.key,model:options.model,prompt});
            const failure=fail?.(calls.length, this.key, options.model);
            if(failure)throw failure;
            if(timeout)return new Promise(()=>{});
            return {response:{text:()=>'{"reply":"Synthetic career advice"}'}};
          }};}
        }};
        throw Error(`Unexpected fixture import: ${id}`);
      }
    };
    vm.runInNewContext(source(name), context, {filename:`${name}.js`});
    modules[name]=module.exports;
    return module.exports;
  }
  const km=load('keyManager');
  km.sendTelegramAlert=message=>alerts.push(message); // No actual external alert, regardless of host env.
  const service=load('geminiService');
  return {logs,calls,alerts,km,service,timers,load,env};
}
function privateError(status) {return Object.assign(Error(PRIVATE), status?{status}:{});}
function assertPrivateAbsent(value) {
  const text=typeof value==='string'?value:JSON.stringify(value);
  for(const sentinel of ['PRIVATE_PERSON_SENTINEL','private-person@example.invalid','0900000123','confidential career conversation'])assert.ok(!text.includes(sentinel), 'Private provider content reached diagnostics');
}

test('JSON and text fallback diagnostics omit private provider bodies and custom model labels', async()=>{
  for(const method of ['callGeminiJSON','callGeminiText']){
    const f=fixture({fail:()=>privateError(500)});
    await assert.rejects(f.service[method](PRIVATE, PRIVATE));
    assert.equal(f.calls.length,3); // custom preferred + the two existing fallback models
    assertPrivateAbsent(f.logs);
    assert.ok(f.logs.some(line=>line.includes('AI_UPSTREAM_UNAVAILABLE')));
    assert.equal(f.timers.size,0);
  }
});

test('rate limit exhausts model chain then switches key and retains only fixed lastError category', async()=>{
  const f=fixture({keyCount:2,fail:n=>n<=2?privateError(429):null});
  const result=await f.service.callGeminiJSON(PRIVATE);
  assert.equal(result.reply,'Synthetic career advice');
  assert.equal(f.calls.length,3);
  assert.equal(f.calls[0].key,f.calls[1].key);
  assert.notEqual(f.calls[1].key,f.calls[2].key);
  const stats=f.km.getHealthStats();
  assert.equal(stats.coolingCount,1);
  assert.equal(stats.keys.find(k=>k.status==='COOLING_DOWN').lastError,'AI_RATE_LIMIT');
  assert.equal(stats.keys.reduce((n,k)=>n+k.totalSuccess,0),1);
  assertPrivateAbsent([f.logs,stats,f.alerts]);
});

test('auth rejection revokes key immediately, preserves failover and excludes exception content from health', async()=>{
  const f=fixture({keyCount:2,fail:n=>n===1?privateError(403):null});
  await f.service.callGeminiText(PRIVATE);
  assert.equal(f.calls.length,2);
  assert.equal(f.calls[0].model,f.calls[1].model);
  const stats=f.km.getHealthStats();
  assert.equal(stats.revokedCount,1);
  assert.equal(stats.keys.find(k=>k.status==='REVOKED').lastError,'AI_AUTH_OR_REQUEST_REJECTED');
  assertPrivateAbsent([f.logs,stats,f.alerts]);
});

test('three-key retry exhaustion has generic final error and category-only retained health', async()=>{
  const f=fixture({keyCount:3,fail:()=>privateError(429)});
  let caught;
  try{await f.service.callGeminiJSON(PRIVATE);}catch(e){caught=e;}
  assert.ok(caught);
  assert.equal(f.calls.length,6);
  assert.match(caught.message,/3/);
  assert.match(caught.message,/AI_RATE_LIMIT/);
  assert.equal(f.km.getHealthStats().coolingCount,3);
  assertPrivateAbsent([caught.message,f.logs,f.km.getHealthStats(),f.alerts]);
});

test('unknown errors remain fallback compatible but their message is never retained as key diagnostic', async()=>{
  const f=fixture({fail:n=>n===1?privateError():null});
  await f.service.callGeminiJSON(PRIVATE);
  assert.equal(f.calls.length,2);
  assert.equal(f.km.getHealthStats().activeCount,1);
  assertPrivateAbsent(f.logs);
  f.km.markError(f.km.keys[0].id,privateError());
  assert.equal(f.km.getHealthStats().keys[0].lastError,'AI_PROVIDER_ERROR');
});

test('provider deadline logs fixed category, clears timers and does not echo custom model label', async()=>{
  const f=fixture({timeout:true});
  let caught;
  try{await f.service.callGeminiJSON(PRIVATE,PRIVATE);}catch(e){caught=e;}
  assert.equal(caught.code,'AI_TIMEOUT');
  assert.equal(f.calls.length,3);
  assert.equal(f.timers.size,0);
  assertPrivateAbsent([f.logs,caught.message]);
});

test('key storage read/write diagnostics exclude file exception text', ()=>{
  const f=fixture({fileFailure:true});
  f.env.NODE_ENV='development';
  f.km.reloadKeys();
  f.km.persistKeysToDisk();
  assertPrivateAbsent(f.logs);
  assert.ok(f.logs.some(line=>line.includes('KEY_STORAGE_READ_FAILED')));
  assert.ok(f.logs.some(line=>line.includes('KEY_STORAGE_WRITE_FAILED')));
});

test('diagnostic taxonomy only accepts fixed status/code values without reading exception message', ()=>{
  const f=fixture(),code=f.load('securityError').providerErrorCode;
  assert.equal(typeof code,'function');
  const e={status:'500',code:PRIVATE,get message(){throw Error('Message must not be inspected');}};
  assert.equal(code(e),'AI_PROVIDER_ERROR');
  for(const [error,expected] of [[{status:429},'AI_RATE_LIMIT'],[{response:{status:503}},'AI_UPSTREAM_UNAVAILABLE'],[{status:401},'AI_AUTH_OR_REQUEST_REJECTED'],[{code:'ECONNRESET'},'AI_NETWORK_ERROR'],[{status:504},'AI_TIMEOUT'],[{name:'AbortError'},'AI_CANCELLED'],[null,'AI_PROVIDER_ERROR']])assert.equal(code(error),expected);
});
