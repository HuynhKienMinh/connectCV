import {useEffect,useRef,useState} from 'react';
import {Navigate} from 'react-router-dom';
import {sendEmailVerification} from 'firebase/auth';
import {useAuth} from '../context/AuthContext';
import {api} from '../lib/api';
import {createPortfolioLoader} from '../lib/portfolioLoader';
export default function AccountPage(){
 const {user,loading,logout}=useAuth(),[profile,setProfile]=useState({}),[credits,setCredits]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[version,setVersion]=useState(null),[conflict,setConflict]=useState(false);
 const uid=user?.uid||'',userRef=useRef(user),scopeRef=useRef(uid),[viewUid,setViewUid]=useState(uid);userRef.current=user;scopeRef.current=uid;
 const loader=useRef(null);
 if(!loader.current)loader.current=createPortfolioLoader({clear:()=>{setReady(false);setProfile({});setVersion(null);setCredits(null);},onBusy:()=>{},onError:()=>setMessage('Không tải được hồ sơ. Vui lòng kiểm tra kết nối rồi thử lại.'),onData:r=>{
  setProfile({fullName:userRef.current?.displayName||'',email:userRef.current?.email||'',...r.profile});setCredits(r.credits);setVersion(r.profileVersion||null);setReady(!!r.profileVersion);setConflict(false);
  if(!r.profileVersion)setMessage('Hãy tải lại trang để nhận phiên bản hồ sơ trước khi lưu.');
 }});
 useEffect(()=>{setViewUid(uid);loader.current.invalidate();setMessage('');setConflict(false);setBusy(false);if(user)loader.current.load(()=>api('/api/account/me'));return ()=>loader.current.invalidate();},[uid]);
 if(loading)return <p className="p-8">Đang kiểm tra tài khoản…</p>;if(!user)return <Navigate to="/login" replace/>;
 if(viewUid!==uid)return <p className="p-8">Đang chuyển tài khoản…</p>;
 async function run(action){setBusy(true);try{await action();if(scopeRef.current===uid)setMessage('Đã hoàn tất.');}catch(e){if(scopeRef.current===uid){if(e.code==='PROFILE_CONFLICT'||e.code==='PROFILE_VERSION_REQUIRED')setConflict(true);setMessage(e.message);}}finally{if(scopeRef.current===uid)setBusy(false);}}
 function downloadDraft(){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'}));link.href=url;link.download='connectcv-profile-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function reloadProfile(){
  if(!window.confirm('Nạp hồ sơ mới sẽ thay nội dung đang nhập. Hãy tải bản nháp dự phòng trước nếu muốn giữ. Tiếp tục?'))return;
  setBusy(true);const before=profile;
  try{const r=await api('/api/account/me');if(scopeRef.current!==uid)return;if(!r.profileVersion)throw Error('Không nhận được phiên bản hồ sơ. Hãy tải lại trang.');setProfile(r.profile||{});setVersion(r.profileVersion);setCredits(r.credits);setConflict(false);setReady(true);setMessage('Đã nạp hồ sơ mới. Bạn có thể chỉnh sửa và lưu tiếp.');}
  catch(e){if(scopeRef.current===uid){setProfile(before);setMessage(e.message);}}finally{if(scopeRef.current===uid)setBusy(false);}
 }
 const labels={fullName:'Họ tên',phone:'Điện thoại',email:'Email liên hệ',address:'Địa chỉ',targetRole:'Vị trí mong muốn',dateOfBirth:'Ngày sinh'};
 return <main className="max-w-3xl mx-auto my-8 p-8 bg-white border rounded-2xl"><h1 className="text-2xl font-bold">Tài khoản & hồ sơ</h1><p className="mt-3">{user.email} · {credits===null?'Đang tải số dư':`${credits} credits`}</p>
 {!user.emailVerified&&<div className="p-4 bg-amber-50 my-4"><p>Vui lòng xác minh email trước khi dùng AI hoặc chia sẻ.</p><button disabled={busy} onClick={()=>run(()=>sendEmailVerification(user))}>Gửi email xác minh</button><button className="ml-4" onClick={()=>run(async()=>{await user.reload();await user.getIdToken(true);window.location.reload();})}>Tôi đã xác minh</button></div>}
 {conflict&&<div role="alert" className="p-4 bg-amber-50 border rounded-xl my-4"><p>Hồ sơ trên tài khoản đã thay đổi. Bản nháp đang nhập vẫn được giữ; chưa ghi đè. Tải bản nháp trước khi nạp dữ liệu mới.</p><button disabled={busy} className="border rounded-lg px-3 py-2 mr-3" onClick={downloadDraft}>Tải bản nháp dự phòng</button><button disabled={busy} className="border rounded-lg px-3 py-2" onClick={reloadProfile}>Nạp hồ sơ mới từ tài khoản</button></div>}
 <form className="space-y-4 mt-6" onSubmit={e=>{e.preventDefault();if(!ready||conflict||busy)return;const saved={...profile,skills:(profile.skills||[]).map(s=>s.trim()).filter(Boolean)};run(async()=>{const r=await api('/api/account/profile',{method:'PUT',headers:{'If-Match':version},body:JSON.stringify(saved)});if(scopeRef.current===uid){setVersion(r.profileVersion);setProfile(r.profile);}});}}>
 {Object.entries(labels).map(([key,label])=><label key={key} className="block">{label}<input disabled={busy||!ready} value={profile[key]||''} maxLength={key==='address'?300:key==='email'?254:key==='phone'?40:key==='dateOfBirth'?40:150} onChange={e=>setProfile({...profile,[key]:e.target.value})} className="block w-full border rounded-lg p-3"/></label>)}
 <label className="block">Giới thiệu<textarea disabled={busy||!ready} value={profile.summary||''} maxLength={6000} onChange={e=>setProfile({...profile,summary:e.target.value})} className="block w-full border rounded-lg p-3" rows={5}/></label>
 <label className="block">Kỹ năng (mỗi dòng một kỹ năng)<textarea disabled={busy||!ready} value={(profile.skills||[]).join('\n')} onChange={e=>setProfile({...profile,skills:e.target.value.split('\n')})} className="block w-full border rounded-lg p-3"/></label>
 <button disabled={busy||!ready||conflict} className="bg-brand-600 text-white px-5 py-3 rounded-lg">Lưu hồ sơ</button></form><p className="my-4" role="status">{message}</p>
 <button disabled={busy} onClick={()=>run(async()=>{await api('/api/account/logout-all',{method:'POST',body:'{}'});await logout();})}>Đăng xuất tất cả thiết bị</button><button className="ml-6" onClick={logout}>Đăng xuất</button></main>;
}
