import {useEffect,useRef} from 'react';
import {Navigate,Link} from 'react-router-dom';
import {auth} from '../lib/firebase';
import {API_BASE} from '../lib/api';
import {useAuth} from '../context/AuthContext';
export default function FeaturePage({module='cv'}){
 const {user,loading}=useAuth(),frame=useRef(null);
 useEffect(()=>{const origin=new URL(API_BASE).origin;
 async function receive(e){if(e.origin!==origin||e.source!==frame.current?.contentWindow||e.data?.type!=='connectcv:token-request'||!/^[a-z0-9-]{16,80}$/i.test(e.data.requestId||''))return;
 let token=null;try{token=await auth.currentUser?.getIdToken();}catch{}e.source.postMessage({type:'connectcv:token-response',requestId:e.data.requestId,token},origin);}
 window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 if(loading)return <p className="p-8">Đang kiểm tra phiên đăng nhập…</p>;
 if(!user)return <Navigate to="/login" replace/>;
 if(!user.emailVerified)return <main className="p-8">Bạn cần xác minh email để sử dụng AI. <Link className="text-brand-600" to="/account">Mở tài khoản</Link></main>;
 return <iframe ref={frame} title={`ConnectCV ${module}`} src={`${API_BASE}/ai/?module=${encodeURIComponent(module)}`} className="w-full border-0 h-[calc(100dvh-108px)] md:h-[calc(100dvh-64px)]" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups" allow="microphone"/>;
}
