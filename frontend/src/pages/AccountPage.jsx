import {useEffect,useState} from 'react';
import {Navigate} from 'react-router-dom';
import {sendEmailVerification} from 'firebase/auth';
import {useAuth} from '../context/AuthContext';
import {api} from '../lib/api';
export default function AccountPage(){
 const {user,loading,logout}=useAuth(),[profile,setProfile]=useState({}),[credits,setCredits]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(user)api('/api/account/me').then(r=>{setProfile({fullName:user.displayName||'',email:user.email||'',...r.profile});setCredits(r.credits);}).catch(e=>setMessage(e.message));},[user?.uid]);
 if(loading)return <p className="p-8">Đang kiểm tra tài khoản…</p>;if(!user)return <Navigate to="/login" replace/>;
 async function run(action){setBusy(true);try{await action();setMessage('Đã hoàn tất.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 const labels={fullName:'Họ tên',phone:'Điện thoại',email:'Email liên hệ',address:'Địa chỉ',targetRole:'Vị trí mong muốn',dateOfBirth:'Ngày sinh'};
 return <main className="max-w-3xl mx-auto my-8 p-8 bg-white border rounded-2xl"><h1 className="text-2xl font-bold">Tài khoản & hồ sơ</h1><p className="mt-3">{user.email} · {credits===null?'Đang tải số dư':`${credits} credits`}</p>
 {!user.emailVerified&&<div className="p-4 bg-amber-50 my-4"><p>Vui lòng xác minh email trước khi dùng AI hoặc chia sẻ.</p><button disabled={busy} onClick={()=>run(()=>sendEmailVerification(user))}>Gửi email xác minh</button><button className="ml-4" onClick={()=>run(async()=>{await user.reload();await user.getIdToken(true);window.location.reload();})}>Tôi đã xác minh</button></div>}
 <form className="space-y-4 mt-6" onSubmit={e=>{e.preventDefault();const saved={...profile,skills:(profile.skills||[]).map(s=>s.trim()).filter(Boolean)};run(()=>api('/api/account/profile',{method:'PUT',body:JSON.stringify(saved)}));}}>
 {Object.entries(labels).map(([key,label])=><label key={key} className="block">{label}<input value={profile[key]||''} maxLength={key==='address'?300:150} onChange={e=>setProfile({...profile,[key]:e.target.value})} className="block w-full border rounded-lg p-3"/></label>)}
 <label className="block">Giới thiệu<textarea value={profile.summary||''} maxLength={6000} onChange={e=>setProfile({...profile,summary:e.target.value})} className="block w-full border rounded-lg p-3" rows={5}/></label>
 <label className="block">Kỹ năng (mỗi dòng một kỹ năng)<textarea value={(profile.skills||[]).join('\n')} onChange={e=>setProfile({...profile,skills:e.target.value.split('\n')})} className="block w-full border rounded-lg p-3"/></label>
 <button disabled={busy} className="bg-brand-600 text-white px-5 py-3 rounded-lg">Lưu hồ sơ</button></form><p className="my-4" role="status">{message}</p>
 <button disabled={busy} onClick={()=>run(async()=>{await api('/api/account/logout-all',{method:'POST',body:'{}'});await logout();})}>Đăng xuất tất cả thiết bị</button><button className="ml-6" onClick={logout}>Đăng xuất</button></main>;
}
