import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPortfolioLoader} from '../src/lib/portfolioLoader.js';
function fixture(){let items=[],error='',busy=false;const loader=createPortfolioLoader({clear:()=>items=[],onData:data=>items=data,onError:e=>error=e.message,onBusy:value=>busy=value});return {loader,state:()=>({items,error,busy})};}
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
