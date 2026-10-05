import {Link} from 'react-router-dom';
export default function Footer(){return <footer className="bg-dark text-slate-400"><div className="max-w-7xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-8">
 <div><Link to="/" className="font-sora font-bold text-white text-xl">Connect<span className="text-brand-400">CV</span></Link><p className="mt-3 text-sm">Công cụ AI hỗ trợ chuẩn bị CV, luyện phỏng vấn và xây dựng hồ sơ năng lực.</p></div>
 <div><p className="font-semibold text-white mb-3">Công cụ</p><div className="flex flex-col gap-2">{[['cv','CV & ATS'],['interview','Phỏng vấn'],['social','Cộng đồng'],['chatbot','Chatbot'],['portfolio','Hồ sơ năng lực']].map(([path,label])=><Link key={path} to={'/'+path}>{label}</Link>)}</div></div>
 <div className="flex flex-col gap-3"><Link to="/help">Hướng dẫn bản thử nghiệm</Link><Link to="/privacy">Dữ liệu và quyền riêng tư</Link><Link to="/account">Quản lý tài khoản</Link><p className="text-xs mt-4">© {new Date().getFullYear()} ConnectCV</p></div>
 </div></footer>}
