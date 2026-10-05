const {test}=require('node:test'),assert=require('node:assert/strict');
const {createRequireAuth,requireVerified}=require('../src/middlewares/firebaseAuth');
const {AccountStore}=require('../src/services/accountStore');
const {FirestoreCommunity}=require('../src/services/firestoreCommunity');
class TestDB{
 constructor(){this.records=new Map();this.queue=Promise.resolve();}
 collection(name){return {doc:(id='generated')=>this.ref(name+'/'+id)};}
 ref(path){return {path,id:path.split('/').at(-1),collection:name=>({doc:id=>this.ref(path+'/'+name+'/'+id)}),update:async value=>{this.records.set(path,{...this.records.get(path),...value});}};}
 runTransaction(fn){const run=this.queue.then(async()=>{const draft=new Map([...this.records].map(([k,v])=>[k,structuredClone(v)]));const tx={get:async ref=>({exists:draft.has(ref.path),data:()=>draft.get(ref.path)}),create:(ref,data)=>{assert(!draft.has(ref.path));draft.set(ref.path,data);},update:(ref,data)=>{assert(draft.has(ref.path));draft.set(ref.path,{...draft.get(ref.path),...data});},delete:ref=>draft.delete(ref.path)};const result=await fn(tx);this.records=draft;return result;});this.queue=run.catch(()=>{});return run;}
}
async function authCheck(verify,header){let status=0,next=false;const req={headers:{authorization:header},body:{userId:'forged',admin:true}};const res={status(n){status=n;return this;},json(){return this;}};await createRequireAuth(verify)(req,res,()=>next=true);return {status,next,req};}
test('identity comes only from verified Firebase token; revocation check enabled',async()=>{const result=await authCheck(async(token,revoked)=>{assert.equal(revoked,true);return {uid:'real',aud:'connect-cv',email_verified:true};},'Bearer '+'x'.repeat(30));assert(result.next);assert.equal(result.req.user.id,'real');assert.equal(result.req.user.role,'candidate');});
test('missing, malformed, wrong project and revoked tokens fail closed',async()=>{
 assert.equal((await authCheck(()=>{throw Error();},'')).status,401);
 assert.equal((await authCheck(()=>{throw Error();},'Bearer short')).status,401);
 assert.equal((await authCheck(async()=>({uid:'x',aud:'other'}),'Bearer '+'x'.repeat(30))).status,401);
 assert.equal((await authCheck(async()=>{throw Error('revoked');},'Bearer '+'x'.repeat(30))).status,401);
});
test('unverified email cannot enter AI or public write paths',()=>{let status;requireVerified({user:{emailVerified:false}},{status(n){status=n;return this;},json(){}},()=>assert.fail());assert.equal(status,403);});
test('concurrent account initialization grants 15 credits once',async()=>{const db=new TestDB(),store=new AccountStore(db);await Promise.all(Array.from({length:12},()=>store.ensure({id:'user'})));assert.equal(db.records.size,1);assert.equal(db.records.get('accounts/user').credits,15);});
test('profile persistence never modifies another account or balance',async()=>{const db=new TestDB(),store=new AccountStore(db);await store.ensure({id:'a'});await store.ensure({id:'b'});await store.saveProfile({id:'a'},{fullName:'TEST'});assert.deepEqual(db.records.get('accounts/b').profile,{});assert.equal(db.records.get('accounts/a').credits,15);});
test('daily quota is durable and concurrent overspending is rejected',async()=>{const db=new TestDB(),store=new AccountStore(db);await store.ensure({id:'a'});const runs=await Promise.allSettled(Array.from({length:110},()=>store.consume('a')));assert.equal(runs.filter(r=>r.status==='fulfilled').length,100);await assert.rejects(new AccountStore(db).consume('a'),e=>e.status===429);});
test('insufficient credits do not change daily quota or ledger',async()=>{const db=new TestDB(),store=new AccountStore(db);await store.ensure({id:'a'});await assert.rejects(store.consume('a',16),e=>e.status===402);assert.equal(db.records.get('accounts/a').dailyCount,0);assert.equal(db.records.size,1);});
test('duplicate community submission awards exactly 5 once and persists cooldown',async()=>{const db=new TestDB(),store=new AccountStore(db);await store.ensure({id:'a'});const posts=new FirestoreCommunity(db);const runs=await Promise.allSettled(Array.from({length:10},()=>posts.submit({id:'a'},{reviewText:'TEST'},'hash')));assert.equal(runs.filter(r=>r.status==='fulfilled').length,1);assert.equal(db.records.get('accounts/a').credits,20);assert.equal([...db.records.keys()].filter(k=>k.startsWith('creditEvents/')).length,1);await assert.rejects(new FirestoreCommunity(db).submit({id:'a'},{reviewText:'OTHER'},'different'),e=>e.status===429);});
test('likes use authenticated UID; retries cannot drive count negative',async()=>{const db=new TestDB(),store=new AccountStore(db);await store.ensure({id:'a'});const posts=new FirestoreCommunity(db),result=await posts.submit({id:'a'},{reviewText:'TEST'},'hash');assert.equal((await posts.like({id:'b'},result.debriefId)).likesCount,1);assert.equal((await posts.like({id:'b'},result.debriefId)).likesCount,0);await assert.rejects(posts.like({id:'b'},'../../accounts/a'),e=>e.status===400);});
