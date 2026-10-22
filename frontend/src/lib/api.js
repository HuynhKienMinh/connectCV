import { auth } from './firebase';
import { productionApiBase } from '../../config/productionApi.js';
export const API_BASE=import.meta.env.PROD
 ? productionApiBase(import.meta.env.VITE_API_BASE_URL)
 : (import.meta.env.VITE_API_BASE_URL||'http://localhost:5000').replace(/\/$/,'');
function sessionChanged(){const error=new Error('Phiên tài khoản đã thay đổi. Vui lòng thử lại.');error.code='AUTH_SESSION_CHANGED';return error;}
export async function api(path,options={}){
 const owner=auth.currentUser;let token;
 try{token=await owner?.getIdToken();}
 catch(error){if(auth.currentUser!==owner)throw sessionChanged();throw error;}
 // The SDK may have switched users while obtaining a token. Do not dispatch
 // a request or surface an obsolete SDK error under the replacement session.
 if(auth.currentUser!==owner)throw sessionChanged();
 const response=await fetch(API_BASE+path,{...options,headers:{'Content-Type':'application/json',...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})}});
 const body=await response.json();
 if(!response.ok){const error=new Error(body.message||'Không thể thực hiện yêu cầu.');error.status=response.status;error.code=body.code;throw error;}return body;
}
