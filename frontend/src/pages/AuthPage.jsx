import {useState,useEffect} from 'react';
import {Link,Navigate,useNavigate,useLocation} from 'react-router-dom';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,updateProfile,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult} from 'firebase/auth';
import {auth} from '../lib/firebase';
import {useAuth} from '../context/AuthContext';
import {authFailure} from '../lib/authFlow';
import {GOOGLE_LOGIN_URL,googleBrowserFlow,redirectStorageAvailable,googleAuthFailure,recoverGoogleRedirect} from '../lib/googleAuthFlow';
export default function AuthPage({mode='login'}){
 const {user}=useAuth(),navigate=useNavigate(),location=useLocation();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [copied,setCopied]=useState(false);
 const googleFlow=googleBrowserFlow({userAgent:navigator.userAgent,hostname:window.location.hostname,standalone:navigator.standalone||window.matchMedia('(display-mode: standalone)').matches});
 useEffect(()=>{setPassword('');setMessage(location.state?.notice||'');if(location.state?.email)setEmail(location.state.email);},[mode,location.key]);
 useEffect(()=>{
  if(mode==='reset'||googleFlow!=='redirect')return;
  let active=true;
  recoverGoogleRedirect(auth,getRedirectResult).then(result=>{if(active&&result?.user&&auth.currentUser?.uid===result.user.uid)navigate('/account',{replace:true});})
   .catch(error=>{if(active)setMessage(googleAuthFailure(error.code));});
  return ()=>{active=false;};
 },[mode,googleFlow,navigate]);
 async function copyLoginUrl(){try{await navigator.clipboard.writeText(GOOGLE_LOGIN_URL);setCopied(true);}catch{setMessage('Hãy nhấn giữ đường dẫn bên dưới, sao chép và dán vào Safari hoặc Chrome.');}}
 function nextStep(path){return {pathname:path};}
 if(user&&mode==='login')return <Navigate to="/account" replace/>;
 async function googleSignIn(){if(busy)return;
 if(googleFlow==='external-browser'){setMessage('Bạn đang dùng trình duyệt trong Zalo hoặc ứng dụng khác. Chọn menu ⋯ rồi Mở bằng trình duyệt, hoặc sao chép đường dẫn bên dưới và dán vào Safari/Chrome để đăng nhập Google.');return;}
 if(googleFlow==='handoff'){window.location.assign(GOOGLE_LOGIN_URL);return;}
 if(googleFlow==='redirect'&&!redirectStorageAvailable(()=>window.sessionStorage)){setMessage(googleAuthFailure('auth/web-storage-unsupported'));return;}
 setBusy(true);setMessage('');try{
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 if(googleFlow==='redirect'){await signInWithRedirect(auth,provider);return;}
 await signInWithPopup(auth,provider);navigate('/account');
 }catch(error){
 setMessage(googleAuthFailure(error.code));
 }finally{setBusy(false);}}
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{
 const enteredEmail=email.trim();
 if(mode==='reset'){await sendPasswordResetEmail(auth,enteredEmail);setMessage('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');}
 else if(mode==='signup'){const result=await createUserWithEmailAndPassword(auth,enteredEmail,password);await updateProfile(result.user,{displayName:name.trim()});await sendEmailVerification(result.user);navigate('/account');}
 else{await signInWithEmailAndPassword(auth,enteredEmail,password);navigate('/account');}
 }catch(error){const failure=authFailure(error.code,mode);setPassword('');
 if(failure.next)navigate('/'+failure.next,{state:{email:email.trim(),notice:failure.message}});else setMessage(failure.message);
 }finally{setBusy(false);}}
 return <main className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border shadow-sm"><h1 className="text-2xl font-bold mb-6">{mode==='signup'?'Tạo tài khoản':mode==='reset'?'Đặt lại mật khẩu':'Đăng nhập'}</h1>
 {mode!=='reset'&&<aside className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800" aria-label="Đăng nhập trên điện thoại">
 <p>{googleFlow==='external-browser'?'Đang mở trong Zalo hoặc ứng dụng khác? Chọn menu ⋯ → Mở bằng trình duyệt (Safari/Chrome) trước khi đăng nhập Google.':googleFlow==='handoff'?'Đăng nhập Google trên điện thoại sẽ chuyển sang trang ConnectCV tương thích. Tại đó, bấm Tiếp tục với Google một lần nữa.':googleFlow==='redirect'?'Bấm Tiếp tục với Google để đăng nhập. Bạn sẽ quay lại ConnectCV trong trình duyệt này.':'Nếu mở từ Zalo, hãy dùng menu ⋯ → Mở bằng trình duyệt để đăng nhập trên Safari/Chrome.'}</p>
 <a href={GOOGLE_LOGIN_URL} className="mt-2 block break-all text-blue-700 underline">{GOOGLE_LOGIN_URL}</a>
 <button type="button" onClick={copyLoginUrl} className="mt-2 rounded-lg border border-blue-300 px-3 py-2 font-semibold text-blue-800">{copied?'Đã sao chép đường dẫn':'Sao chép đường dẫn'}</button>
 <span role="status" aria-live="polite" className="sr-only">{copied?'Đã sao chép đường dẫn đăng nhập. Mở Safari hoặc Chrome và dán đường dẫn.':''}</span>
 </aside>}
 {mode!=='reset'&&<><button type="button" onClick={googleSignIn} disabled={busy} className="w-full flex items-center justify-center gap-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
 <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.93A6 6 0 0 1 6.1 12c0-.67.12-1.32.32-1.93V7.48H3.08A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.52l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.92 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"/></svg>
 Tiếp tục với Google</button><div className="flex items-center gap-3 my-6 text-xs text-slate-500"><span className="h-px bg-slate-200 flex-1"/>hoặc với tài khoản cá nhân<span className="h-px bg-slate-200 flex-1"/></div></>}
 {message&&<div role="status" aria-live="polite" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800"><p>{message}</p>{mode==='signup'&&<div className="flex flex-wrap gap-4 mt-3 font-semibold text-blue-700"><Link to={nextStep('/login')} state={{email}}>Đã có tài khoản? Đăng nhập</Link><Link to={nextStep('/reset-password')} state={{email}}>Quên mật khẩu</Link></div>}</div>}
 <form onSubmit={submit} className="space-y-4">
 {mode==='signup'&&<label className="block">Họ tên<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete="name"/></label>}
 <label className="block">Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete="email"/></label>
 {mode!=='reset'&&<label className="block">Mật khẩu<input required type="password" minLength={mode==='signup'?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete={mode==='signup'?'new-password':'current-password'}/>{mode==='signup'&&<small>Tối thiểu 12 ký tự.</small>}</label>}
 <button disabled={busy} className="w-full bg-brand-600 text-white p-3 rounded-lg disabled:opacity-50">{busy?'Đang xử lý…':mode==='signup'?'Tạo tài khoản':mode==='reset'?'Gửi hướng dẫn':'Đăng nhập'}</button></form>
 <div className="flex flex-wrap gap-4 mt-6 text-brand-600"><Link to="/login" state={{email}}>Đăng nhập</Link><Link to="/signup" state={{email}}>Đăng ký</Link><Link to="/reset-password" state={{email}}>Quên mật khẩu</Link></div></main>;
}
