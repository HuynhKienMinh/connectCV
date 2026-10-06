'use strict';
// One write at a time; a slow response cannot overwrite a newer edit.
(function(root){
 function createProfileAutosave({write,status=()=>{},delay=1200,setTimer=setTimeout,clearTimer=clearTimeout}){
  let latest='',saved='',timer=null,running=null,disposed=false;
  function schedule(ms=delay){clearTimer(timer);timer=setTimer(()=>{timer=null;flush();},ms);}
  async function flush(){
   clearTimer(timer);timer=null;
   if(disposed)return;
   if(running){await running;return latest!==saved?flush():undefined;}
   if(!latest||latest===saved)return;
   const payload=latest;status('saving');
   let failed=false;
   running=(async()=>{try{await write(JSON.parse(payload));saved=payload;status(latest===saved?'saved':'pending');}
    catch(error){failed=true;status('error',error);if(error.retryable&&!disposed)schedule(Math.max(3000,Math.min(60000,error.retryAfter||5000)));}
   })();
   await running;running=null;
   if(!disposed&&!failed&&latest!==saved)return flush();
  }
  return {seed(profile){saved=JSON.stringify(profile);if(!latest)latest=saved;},change(profile){latest=JSON.stringify(profile);if(latest!==saved){status('pending');schedule();}},flush,dispose(){disposed=true;clearTimer(timer);}};
 }
 if(typeof module==='object'&&module.exports)module.exports={createProfileAutosave};
 else root.createProfileAutosave=createProfileAutosave;
})(typeof window==='undefined'?{}:window);
