// Each request belongs to one account/public-resource scope. Late results cannot
// restore a previous user's documents or a failed public view.
export function createPortfolioLoader({clear,onData,onError,onBusy}){
 let generation=0;
 function invalidate(){generation++;clear();onBusy(false);}
 async function load(fetchData){
  const current=++generation;clear();onBusy(true);
  try{const data=await fetchData();if(current!==generation)return false;onData(data);return true;}
  catch(error){if(current===generation){clear();onError(error);}return false;}
  finally{if(current===generation)onBusy(false);}
 }
 return {load,invalidate};
}
