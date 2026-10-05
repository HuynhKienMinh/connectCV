import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Plus, ChevronDown, ChevronRight, ChevronLeft, Star, CheckCircle, Briefcase } from 'lucide-react';
import { candidates } from '../data/mockData.js'; // Using local mock if needed

const mockCandidates = [
  {
    id: 1,
    name: "Nguyễn Minh Tuấn",
    location: "Hà Nội, Việt Nam",
    status: "Shortlisted",
    role: "Senior UI/UX Designer | Figma, React, TypeScript | 4 years exp.",
    rating: 5.0,
    reviews: 18,
    appliedFor: "NovaTech",
    matchScore: 92,
    skills: [
      { name: "React", color: "bg-blue-50 text-blue-700" },
      { name: "TypeScript", color: "bg-blue-50 text-blue-700" },
      { name: "UI/UX", color: "bg-violet-50 text-violet-700" },
      { name: "Figma", color: "bg-pink-50 text-pink-700" }
    ],
    bio: "I design intuitive digital experiences for web and mobile products. Passionate about user-centered design and building scalable design systems with a strong eye for detail.",
    exp: "4 years experience",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenMinhTuan&backgroundColor=b6e3f4",
    avatarBg: "bg-sky-100",
    statusBadge: "bg-amber-50 text-amber-700"
  },
  {
    id: 2,
    name: "Trần Thị Hà",
    location: "TP.HCM, Việt Nam",
    status: "Interview",
    role: "Graphic Designer | Adobe Suite, Figma | 3 years exp.",
    rating: 4.9,
    reviews: 24,
    appliedFor: "PixelWorks",
    matchScore: 87,
    skills: [
      { name: "Figma", color: "bg-pink-50 text-pink-700" },
      { name: "Adobe XD", color: "bg-orange-50 text-orange-700" },
      { name: "Illustrator", color: "bg-rose-50 text-rose-700" },
      { name: "Photoshop", color: "bg-slate-100 text-slate-600" }
    ],
    bio: "Graphic designer with a passion for visual storytelling. I create compelling brand identities, social media content and marketing materials that make brands stand out.",
    exp: "3 years experience",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TranThiHa&backgroundColor=ffd5dc",
    avatarBg: "bg-pink-100",
    statusBadge: "bg-brand-50 text-brand-700 text-blue-700"
  },
  {
    id: 3,
    name: "Lê Quang Huy",
    location: "Đà Nẵng, Việt Nam",
    status: "Applied",
    role: "Frontend Developer | React, Next.js, Tailwind CSS | 2 years exp.",
    rating: 4.8,
    reviews: 11,
    appliedFor: "BrightPath",
    matchScore: 81,
    skills: [
      { name: "React", color: "bg-blue-50 text-blue-700" },
      { name: "Next.js", color: "bg-green-50 text-green-700" },
      { name: "Tailwind", color: "bg-teal-50 text-teal-700" },
      { name: "TypeScript", color: "bg-slate-100 text-slate-600" }
    ],
    bio: "Frontend developer who loves clean code and pixel-perfect UI. I build performant web apps with React and Next.js and have a strong eye for design-to-code translation.",
    exp: "2 years experience",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LeQuangHuy&backgroundColor=c0aede",
    avatarBg: "bg-violet-100",
    statusBadge: "bg-slate-100 text-slate-600"
  },
  {
    id: 4,
    name: "Phạm Ngọc Anh",
    location: "Hà Nội, Việt Nam",
    status: "Applied",
    role: "Product Designer | UI/UX, Prototyping, Research | 6 years exp.",
    rating: 4.7,
    reviews: 36,
    appliedFor: "NextGen",
    matchScore: 76,
    skills: [
      { name: "UI/UX", color: "bg-violet-50 text-violet-700" },
      { name: "Figma", color: "bg-pink-50 text-pink-700" },
      { name: "Prototyping", color: "bg-indigo-50 text-indigo-700" },
      { name: "User Research", color: "bg-sky-50 text-sky-700" }
    ],
    bio: "Senior product designer with 6 years of experience crafting digital products for startups and enterprise clients. Expert at design systems, user flows and cross-functional collaboration.",
    exp: "6 years experience",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PhamNgocAnh&backgroundColor=d1fae5",
    avatarBg: "bg-emerald-100",
    statusBadge: "bg-slate-100 text-slate-600"
  },
  {
    id: 5,
    name: "Võ Thành Long",
    location: "Cần Thơ, Việt Nam",
    status: "Rejected",
    role: "AI Research | Python, ML, Data Science | 1 year exp.",
    rating: 4.3,
    reviews: 5,
    appliedFor: "BrightPath",
    matchScore: 63,
    skills: [
      { name: "Python", color: "bg-amber-50 text-amber-700" },
      { name: "SQL", color: "bg-slate-100 text-slate-600" },
      { name: "ML", color: "bg-emerald-50 text-emerald-700" },
      { name: "TensorFlow", color: "bg-sky-50 text-sky-700" }
    ],
    bio: "Junior AI researcher with a background in machine learning and data analysis. Looking to apply ML models to real-world problems and contribute to innovative AI products.",
    exp: "1 year experience",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VoThanhLong&backgroundColor=fde68a",
    avatarBg: "bg-amber-100",
    statusBadge: "bg-red-50 text-red-600"
  },
  {
    id: 6,
    name: "Nguyễn Thanh Tâm",
    location: "TP.HCM, Việt Nam",
    status: "Shortlisted",
    role: "Motion Designer | After Effects, Lottie, 3D | 5 years exp.",
    rating: 5.0,
    reviews: 42,
    appliedFor: "PixelWorks",
    matchScore: 89,
    skills: [
      { name: "After Effects", color: "bg-purple-50 text-purple-700" },
      { name: "Lottie", color: "bg-blue-50 text-blue-700" },
      { name: "Cinema 4D", color: "bg-indigo-50 text-indigo-700" },
      { name: "Premiere", color: "bg-slate-100 text-slate-600" }
    ],
    bio: "Motion designer specialized in UI animations, explainer videos, and micro-interactions for web and mobile apps. I bring interfaces to life with purpose and style.",
    exp: "5 years experience",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenThanhTam&backgroundColor=e9d5ff",
    avatarBg: "bg-purple-100",
    statusBadge: "bg-amber-50 text-amber-700"
  }
];

