import React, { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Clock, Plus, X, CheckCircle } from 'lucide-react';
// import { jobs } from '../data/mockData.js';

const mockJobs = [
  {
    id: 1,
    title: 'Senior UI/UX Designer for Fintech Mobile App & Web Portal',
    company: 'NovaTech Solutions',
    companyLogo: 'NT',
    companyColor: 'from-blue-500 to-blue-700',
    postedTime: 'Đăng 2 giờ trước',
    status: 'active',
    statusLabel: 'Active · 8 Proposals',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    description: 'Cần tuyển UI/UX Designer có kinh nghiệm thiết kế toàn bộ luồng thanh toán, ví điện tử và quản trị danh mục đầu tư. Xây dựng Design System chuẩn mực trên Figma, bàn giao component rõ ràng cho dev team.',
    location: 'Remote (Toàn quốc)',
    budget: '$1,200 – $1,800',
    budgetType: '/ Fixed',
    deadline: '25/10/2026',
    deadlineText: '(3 tuần)',
    categoryId: 'uiux',
    skills: ['Figma', 'Design System', 'Fintech UI', 'Mobile App'],
    applicantCount: 8
  },
  {
    id: 2,
    title: 'Brand Identity & Packaging Suite for Organic Coffee Line',
    company: 'Artisan Roasters',
    companyLogo: 'AR',
    companyColor: 'from-amber-500 to-amber-600',
    postedTime: 'Đăng 5 giờ trước',
    status: 'urgent',
    statusLabel: 'Tuyển Gấp · 14 Proposals',
    statusColor: 'bg-amber-50 text-amber-700 border-amber-100',
    description: 'Tìm kiếm designer kỳ cựu phụ trách thiết kế trọn gói bộ nhận diện thương hiệu, bao bì túi cà phê drip-bag và nhãn chai thủy tinh cold-brew cho chuỗi cà phê specialty xuất khẩu thị trường Châu Âu.',
    location: 'TP.HCM · Hybrid',
    budget: '$800 – $1,400',
    budgetType: '/ Milestone',
    deadline: '15/10/2026',
    deadlineText: '(2 tuần)',
    categoryId: 'branding',
    skills: ['Brand Identity', 'Packaging 3D', 'Illustrator', 'Print-Ready'],
    applicantCount: 14
  },
  {
    id: 3,
    title: 'Key Visual & Billboard Poster Campaign for Summer Music Fest',
    company: 'Echo Sound Entertainment',
    companyLogo: 'ES',
    companyColor: 'from-violet-500 to-violet-700',
    postedTime: 'Đăng 1 ngày trước',
    status: 'active',
    statusLabel: 'Active · 6 Proposals',
    statusColor: 'bg-blue-50 text-blue-700 border-blue-100',
    description: 'Sáng tạo bộ Key Visual chủ đề âm nhạc điện tử kết hợp ánh sáng cyberpunk cho lễ hội âm nhạc quy mô 10.000 khán giả. Yêu cầu export file chuẩn in billboard ngoài trời và màn hình LED sân khấu.',
    location: 'Hà Nội · Remote',
    budget: '$600 – $1,000',
    budgetType: '/ Fixed',
    deadline: '10/10/2026',
    deadlineText: '(10 ngày)',
    categoryId: 'poster',
    skills: ['Key Visual', 'Event Posters', 'Photoshop Art', 'LED Billboard'],
    applicantCount: 6
  },
  {
    id: 4,
    title: 'Digital Ad Creatives & Social Media Kit (Facebook & TikTok Ads)',
    company: 'GlowSkin Lab Cosmetics',
    companyLogo: 'GS',
    companyColor: 'from-pink-500 to-pink-700',
    postedTime: 'Đăng 2 ngày trước',
    status: 'reviewing',
    statusLabel: 'Đang Duyệt · 11 Proposals',
    statusColor: 'bg-rose-50 text-rose-700 border-rose-100',
    description: 'Thiết kế bộ 20 banner quảng cáo cho đợt Mega Sale 11/11, kèm 5 clip motion graphic 15s bắt trend định dạng 9:16 cho kênh TikTok Shop và Reels. Cần tối ưu tỷ lệ CTR và visual bắt mắt.',
    location: 'Remote (Toàn quốc)',
    budget: '$500 – $750',
    budgetType: '/ Campaign',
    deadline: '18/10/2026',
    deadlineText: '(1 tuần)',
    categoryId: 'ads',
    skills: ['Instagram Kits', 'Google Ads', 'TikTok Covers', 'Motion Ads'],
    applicantCount: 11
  },
  {
    id: 5,
    title: '3D Iconography & Visual Assets for Web3 Portal',
    company: 'KryptoSphere Web3',
    companyLogo: 'KS',
    companyColor: 'from-cyan-500 to-blue-600',
    postedTime: 'Đăng 3 ngày trước',
    status: 'active',
    statusLabel: 'Active · 5 Proposals',
    statusColor: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    description: 'Dựng bộ 15 icon 3D chủ đề Blockchain & DeFi theo style isometric mượt mà, kèm các file render animation lặp (Lottie / MP4 trong suốt) phục vụ ra mắt website mới.',
    location: 'Remote (Toàn cầu)',
    budget: '$1,000 – $1,600',
    budgetType: '/ Package',
    deadline: '30/10/2026',
    deadlineText: '(4 tuần)',
    categoryId: '3d',
    skills: ['Blender 3D', 'Cinema 4D', 'Lottie Animation', 'Web3'],
    applicantCount: 5
  },
  {
    id: 6,
    title: 'Menu Redesign & Digital POS Screen Display for F&B Chain',
    company: 'UrbanBites Restaurant Chain',
    companyLogo: 'UB',
    companyColor: 'from-orange-500 to-orange-600',
    postedTime: 'Đăng 4 ngày trước',
    status: 'active',
    statusLabel: 'Active · 9 Proposals',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    description: 'Thiết kế lại cuốn menu in cao cấp cho hệ thống ẩm thực Âu-Á, đồng thời thiết kế bộ layout menu động hiển thị trên màn hình LCD tại quầy order. Chỉnh sửa màu sắc ảnh món ăn bắt mắt.',
    location: 'Đà Nẵng · Remote',
    budget: '$450 – $700',
    budgetType: '/ Milestone',
    deadline: '20/10/2026',
    deadlineText: '(2 tuần)',
    categoryId: 'branding',
    skills: ['Menu Design', 'Food Retouching', 'InDesign', 'Digital Signage'],
    applicantCount: 9
  }
];

