 'use strict';
const PRIVATE=/^(fullName|fullname|email|phone|address|birth|dob|gender|avatar.*|photo.*|password|token|apiKey|secret|linkedin|github|website)$/i;
function redact(value,depth=0){
 if(depth>8)return undefined;
 if(Array.isArray(value))return value.map(v=>redact(v,depth+1));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!PRIVATE.test(k)&&!(depth===0&&['name','references'].includes(k))&&!['__proto__','constructor','prototype'].includes(k)).map(([k,v])=>[k,redact(v,depth+1)]));
 return value;
}
function planningProfile(value){if(typeof value==='string'){try{value=JSON.parse(value);}catch{return '';}}return JSON.stringify(redact(value||{}));}
module.exports={redact,planningProfile};
