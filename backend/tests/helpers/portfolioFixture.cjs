'use strict';
const assert=require('node:assert/strict');
class PortfolioTestDB{
 constructor(){this.records=new Map();this.queue=Promise.resolve();this.counter=0;}
 snapshot(path){return {id:path.split('/').at(-1),exists:this.records.has(path),data:()=>structuredClone(this.records.get(path))};}
 collection(name){
  const query=(filter=null,max=Infinity)=>({where:(key,operator,value)=>{assert.equal(operator,'==');return query(v=>v[key]===value,max);},limit:n=>query(filter,n),get:async()=>({docs:[...this.records.keys()].filter(p=>p.startsWith(name+'/')&&p.split('/').length===2&&(!filter||filter(this.records.get(p)))).slice(0,max).map(p=>this.snapshot(p))})});
  return {...query(),doc:(id='fixture-'+(++this.counter))=>this.ref(name+'/'+id)};
 }
 ref(path){return {path,id:path.split('/').at(-1),get:async()=>this.snapshot(path)};}
 runTransaction(fn){const run=this.queue.then(async()=>{const draft=new Map([...this.records].map(([k,v])=>[k,structuredClone(v)]));const tx={get:async ref=>({exists:draft.has(ref.path),data:()=>structuredClone(draft.get(ref.path))}),create:(ref,v)=>{assert.ok(!draft.has(ref.path));draft.set(ref.path,structuredClone(v));},update:(ref,v)=>{assert.ok(draft.has(ref.path));draft.set(ref.path,{...draft.get(ref.path),...structuredClone(v)});},delete:ref=>draft.delete(ref.path)};const result=await fn(tx);this.records=draft;return result;});this.queue=run.catch(()=>{});return run;}
}
function fixtureRouter(db){return require('../../src/routes/portfolios').createPortfolioRouter({database:()=>db,authenticate:(req,res,next)=>{const id=req.headers['x-fixture-actor'];if(!['A','B'].includes(id))return res.status(401).json({success:false});req.user={id,emailVerified:true};next();},ensureAccount:async user=>{if(!db.records.has('accounts/'+user.id))db.records.set('accounts/'+user.id,{portfolioCount:0});}});}
module.exports={PortfolioTestDB,fixtureRouter};
