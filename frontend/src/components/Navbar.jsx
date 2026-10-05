import {useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {Menu,X} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
export default function Navbar(){
 const {user,logout}=useAuth(),[open,setOpen]=useState(false),location=useLocation();
 const links=[['/cv','CV & ATS'],['/interview','Phỏng vấn'],['/social','Cộng đồng'],['/chatbot','Chatbot'],['/portfolio','Hồ sơ năng lực']];
 return <><nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b shadow-sm"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4"><Link to="/" className="font-sora text-xl font-bold text-slate-900">Connect<span className="text-brand-600">CV</span></Link>
 <div className="hidden md:flex items-center gap-5">{links.map(([to,label])=><Link key={to} to={to} className={location.pathname===to?'text-brand-600 font-semibold':'text-slate-600'}>{label}</Link>)}</div>
 <div className="hidden md:flex items-center gap-3">{user?<><Link to="/account" className="text-sm">{user.displayName||'Tài khoản'}</Link><button onClick={logout} className="text-sm text-slate-500">Đăng xuất</button></>:<><Link to="/login">Đăng nhập</Link><Link to="/signup" className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-4 py-2 rounded-lg">Đăng ký</Link></>}</div>
 <button className="md:hidden" onClick={()=>setOpen(!open)} aria-label="Menu">{open?<X/>:<Menu/>}</button></div>
 {open&&<div className="md:hidden p-5 space-y-3">{[...links,[user?'/account':'/login',user?'Tài khoản':'Đăng nhập']].map(([to,label])=><Link className="block" key={to} to={to} onClick={()=>setOpen(false)}>{label}</Link>)}</div>}
 <div className="md:hidden px-4 h-11 flex gap-5 overflow-x-auto whitespace-nowrap">{links.map(([to,label])=><Link key={to} to={to} className="text-sm py-3">{label}</Link>)}</div></nav><div className="h-[108px] md:h-16"/></>;
}
