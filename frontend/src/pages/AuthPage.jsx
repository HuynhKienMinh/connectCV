import {useState} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,updateProfile} from 'firebase/auth';
import {auth} from '../lib/firebase';
import {useAuth} from '../context/AuthContext';
export default function AuthPage({mode='login'}){
 const {user}=useAuth(),navigate=useNavigate();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 if(user&&mode==='login')return <Navigate to="/account" replace/>;
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{
 if(mode==='reset'){await sendPasswordResetEmail(auth,email);setMessage('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');}
 else if(mode==='signup'){const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:name.trim()});await sendEmailVerification(result.user);navigate('/account');}
 else{await signInWithEmailAndPassword(auth,email,password);navigate('/account');}
 }catch{setMessage('Không thể hoàn tất. Kiểm tra thông tin hoặc thử lại sau.');}finally{setBusy(false);}}
 return <main className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border shadow-sm"><h1 className="text-2xl font-bold mb-6">{mode==='signup'?'Tạo tài khoản':mode==='reset'?'Đặt lại mật khẩu':'Đăng nhập'}</h1><form onSubmit={submit} className="space-y-4">
 {mode==='signup'&&<label className="block">Họ tên<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete="name"/></label>}
 <label className="block">Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete="email"/></label>
 {mode!=='reset'&&<label className="block">Mật khẩu<input required type="password" minLength={mode==='signup'?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border rounded-lg p-3" autoComplete={mode==='signup'?'new-password':'current-password'}/>{mode==='signup'&&<small>Tối thiểu 12 ký tự.</small>}</label>}
 <button disabled={busy} className="w-full bg-brand-600 text-white p-3 rounded-lg disabled:opacity-50">{busy?'Đang xử lý…':'Tiếp tục'}</button><p role="status">{message}</p></form>
 <div className="flex flex-wrap gap-4 mt-6 text-brand-600"><Link to="/login">Đăng nhập</Link><Link to="/signup">Đăng ký</Link><Link to="/reset-password">Quên mật khẩu</Link></div></main>;
}
