'use strict';
let active=0;
async function withRenderSlot(work){
 if(active>=2)throw Object.assign(new Error('CV export capacity reached'),{status:503});
 active++;
 try{return await work();}finally{active--;}
}
module.exports={withRenderSlot};