export default function CandidatesPage() {
  const [jobFilter, setJobFilter] = useState("All Jobs");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortFilter, setSortFilter] = useState("Best Match");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCandidates = mockCandidates.filter(c => {
    if (statusFilter !== "All Status" && c.status !== statusFilter) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.role.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen font-inter">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
        
        {/* Header & Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-4">
            <div>
              <h1 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Candidates</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Find the best talent for your team.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select 
                value={jobFilter} onChange={e => setJobFilter(e.target.value)}
                className="flex-1 sm:flex-initial text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer hover:border-blue-300 transition-colors"
              >
                <option>All Jobs</option>
                <option>Senior UI/UX Designer</option>
                <option>Frontend Developer</option>
              </select>
              <select 
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-initial text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer hover:border-blue-300 transition-colors"
              >
                <option>All Status</option>
                <option>Shortlisted</option>
                <option>Interview</option>
                <option>Applied</option>
                <option>Rejected</option>
              </select>
              <select 
                value={sortFilter} onChange={e => setSortFilter(e.target.value)}
                className="w-full sm:w-auto text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer hover:border-blue-300 transition-colors"
              >
                <option>Best Match</option>
                <option>Most Recent</option>
                <option>Highest Score</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:max-w-sm flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search by name, skill, or keyword..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-slate-700 placeholder-slate-400 outline-none w-full" 
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-500"><span className="font-semibold text-slate-800">{filteredCandidates.length}</span> candidates found</p>
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredCandidates.map(candidate => (
            <div key={candidate.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex items-center sm:items-start gap-3 sm:gap-0 sm:flex-shrink-0">
                  <img src={candidate.avatar} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ${candidate.avatarBg}`} alt={candidate.name} />
                  <div className="sm:hidden flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-sora font-bold text-slate-900 text-sm">{candidate.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${candidate.statusBadge}`}>
                        {candidate.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{candidate.location}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="hidden sm:flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-sora font-bold text-slate-900 text-sm">{candidate.name}</h3>
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs text-slate-400">{candidate.location}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${candidate.statusBadge}`}>
                      {candidate.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 truncate">{candidate.role}</p>
                  
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {candidate.rating} ({candidate.reviews})
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">Applied: {candidate.appliedFor}</span>
                    <span className="text-slate-300">·</span>
                    <span className={`flex items-center gap-1 font-bold ${candidate.matchScore >= 80 ? 'text-emerald-600' : candidate.matchScore >= 70 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {candidate.matchScore >= 80 && <CheckCircle className="w-3 h-3" />}
                      {candidate.matchScore}% match
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {candidate.skills.map((skill, idx) => (
                      <span key={idx} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${skill.color}`}>
                        {skill.name}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                    {candidate.bio}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-xs text-slate-400">{candidate.exp}</span>
                    <Link to="/job/1" className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-95 bg-gradient-to-r from-blue-600 to-indigo-600">
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white border border-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-white bg-blue-600">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium text-slate-600 hover:bg-white border border-slate-200 transition-colors">2</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium text-slate-600 hover:bg-white border border-slate-200 transition-colors">3</button>
          <span className="text-xs text-slate-400 px-1">…</span>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium text-slate-600 hover:bg-white border border-slate-200 transition-colors">8</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white border border-slate-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
