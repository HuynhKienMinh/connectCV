import {Routes,Route,Link} from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import Footer from './components/Footer';
import AuthPage from './pages/AuthPage';
import FeaturePage from './pages/FeaturePage';
import AccountPage from './pages/AccountPage';
import PortfolioPage from './pages/PortfolioPage';
export default function App(){return <div className="min-h-screen bg-slate-50 text-slate-800"><Navbar/><Routes>
 <Route path="/" element={<><HomePage/><Footer/></>}/><Route path="/login" element={<AuthPage/>}/><Route path="/signup" element={<AuthPage mode="signup"/>}/><Route path="/reset-password" element={<AuthPage mode="reset"/>}/><Route path="/account" element={<AccountPage/>}/>
 {['cv','interview','chatbot','social'].map(module=><Route key={module} path={'/'+module} element={<FeaturePage module={module}/>}/>)}
 <Route path="/portfolio" element={<PortfolioPage/>}/><Route path="/portfolio/:id" element={<PortfolioPage publicView/>}/>
 <Route path="*" element={<main className="p-8">Trang này chưa được tích hợp vào bản độc lập. <Link to="/cv" className="text-brand-600">Mở CV & ATS</Link></main>}/>
 </Routes></div>;}
