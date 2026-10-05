import React, { useState, useEffect } from 'react';
import { Search, Heart, X, MessageCircle, Navigation } from 'lucide-react';
// import { artworks } from '../data/mockData.js';

// Fallback mock data in case import fails
const mockArtworks = [
  {
    id: 1,
    title: 'Neon Cyberpunk Music Festival Key Visual 2026',
    categoryId: 'poster',
    categoryName: 'Poster & Key Visual',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=700&auto=format&fit=crop&q=80',
    desc: 'Dự án Key Visual chủ đề âm nhạc điện tử và ánh sáng cyberpunk cho lễ hội âm nhạc quy mô 10.000 người. Kết hợp giữa kỹ thuật 3D Cinema4D và digital painting trên Photoshop.',
    designer: {
      name: 'Linh Trần',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=140&h=140&fit=crop&crop=face',
      title: 'Poster & Key Visual Designer',
      location: 'Hà Nội, Việt Nam',
      rating: '5.0 (28 đánh giá)',
      tag: 'Top Rated',
      completedJobs: '128 dự án',
      matchRate: '95% match',
      startingRate: '$80 · 2 ngày'
    },
    likes: '342',
    views: '2.4k'
  },
  {
    id: 2,
    title: 'Artisan Coffee Roasters Organic Packaging Suite',
    categoryId: 'packaging',
    categoryName: 'Bao Bì & Packaging',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&auto=format&fit=crop&q=80',
    desc: 'Trọn bộ bao bì túi cà phê giấy kraft mộc, tem dán nhãn chai cold-brew và hộp quà Tết 2026. Thiết kế phong cách tối giản thanh lịch, tôn vinh hạt cà phê mộc Tây Nguyên.',
    designer: {
      name: 'Quỳnh Anh',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=140&h=140&fit=crop&crop=face',
      title: 'Brand Identity & Packaging Specialist',
      location: 'TP.HCM, Việt Nam',
      rating: '5.0 (42 đánh giá)',
      tag: 'Pro Verified',
      completedJobs: '63 dự án',
      matchRate: '97% match',
      startingRate: '$150 · 3 ngày'
    },
    likes: '512',
    views: '3.8k'
  },
  {
    id: 3,
    title: 'NovaPay — Next-Gen Fintech & Crypto Wallet UI',
    categoryId: 'uiux',
    categoryName: 'UI/UX & Mobile App',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80',
    desc: 'Giao diện ứng dụng tài chính ngân hàng số tích hợp ví Web3 trên iOS. Tối giản, micro-interactions mượt mà và hệ thống Dark Theme với độ tương phản cao đạt chuẩn WCAG.',
    designer: {
      name: 'Nguyễn Minh Tuấn',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenMinhTuan&backgroundColor=b6e3f4',
      title: 'Senior UI/UX Designer',
      location: 'Hà Nội, Việt Nam',
      rating: '5.0 (18 đánh giá)',
      tag: 'Shortlisted',
      completedJobs: '92% match',
      matchRate: 'Senior Level',
      startingRate: '$120 · 4 năm exp'
    },
    likes: '890',
    views: '5.1k'
  },
  {
    id: 4,
    title: 'Isometric 3D Blockchain City & Hologram Assets',
    categoryId: '3d',
    categoryName: '3D & Motion Graphic',
    image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=700&auto=format&fit=crop&q=80',
    desc: 'Mô hình 3D thành phố thông minh Web3 kết hợp hiệu ứng neon phát quang. Dựng trên Blender 4.2 và render Cycles mượt mà, sẵn sàng tích hợp dạng Lottie 3D.',
    designer: {
      name: 'Tuấn Anh',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=140&h=140&fit=crop&crop=face',
      title: '3D Artist & Minimalist Visualist',
      location: 'Cần Thơ, Việt Nam',
      rating: '5.0 (68 đánh giá)',
      tag: 'Top Agency',
      completedJobs: '155 dự án',
      matchRate: '98% match',
      startingRate: '$120 · 2 ngày'
    },
    likes: '740',
    views: '4.6k'
  },
  {
    id: 5,
    title: 'Aura Skincare — Monogram & Minimalist Brand System',
    categoryId: 'branding',
    categoryName: 'Brand Identity & Logo',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=700&auto=format&fit=crop&q=80',
    desc: 'Hệ thống nhận diện thương hiệu cho mỹ phẩm dưỡng da thuần chay. Thiết kế logo monogram tinh tế, phong cách typographic hiện đại và quy chuẩn bảng màu pastel thanh lịch.',
    designer: {
      name: 'Quỳnh Anh',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=140&h=140&fit=crop&crop=face',
      title: 'Brand Identity Specialist',
      location: 'TP.HCM, Việt Nam',
      rating: '5.0 (42 đánh giá)',
      tag: 'Pro Verified',
      completedJobs: '63 dự án',
      matchRate: '97% match',
      startingRate: '$150 · 3 ngày'
    },
    likes: '428',
    views: '2.9k'
  },
  {
    id: 6,
    title: 'GlowSkin Summer Promo Campaign Assets',
    categoryId: 'ads',
    categoryName: 'Social Media & Ads',
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=700&auto=format&fit=crop&q=80',
    desc: 'Gói thiết kế 20 visual quảng cáo chuyển đổi cao cho chiến dịch mùa hè. Đạt tỉ lệ CTR 4.8% trong đợt thử nghiệm A/B testing trên Facebook Ads & TikTok Shop.',
    designer: {
      name: 'Phương Ly',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=140&h=140&fit=crop&crop=face',
      title: 'Social Creative & Content Producer',
      location: 'TP.HCM, Việt Nam',
      rating: '4.9 (56 đánh giá)',
      tag: 'Trending',
      completedJobs: '211 dự án',
      matchRate: '89% match',
      startingRate: '$95 · 2 ngày'
    },
    likes: '619',
    views: '3.5k'
  },
  {
    id: 7,
    title: 'Swiss Style Typographic Exhibition Poster',
    categoryId: 'poster',
    categoryName: 'Poster & Key Visual',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80',
    desc: 'Thiết kế áp phích triển lãm phong cách Quốc tế Thụy Sĩ (Swiss Style) với hệ thống lưới grid chặt chẽ, font chữ Helvetica Neue và sự tương phản thị giác mạnh mẽ.',
    designer: {
      name: 'Vinh Nguyễn',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&h=140&fit=crop&crop=face',
      title: 'Digital Ad & Banner Designer',
      location: 'Đà Nẵng, Việt Nam',
      rating: '4.9 (34 đánh giá)',
      tag: 'Top Rated',
      completedJobs: '94 dự án',
      matchRate: '91% match',
      startingRate: '$65 · 1 ngày'
    },
    likes: '388',
    views: '1.9k'
  },
  {
    id: 8,
    title: 'Matte Titanium Earbuds 3D Commercial Render',
    categoryId: '3d',
    categoryName: '3D & Motion Graphic',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80',
    desc: 'Ảnh render thương mại cho dòng tai nghe chống ồn không dây cao cấp. Render studio ánh sáng softbox chân thực với chất liệu kim loại nhám và nhựa mờ.',
    designer: {
      name: 'Tuấn Anh',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=140&h=140&fit=crop&crop=face',
      title: '3D Artist & Minimalist Visualist',
      location: 'Cần Thơ, Việt Nam',
      rating: '5.0 (68 đánh giá)',
      tag: 'Top Agency',
      completedJobs: '155 dự án',
      matchRate: '98% match',
      startingRate: '$120 · 2 ngày'
    },
    likes: '674',
    views: '4.1k'
  }
];

