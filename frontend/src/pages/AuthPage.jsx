import {useState} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,updateProfile,GoogleAuthProvider,signInWithPopup} from 'firebase/auth';
import {auth} from '../lib/firebase';
import {useAuth} from '../context/AuthContext';
export default function AuthPage({mode='login'}){
 const {user}=useAuth(),navigate=useNavigate();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 if(user&&mode==='login')return <Navigate to="/account" replace/>;
 async function googleSignIn(){if(busy)return;setBusy(true);setMessage('');try{
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 await signInWithPopup(auth,provider);navigate('/account');
 }catch(error){
 const messages={'auth/popup-blocked':'Trình duyệt đang chặn cửa sổ đăng nhập. Cho phép popup cho ConnectCV rồi thử lại.','auth/popup-closed-by-user':'Bạn đã đóng cửa sổ Google. Có thể bấm lại để tiếp tục.','auth/cancelled-popup-request':'Yêu cầu đăng nhập trước đã bị hủy. Vui lòng thử lại.','auth/account-exists-with-different-credential':'Email này đã có tài khoản với phương thức khác. Hãy đăng nhập bằng phương thức đã đăng ký.','auth/network-request-failed':'Không kết nối được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.'};
 setMessage(messages[error.code]||'Không thể đăng nhập Google lúc này. Vui lòng thử lại sau.');
 }finally{setBusy(false);}}
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{
 if(mode==='reset'){await sendPasswordResetEmail(auth,email);setMessage('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');}
 else if(mode==='signup'){const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:name.trim()});await sendEmailVerification(result.user);navigate('/account');}
 else{await signInWithEmailAndPassword(auth,email,password);navigate('/account');}
 }catch{setMessage('Không thể hoàn tất. Kiểm tra thông tin hoặc thử lại sau.');}finally{setBusy(false);}}
 return <main className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border shadow-sm"><h1 className="text-2xl font-bold mb-6">{mode==='signup'?'Tạo tài khoản':mode==='reset'?'Đặt lại mật khẩu':'Đăng nhập'}</h1>
 {mode!=='reset'&&<><button type="button" onClick={googleSignIn} disabled={busy} className="w-full flex items-center justify-center gap-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
 <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.93A6 6 0 0 1 6.1 12c0-.67.12-1.32.32-1.93V7.48H3.08A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.52l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.92 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"/></svg>
 Tiếp tục với Google</button><div className="flex items-center gap-3 my-6 text-xs text-slate-500"><span className="h-px bg-slate-200 flex-1"/>hoặc với tài khoản cá nhân<span className="h-px bg-slate-200 flex-1"/></div></>}
 <form onSubmit={submit} className="space-y-4">
 {mode==='signup'&&<label className="block">Họ tên<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete="name"/></label>}
 <label className="block">Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete="email"/></label>
 {mode!=='reset'&&<label className="block">Mật khẩu<input required type="password" minLength={mode==='signup'?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete={mode==='signup'?'new-password':'current-password'}/>{mode==='signup'&&<small>Tối thiểu 12 ký tự.</small>}</label>}
 <button disabled={busy} className="w-full bg-brand-600 text-white p-3 rounded-lg disabled:opacity-50">{busy?'Đang xử lý…':'Tiếp tục'}</button><p role="status">{message}</p></form>
 <div className="flex flex-wrap gap-4 mt-6 text-brand-600"><Link to="/login">Đăng nhập</Link><Link to="/signup">Đăng ký</Link><Link to="/reset-password">Quên mật khẩu</Link></div></main>;
}