export default function JobPostingsPage() {
  const [activeStatus, setActiveStatus] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeBudget, setActiveBudget] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [jobsList, setJobsList] = useState(typeof jobs !== 'undefined' ? jobs : mockJobs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // New Job Form State
  const [formData, setFormData] = useState({
    title: '', company: 'ConnectCV Corp', categoryId: 'uiux',
    location: 'Remote', budget: '', deadline: '', description: '', skills: ''
  });

  const filteredJobs = jobsList.filter(job => {
    const matchesStatus = activeStatus === 'all' || job.status === activeStatus;
    const matchesCat = activeCategory === 'all' || job.categoryId === activeCategory;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Simple budget filter logic
    let matchesBudget = true;
    if (activeBudget !== 'all') {
      const isUnder500 = job.budget.includes('$450');
      const isOver1000 = job.budget.includes('$1,200') || job.budget.includes('$1,000');
      if (activeBudget === 'under500') matchesBudget = isUnder500;
      else if (activeBudget === 'over1000') matchesBudget = isOver1000;
      else if (activeBudget === '500-1000') matchesBudget = !isUnder500 && !isOver1000;
    }
    
    return matchesStatus && matchesCat && matchesSearch && matchesBudget;
  });

  const counts = {
    all: jobsList.length,
    active: jobsList.filter(j => j.status === 'active').length,
    urgent: jobsList.filter(j => j.status === 'urgent').length,
    reviewing: jobsList.filter(j => j.status === 'reviewing').length,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newJob = {
      id: Date.now(),
      title: formData.title,
      company: formData.company,
      companyLogo: formData.company.substring(0, 2).toUpperCase(),
      companyColor: 'from-blue-600 to-indigo-600',
      postedTime: 'Vừa đăng',
      status: 'active',
      statusLabel: 'Active · 0 Proposals',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      description: formData.description,
      location: formData.location,
      budget: `$${formData.budget}`,
      budgetType: '/ Fixed',
      deadline: formData.deadline,
      deadlineText: '(Mới)',
      categoryId: formData.categoryId,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      applicantCount: 0
    };
    
    setJobsList([newJob, ...jobsList]);
    setIsModalOpen(false);
    setFormData({title: '', company: 'ConnectCV Corp', categoryId: 'uiux', location: 'Remote', budget: '', deadline: '', description: '', skills: ''});
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div className="bg-slate-50 min-h-screen pt-6 sm:pt-8 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">Recruiter &amp; Hiring Portal</span>
              <span className="text-xs text-slate-400">&bull; Cập nhật lúc 23:50 hôm nay</span>
            </div>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Bảng Tin Đăng Tuyển Freelancer &amp; Designer</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">Quản lý các dự án thiết kế đang mở, xem xét báo giá &amp; hồ sơ ứng viên nộp vào từ cộng đồng designer hàng đầu.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Đăng Dự Án Mới
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Tin Đang Tuyển (Active)</p>
            <div className="flex items-baseline gap-2">
              <span className="font-sora text-xl sm:text-2xl font-bold text-slate-900">5</span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">+1 mới</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Đề Xuất Nhận Được</p>
            <div className="flex items-baseline gap-2">
              <span className="font-sora text-xl sm:text-2xl font-bold text-slate-900">53</span>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">8 mới hôm nay</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Ứng Viên Đã Shortlist</p>
            <div className="flex items-baseline gap-2">
              <span className="font-sora text-xl sm:text-2xl font-bold text-slate-900">12</span>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Chờ phỏng vấn</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 mb-6 gap-3 sm:gap-4">
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            {[
              { id: 'all', label: 'Tất cả tin đăng', count: counts.all, color: 'bg-blue-100 text-blue-800' },
              { id: 'active', label: 'Đang tuyển', count: counts.active, color: 'bg-emerald-50 text-emerald-700' },
              { id: 'urgent', label: 'Tuyển gấp', count: counts.urgent, color: 'bg-amber-50 text-amber-700' },
              { id: 'reviewing', label: 'Đang duyệt hồ sơ', count: counts.reviewing, color: 'bg-rose-50 text-rose-700' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveStatus(tab.id)}
                className={`px-3 sm:px-4 pb-3 text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 flex-shrink-0 ${
                  activeStatus === tab.id 
                    ? 'border-blue-600 text-blue-600 font-semibold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label} <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${tab.color}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pb-3 lg:pb-0 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-700 outline-none w-full sm:w-40 hover:border-slate-300 focus:border-blue-500"
              />
            </div>
            <select 
              value={activeCategory} 
              onChange={(e) => setActiveCategory(e.target.value)}
              className="flex-1 sm:flex-initial text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="uiux">UI/UX &amp; App</option>
              <option value="branding">Brand Identity</option>
              <option value="poster">Poster &amp; Visual</option>
              <option value="ads">Social Media</option>
              <option value="3d">3D &amp; Motion</option>
            </select>
            <select 
              value={activeBudget} 
              onChange={(e) => setActiveBudget(e.target.value)}
              className="flex-1 sm:flex-initial text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="all">Mọi mức ngân sách</option>
              <option value="under500">Dưới $500</option>
              <option value="500-1000">$500 – $1,000</option>
              <option value="over1000">Trên $1,000</option>
            </select>
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-sora font-bold text-base shadow-sm bg-gradient-to-br ${job.companyColor}`}>
                      {job.companyLogo}
                    </div>
                    <div>
                      <h4 className="font-sora font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {job.company}
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      </h4>
                      <p className="text-xs text-slate-400">{job.postedTime}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex-shrink-0 border ${job.statusColor}`}>
                    {job.statusLabel}
                  </span>
                </div>

                <h2 className="font-sora font-bold text-slate-900 text-base mb-1.5 hover:text-blue-600 transition-colors cursor-pointer">
                  {job.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {job.description}
                </p>

                <div className="bg-slate-50/80 rounded-xl p-3 mb-4 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                      <DollarSign className="w-3.5 h-3.5" />
                    </span>
                    <span>{job.budget} <span className="font-normal text-slate-400 text-[11px]">{job.budgetType}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hạn chót: <strong>{job.deadline}</strong> {job.deadlineText}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.skills.map((skill, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">{job.applicantCount} ứng viên đã nộp</span>
                </div>
                <Link to="/candidates" className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600">
                  Xem Ứng Viên
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-20 text-center text-slate-500 text-sm">
            Không tìm thấy tin đăng nào phù hợp.
          </div>
        )}

      </main>

      {/* Create Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <h2 className="font-sora font-bold text-slate-900 text-base sm:text-lg">Đăng Dự Án Mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề dự án *</label>
                <input required type="text" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Vd: Thiết kế Landing Page..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Danh mục</label>
                  <select value={formData.categoryId} onChange={e=>setFormData({...formData, categoryId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                    <option value="uiux">UI/UX & App</option>
                    <option value="branding">Brand Identity</option>
                    <option value="poster">Poster & Visual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân sách (USD) *</label>
                  <input required type="text" value={formData.budget} onChange={e=>setFormData({...formData, budget: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="500 - 1000" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa điểm</label>
                  <input type="text" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn chót</label>
                  <input type="text" value={formData.deadline} onChange={e=>setFormData({...formData, deadline: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="DD/MM/YYYY" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả công việc</label>
                <textarea rows="3" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kỹ năng (cách nhau bởi dấu phẩy)</label>
                <input type="text" value={formData.skills} onChange={e=>setFormData({...formData, skills: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Figma, UI, UX..." />
              </div>
              <div className="pt-3 sm:pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">Đăng Tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">Đăng tin thành công!</span>
        </div>
      )}

    </div>
  );
}
