import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPortfolioLoader} from '../src/lib/portfolioLoader.js';
function fixture(options={}){let items=[],error='',busy=false;const loader=createPortfolioLoader({clear:()=>items=[],onData:data=>items=data,onError:e=>error=e.message,onBusy:value=>busy=value,...options});return {loader,state:()=>({items,error,busy})};}
test('late owner-A results cannot replace owner-B documents',async()=>{
 const f=fixture();let finishA;const a=f.loader.load(()=>new Promise(r=>finishA=r));f.loader.invalidate();
 assert.equal(await f.loader.load(async()=>['B']),true);finishA(['A private']);assert.equal(await a,false);assert.deepEqual(f.state().items,['B']);
});
test('a failed public request removes previous content, including when an older success arrives later',async()=>{
 const f=fixture();await f.loader.load(async()=>['published']);let finishOld;const old=f.loader.load(()=>new Promise(r=>finishOld=r));
 assert.equal(await f.loader.load(async()=>{throw Error('hidden');}),false);finishOld(['old public']);await old;
 assert.deepEqual(f.state(),{items:[],error:'hidden',busy:false});
});
test('unmount or sign-out invalidates pending completion and loading state',async()=>{
 const f=fixture();let finish;const pending=f.loader.load(()=>new Promise(r=>finish=r));assert.equal(f.state().busy,true);f.loader.invalidate();finish(['private']);await pending;
 assert.deepEqual(f.state().items,[]);assert.equal(f.state().busy,false);
});

test('deadline settles an abort-ignoring read, clears content and never retries',async()=>{
 const f=fixture({timeoutMs:10});let finish,signal,calls=0;
 const pending=f.loader.load(s=>{signal=s;calls++;return new Promise(r=>finish=r);});
 assert.equal(await pending,false);assert.equal(signal.aborted,true);assert.deepEqual(f.state(),{items:[],error:'PORTFOLIO_READ_TIMEOUT',busy:false});
 finish(['late private content']);await Promise.resolve();assert.deepEqual(f.state().items,[]);assert.equal(calls,1);
});

test('late timed-out data cannot replace or release an active retry',async()=>{
 const f=fixture({timeoutMs:20});let finishOld,finishNew;
 const old=f.loader.load(()=>new Promise(r=>finishOld=r));assert.equal(await old,false);
 const retry=f.loader.load(()=>new Promise(r=>finishNew=r));finishOld(['obsolete']);await Promise.resolve();
 assert.equal(f.state().busy,true);assert.deepEqual(f.state().items,[]);finishNew(['current']);assert.equal(await retry,true);assert.deepEqual(f.state().items,['current']);
});

test('invalidation promptly settles a pending read that ignores abort without exposing an error',async()=>{
 const f=fixture();let signal;
 const pending=f.loader.load(s=>{signal=s;return new Promise(()=>{});});f.loader.invalidate();
 assert.equal(await pending,false);assert.equal(signal.aborted,true);assert.deepEqual(f.state(),{items:[],error:'',busy:false});
});

test('successful reads clear their deadline rather than aborting after completion',async()=>{
 const f=fixture({timeoutMs:5});let signal;
 assert.equal(await f.loader.load(async s=>{signal=s;return ['current'];}),true);
 await new Promise(r=>setTimeout(r,15));assert.equal(signal.aborted,false);assert.deepEqual(f.state(),{items:['current'],error:'',busy:false});
});
