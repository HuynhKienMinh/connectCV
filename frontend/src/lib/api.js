import { auth } from './firebase';
export const API_BASE=(import.meta.env.VITE_API_BASE_URL||'http://localhost:5000').replace(/\/$/,'');
export async function api(path,options={}){
 const token=await auth.currentUser?.getIdToken();
 const response=await fetch(API_BASE+path,{...options,headers:{'Content-Type':'application/json',...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})}});
 const body=await response.json();
 if(!response.ok)throw new Error(body.message||'Không thể thực hiện yêu cầu.');return body;
}
