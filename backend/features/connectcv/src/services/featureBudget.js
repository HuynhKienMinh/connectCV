 'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
class FeatureBudget{
 constructor(file,limit=100){this.file=file;this.limit=limit;this.queue=Promise.resolve();this.records=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};}
 consume(userId){const run=this.queue.then(async()=>{
  const day=new Date().toISOString().slice(0,10),id=crypto.createHash('sha256').update(userId).digest('hex');
  const draft=Object.fromEntries(Object.entries(this.records).filter(([,v])=>v.day===day));
  const row=draft[id]||{day,count:0};if(row.count>=this.limit)throw Object.assign(new Error('Daily feature budget reached'),{status:429});
  if(Object.keys(draft).length>=10000&&!draft[id])throw Object.assign(new Error('Budget store capacity reached'),{status:503});
  row.count++;draft[id]=row;await fs.promises.mkdir(path.dirname(this.file),{recursive:true});
  const tmp=this.file+'.'+crypto.randomUUID()+'.tmp';
  try{await fs.promises.writeFile(tmp,JSON.stringify(draft),{mode:0o600});await fs.promises.rename(tmp,this.file);}catch(e){await fs.promises.unlink(tmp).catch(()=>{});throw e;}
  this.records=draft;
 });this.queue=run.catch(()=>{});return run;}
}
let instance;
function consumeFeatureBudget(userId){
 if(process.env.FEATURE_STORE_BACKEND==='firestore')return require('../../../../src/services/accountStore').store().consume(userId);
 if(process.env.NODE_ENV==='production'&&(!process.env.FEATURE_STATE_DIR||process.env.FEATURE_SINGLE_PROCESS!=='true'))throw Object.assign(new Error('Configure durable feature storage and single-process mode'),{status:503});
 if(!instance)instance=new FeatureBudget(path.resolve(process.env.FEATURE_STATE_DIR||path.resolve(__dirname,'../../data'),'feature-budget.json'));
 return instance.consume(userId);
}
module.exports={FeatureBudget,consumeFeatureBudget};
