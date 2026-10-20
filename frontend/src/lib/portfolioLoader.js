// Each request belongs to one account/public-resource scope. Late results cannot
// restore a previous user's documents or a failed public view.
export function createPortfolioLoader({clear,onData,onError,onBusy,timeoutMs=60000}){
 let generation=0,pending=null;
 function cancel(){const previous=pending;pending=null;previous?.controller.abort();}
 function invalidate(){generation++;cancel();clear();onBusy(false);}
 async function load(fetchData){
  const current=++generation;cancel();
  const operation={controller:new AbortController()};pending=operation;
  const owns=()=>current===generation&&pending===operation;
  clear();onBusy(true);let timer,onAbort;
  try{
   const cancelled=new Promise((_,reject)=>{onAbort=()=>reject(new Error('PORTFOLIO_READ_CANCELLED'));operation.controller.signal.addEventListener('abort',onAbort,{once:true});});
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('PORTFOLIO_READ_TIMEOUT'));operation.controller.abort();},timeoutMs);});
   const data=await Promise.race([fetchData(operation.controller.signal),cancelled,deadline]);
   if(!owns())return false;onData(data);return true;
  }
  catch(error){if(owns()){clear();onError(error);}return false;}
  finally{
   clearTimeout(timer);operation.controller.signal.removeEventListener('abort',onAbort);
   if(owns()){pending=null;onBusy(false);}
  }
 }
 return {load,invalidate};
}