const categories = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'poster', label: 'Poster & Key Visual' },
  { id: 'branding', label: 'Brand Identity & Logo' },
  { id: 'uiux', label: 'UI/UX & Mobile App' },
  { id: '3d', label: '3D & Motion Graphic' },
  { id: 'packaging', label: 'Bao Bì & Packaging' },
  { id: 'ads', label: 'Social Media & Ads' }
];

export default function SocialFeedPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState(null);

  const artworksData = typeof artworks !== 'undefined' ? artworks : mockArtworks;

  const filteredArtworks = artworksData.filter(art => {
    const matchesCat = activeCategory === 'all' || art.categoryId === activeCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const openArtworkModal = (artwork) => {
    setSelectedArtwork(artwork);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeArtworkModal = () => {
    setIsOpen(false);
    setSelectedArtwork(null);
    document.body.style.overflow = 'auto';
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeArtworkModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pt-4 sm:pt-6 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header & Filters */}
        <div className="mb-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600">Creative Surfing Feed</span>
                <span className="text-xs text-slate-400">&bull; Khám phá ý tưởng từ cộng đồng Freelancer</span>
              </div>
              <h1 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Showcase Tác Phẩm Nghệ Thuật &amp; Thiết Kế</h1>
            </div>
            
            {/* Search */}
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm sm:ml-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tác phẩm..." 
                  className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full" 
                />
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-full whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                  activeCategory === cat.id 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filteredArtworks.map(art => (
            <div 
              key={art.id} 
              onClick={() => openArtworkModal(art)}
              className="break-inside-avoid bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-250 cursor-pointer group"
            >
              <div className="relative overflow-hidden bg-slate-100">
                <img src={art.thumb} alt={art.title} className="w-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-2xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <span className="bg-white/90 backdrop-blur-sm text-rose-500 p-2 rounded-full shadow-sm hover:scale-110 transition-transform">
                      <Heart className="w-4 h-4 fill-current" />
                    </span>
                  </div>
                  <p className="text-white text-xs font-semibold">Xem chi tiết &bull; {art.likes} ❤️</p>
                </div>
              </div>
              <div className="p-3.5">
                <h3 className="font-sora font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                  {art.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <img src={art.designer.avatar} className="w-5 h-5 rounded-full object-cover" alt={art.designer.name} />
                    <span className="text-[11px] font-medium text-slate-700">{art.designer.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{art.likes} ❤️</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredArtworks.length === 0 && (
          <div className="py-20 text-center text-slate-500 text-sm">
            Không tìm thấy tác phẩm nào phù hợp.
          </div>
        )}

      </main>

      {/* Artwork Modal */}
      {isOpen && selectedArtwork && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 transition-all duration-200"
          onClick={closeArtworkModal}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto md:overflow-hidden border border-slate-200/80 shadow-2xl flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={closeArtworkModal} 
              aria-label="Đóng"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md hover:bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Image */}
            <div className="w-full md:w-1/2 bg-slate-950 flex items-center justify-center p-3 sm:p-4 overflow-hidden relative group">
              <img src={selectedArtwork.image} alt={selectedArtwork.title} className="max-h-[35vh] sm:max-h-[50vh] md:max-h-[72vh] w-full object-contain rounded-2xl shadow-lg" />
            </div>

            {/* Right Info */}
            <div className="w-full md:w-1/2 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto md:max-h-[92vh]">
              <div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 uppercase tracking-wider mb-3 inline-block">
                  {selectedArtwork.categoryName}
                </span>

                <h2 className="font-sora font-bold text-slate-900 text-lg sm:text-xl leading-snug mb-2">
                  {selectedArtwork.title}
                </h2>

                <div className="flex items-center gap-3 py-3 border-y border-slate-100 mb-3.5">
                  <img src={selectedArtwork.designer.avatar} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm" alt="Designer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-sora font-bold text-slate-900 text-sm truncate">{selectedArtwork.designer.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{selectedArtwork.designer.tag}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{selectedArtwork.designer.title}</p>
                    <p className="text-[11px] text-slate-400">{selectedArtwork.designer.location}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {selectedArtwork.desc}
                </p>

                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Chỉ số &amp; Thành tích</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800">
                      ⭐ {selectedArtwork.designer.rating}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700">
                      ⚡ {selectedArtwork.designer.completedJobs}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700">
                      🎯 {selectedArtwork.designer.matchRate}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700">
                      ⏱ {selectedArtwork.designer.startingRate}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700">
                      ❤️ {selectedArtwork.likes} Saves
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <button className="flex-1 text-center py-2.5 px-4 rounded-xl text-white font-semibold text-xs transition-opacity hover:opacity-95 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600">
                  Xem Hồ Sơ &amp; Thuê Freelancer
                </button>
                <button title="Nhắn tin với Freelancer" className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm flex-shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
