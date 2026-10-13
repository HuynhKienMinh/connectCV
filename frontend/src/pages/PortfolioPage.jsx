import {useEffect,useRef,useState} from 'react';
import {Link,Navigate,useParams} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {api} from '../lib/api';
import {createPortfolioLoader} from '../lib/portfolioLoader';
export default function PortfolioPage({publicView=false}){
 const {user,loading}=useAuth(),{id}=useParams(),[items,setItems]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [listBusy,setListBusy]=useState(false);
 const loader=useRef(null);
 if(!loader.current)loader.current=createPortfolioLoader({clear:()=>{setItems([]);setMessage('');},onData:setItems,onError:()=>setMessage('Không tải được hồ sơ. Hồ sơ có thể đã ẩn, không tồn tại hoặc kết nối đang lỗi.'),onBusy:setListBusy});
 const scope=(user?.uid||'visitor')+'|'+(id||'owner-list')+'|'+publicView;
 const scopeRef=useRef(scope);scopeRef.current=scope;
 const [viewScope,setViewScope]=useState(scope);
 const [form,setForm]=useState({title:'',summary:'',published:false,projects:[]});
 async function load(){return loader.current.load(async()=>{const result=await api(publicView?`/api/portfolios/public/${id}`:'/api/portfolios');return publicView?[result.portfolio]:result.portfolios;});}
 useEffect(()=>{
  setViewScope(scope);loader.current.invalidate();setForm({title:'',summary:'',published:false,projects:[]});setMessage('');setBusy(false);
  if(publicView||(!loading&&user))load();
  return ()=>loader.current.invalidate();
 },[user?.uid,id,publicView,loading]);
 if(!publicView&&!loading&&!user)return <Navigate to="/login" replace/>;
 if(viewScope!==scope)return <main className="max-w-5xl mx-auto p-6"><p role="status">Đang chuyển hồ sơ năng lực…</p></main>;
 async function save(e){e.preventDefault();setBusy(true);try{await api('/api/portfolios'+(form.id?'/'+form.id:''),{method:form.id?'PUT':'POST',body:JSON.stringify({title:form.title,summary:form.summary,published:form.published,projects:form.projects})});if(scopeRef.current!==scope)return;setForm({title:'',summary:'',published:false,projects:[]});if(await load())setMessage('Đã lưu hồ sơ năng lực.');}catch(e){if(scopeRef.current===scope)setMessage(e.message);}finally{if(scopeRef.current===scope)setBusy(false);}}
 return <main className="max-w-5xl mx-auto p-6"><h1 className="text-2xl font-bold my-6">Hồ sơ năng lực</h1><p role="status">{listBusy?'Đang tải hồ sơ năng lực…':message}</p>
 {!publicView&&<form onSubmit={save} className="p-6 bg-white rounded-2xl border space-y-4 mb-6"><label className="block">Tiêu đề<input required minLength={2} maxLength={150} className="border rounded-lg p-3 w-full block" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label className="block">Giới thiệu<textarea className="border rounded-lg p-3 w-full block" maxLength={6000} rows={4} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></label>
 {form.projects.map((p,i)=><div className="border rounded-lg p-4 space-y-2" key={i}>{['title','description','url'].map(key=><label className="block" key={key}>{{title:'Tên dự án',description:'Mô tả',url:'URL HTTPS'}[key]}<input className="border rounded p-2 w-full" type={key==='url'?'url':'text'} value={p[key]} maxLength={key==='description'?3000:key==='title'?150:500} onChange={e=>setForm({...form,projects:form.projects.map((old,j)=>j===i?{...old,[key]:e.target.value}:old)})}/></label>)}<button type="button" onClick={()=>setForm({...form,projects:form.projects.filter((_,j)=>i!==j)})}>Xóa dự án</button></div>)}
 <button type="button" disabled={form.projects.length>=30} onClick={()=>setForm({...form,projects:[...form.projects,{title:'',description:'',url:''}]})}>+ Thêm dự án</button><label className="block"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Công khai hồ sơ này (người có liên kết có thể xem)</label><button disabled={busy||listBusy||!user?.emailVerified} className="bg-brand-600 text-white px-5 py-3 rounded-lg">{busy?'Đang lưu…':'Lưu hồ sơ'}</button>{!user?.emailVerified&&<Link to="/account" className="ml-4 text-brand-600">Xác minh email trước khi lưu</Link>}</form>}
 <div className="grid md:grid-cols-2 gap-6">{items.map(item=><article key={item.id} className="p-6 bg-white rounded-2xl border"><h2 className="text-xl font-bold">{item.title}</h2><p className="whitespace-pre-wrap my-4">{item.summary}</p>{item.projects.map((p,i)=><div className="border-t py-3" key={i}><h3 className="font-semibold">{p.title}</h3><p className="whitespace-pre-wrap">{p.description}</p>{p.url&&<a href={p.url} rel="noopener noreferrer" target="_blank" className="text-brand-600">Xem dự án</a>}</div>)}{!publicView&&<div className="flex flex-wrap gap-4 mt-4"><button disabled={busy||listBusy} onClick={()=>setForm(item)}>Chỉnh sửa</button><button disabled={busy||listBusy} onClick={async()=>{if(!window.confirm('Xóa hồ sơ năng lực này?'))return;try{await api('/api/portfolios/'+item.id,{method:'DELETE'});if(scopeRef.current===scope)await load();}catch(e){if(scopeRef.current===scope)setMessage(e.message);}}}>Xóa</button>{item.published&&<Link to={'/portfolio/'+item.id} className="text-brand-600">Liên kết công khai</Link>}</div>}</article>)}</div></main>;
}
