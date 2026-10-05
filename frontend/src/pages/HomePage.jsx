import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, Code, Palette, Video, PenTool, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// import { testimonials } from '../data/mockData.js'; // Importing mockData as requested, though we will hardcode to match pixel-perfect html

export default function HomePage() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const carouselNext = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const carouselPrev = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  const goToSlide = (i) => setCurrentSlide(i);

  return (
    <div className="bg-white text-slate-800 font-inter"><div className="text-center px-4 py-2 bg-blue-50 text-sm text-slate-600">Bản thử nghiệm độc lập · Việc làm, ứng viên và đánh giá trên trang giới thiệu là nội dung minh họa.</div>
      {/* HERO SECTION */}
      <section className="relative pt-4 sm:pt-8 pb-8 sm:pb-10 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 40%, #f0f9ff 100%)' }}>
        <div className="absolute w-[400px] h-[400px] rounded-full top-[-60px] right-[5%] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}></div>
        <div className="absolute w-[300px] h-[300px] rounded-full bottom-[20px] left-[10%] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)' }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Full-width search bar */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 flex items-center overflow-hidden w-full mb-6 sm:mb-8 relative z-10">
            <div className="pl-4 sm:pl-5 pr-2 sm:pr-3 flex-shrink-0">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              className="flex-1 py-3 sm:py-3.5 px-2 text-xs sm:text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent min-w-0"
            />
            <button className="m-1 sm:m-1.5 text-white text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl hover:opacity-90 transition-opacity flex-shrink-0" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>
              {t('home.searchBtn')}
            </button>
          </div>

          {/* Carousel wrapper */}
          <div className="relative flex items-center gap-0 sm:gap-3">
            {/* Left arrow */}
            <button onClick={carouselPrev} aria-label="Slide trước" className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full items-center justify-center text-white shadow-lg hover:scale-105 transition-transform z-10" style={{ background: '#7c3aed' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            </button>

            {/* Carousel viewport */}
            <div className="flex-1 overflow-hidden rounded-2xl sm:rounded-3xl">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)`, willChange: 'transform' }}>
                
                {/* Slide 1 */}
                <div className="w-full flex-shrink-0 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 flex items-center gap-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#2563eb 0%,#4f46e5 50%,#7c3aed 100%)', minHeight: '280px' }}>
                  <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#ffffff,transparent)' }}></div>
                  <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#a5f3fc,transparent)' }}></div>
                  <div className="flex-1 relative z-10">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 bg-white/10 px-3 py-1 rounded-full mb-3 sm:mb-4">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
                      AI-Powered Matching
                    </span>
                    <h2 className="font-sora text-xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3 sm:mb-4">Find your dream job<br/>before anyone else does.</h2>
                    <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6 max-w-md">Our AI continuously scans thousands of listings across industries and matches them to your skills, experience level, and career goals — then notifies you of the best fits in real time. No more endless scrolling.</p>
                    <Link to="/jobs" className="inline-flex items-center gap-2 bg-white text-blue-700 text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow-md">
                      Khám phá công việc
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </Link>
                  </div>
                  <div className="hidden lg:flex items-center gap-5 flex-shrink-0 relative z-10">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=220&h=280&fit=crop&crop=face&auto=format&q=80" alt="Professional" className="w-44 h-56 object-cover rounded-2xl shadow-2xl border-2 border-white/30" />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-400 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow">92% Match</div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 w-44 border border-white/20">
                        <p className="text-[11px] font-semibold text-white/70 mb-2">Top Match</p>
                        <p className="font-sora font-bold text-white text-sm">Senior UI/UX Designer</p>
                        <p className="text-xs text-blue-200 mt-0.5">NovaTech · Remote</p>
                        <div className="mt-2 h-1.5 bg-white/20 rounded-full"><div className="h-full rounded-full bg-emerald-400" style={{ width: '92%' }}></div></div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 w-44 border border-white/10">
                        <p className="text-[11px] font-semibold text-white/70 mb-1">New today</p>
                        <p className="font-sora font-bold text-white text-sm">Frontend Developer</p>
                        <p className="text-xs text-blue-200 mt-0.5">PixelWorks · $2,000/mo</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2 */}
                <div className="w-full flex-shrink-0 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 flex items-center gap-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#db2777 55%,#f97316 100%)', minHeight: '280px' }}>
                  <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#ffffff,transparent)' }}></div>
                  <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fbcfe8,transparent)' }}></div>
                  <div className="flex-1 relative z-10">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-200 bg-white/10 px-3 py-1 rounded-full mb-3 sm:mb-4">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                      Smart CV Generator
                    </span>
                    <h2 className="font-sora text-xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3 sm:mb-4">A CV that actually<br/>gets you shortlisted.</h2>
                    <p className="text-pink-100 text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6 max-w-md">Stop sending the same generic CV everywhere. Our AI reads each job description and rewrites your CV to highlight exactly what the hiring manager is looking for — increasing your chances of passing initial screening by up to 3×.</p>
                    <Link to="/cv" className="inline-flex items-center gap-2 bg-white text-pink-700 text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-pink-50 transition-colors shadow-md">
                      Tạo CV ngay
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </Link>
                  </div>
                  <div className="hidden lg:flex items-center gap-5 flex-shrink-0 relative z-10">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=220&h=280&fit=crop&crop=face&auto=format&q=80" alt="Professional" className="w-44 h-56 object-cover rounded-2xl shadow-2xl border-2 border-white/30" />
                      <div className="absolute -bottom-2 -right-2 bg-white/90 text-pink-700 text-[10px] font-bold px-2 py-1 rounded-lg shadow">AI-Ready CV</div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 w-44 border border-white/20">
                        <p className="text-[11px] font-semibold text-white/70 mb-2">AI Generated</p>
                        <p className="font-sora font-bold text-white text-sm">Your CV — Tailored</p>
                        <p className="text-xs text-pink-200 mt-0.5">For Senior UI/UX @ NovaTech</p>
                        <div className="mt-3 space-y-1.5">
                          <div className="h-2 bg-white/20 rounded-full w-full"></div>
                          <div className="h-2 bg-white/20 rounded-full w-4/5"></div>
                          <div className="h-2 bg-white/20 rounded-full w-3/5"></div>
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 w-44 border border-white/10">
                        <p className="text-[11px] font-semibold text-white/70 mb-1">AI Tip</p>
                        <p className="text-xs text-pink-100">Add "Design Systems" — it appears 3× in this job description.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 3 */}
                <div className="w-full flex-shrink-0 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 flex items-center gap-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0891b2 0%,#0ea5e9 50%,#06b6d4 100%)', minHeight: '280px' }}>
                  <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#ffffff,transparent)' }}></div>
                  <div className="absolute bottom-0 right-1/4 w-36 h-36 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#a5f3fc,transparent)' }}></div>
                  <div className="flex-1 relative z-10">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 bg-white/10 px-3 py-1 rounded-full mb-3 sm:mb-4">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
                      AI Interview Coach
                    </span>
                    <h2 className="font-sora text-xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3 sm:mb-4">Practice interviews with<br/>an AI that thinks like HR.</h2>
                    <p className="text-cyan-100 text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6 max-w-md">After passing the CV round, your real challenge begins. Our AI takes on the role of a senior HR manager and fires real questions tailored to the company and role — then scores your answers and gives you instant, actionable feedback.</p>
                    <Link to="/interview" className="inline-flex items-center gap-2 bg-white text-cyan-700 text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-cyan-50 transition-colors shadow-md">
                      Bắt đầu luyện tập
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </Link>
                  </div>
                  <div className="hidden lg:flex items-center gap-5 flex-shrink-0 relative z-10">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=220&h=280&fit=crop&crop=face&auto=format&q=80" alt="Professional" className="w-44 h-56 object-cover rounded-2xl shadow-2xl border-2 border-white/30" />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-400 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow">Score: 78%</div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 w-44 border border-white/20">
                        <p className="text-[11px] font-semibold text-white/70 mb-2">AI Interviewer</p>
                        <p className="text-xs text-cyan-100 leading-relaxed">"Walk me through your design process for a product you're most proud of."</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 w-44 border border-white/10">
                        <p className="text-[11px] font-semibold text-white/70 mb-1">Session Score</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-white/20 rounded-full"><div className="h-full bg-emerald-300 rounded-full" style={{ width: '78%' }}></div></div>
                          <span className="text-xs font-bold text-emerald-300">78%</span>
                        </div>
                        <p className="text-[10px] text-cyan-200 mt-1">+12 pts from last session</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right arrow */}
            <button onClick={carouselNext} aria-label="Slide tiếp theo" className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full items-center justify-center text-white shadow-lg hover:scale-105 transition-transform z-10" style={{ background: '#7c3aed' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={`transition-all ${currentSlide === i ? 'bg-indigo-600 w-10 h-2.5 rounded-full' : 'bg-slate-300 w-2 h-2 rounded-full'}`}
                onClick={() => goToSlide(i)}
              ></button>
            ))}
          </div>

        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 sm:mb-2">Explore Categories</p>
              <h2 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Explore by category</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Find opportunities or creative talent in your field</p>
            </div>
            <Link to="/categories" className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors self-start sm:self-auto">
              Xem tất cả danh mục
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-600 hover:bg-blue-50 transition-all bg-white transform hover:-translate-y-0.5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-sora font-semibold text-xs sm:text-sm text-slate-800 leading-tight mb-1">Information Security</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">120+ jobs</p>
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-600 hover:bg-blue-50 transition-all bg-white transform hover:-translate-y-0.5">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                <Code className="w-5 h-5 text-violet-600" />
              </div>
              <p className="font-sora font-semibold text-xs sm:text-sm text-slate-800 leading-tight mb-1">Software Development</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">850+ jobs</p>
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-600 hover:bg-blue-50 transition-all bg-white transform hover:-translate-y-0.5">
              <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center mb-3">
                <Palette className="w-5 h-5 text-pink-500" />
              </div>
              <p className="font-sora font-semibold text-xs sm:text-sm text-slate-800 leading-tight mb-1">Design & Creative</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">460+ jobs</p>
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-600 hover:bg-blue-50 transition-all bg-white transform hover:-translate-y-0.5">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                <Video className="w-5 h-5 text-amber-500" />
              </div>
              <p className="font-sora font-semibold text-xs sm:text-sm text-slate-800 leading-tight mb-1">Video & Animation</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">220+ jobs</p>
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-600 hover:bg-blue-50 transition-all bg-white transform hover:-translate-y-0.5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                <PenTool className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="font-sora font-semibold text-xs sm:text-sm text-slate-800 leading-tight mb-1">Writing & Translation</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">310+ jobs</p>
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-600 hover:bg-blue-50 transition-all bg-white transform hover:-translate-y-0.5">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5 text-sky-600" />
              </div>
              <p className="font-sora font-semibold text-xs sm:text-sm text-slate-800 leading-tight mb-1">Business & Consulting</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">180+ jobs</p>
            </div>
          </div>
        </div>
      </section>

      {/* RECOMMENDED JOBS */}
      <section className="py-12 sm:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 sm:mb-2">Recommended Jobs</p>
              <h2 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Find jobs matched to you</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Get personalized job recommendations based on your skills, experience, personality and career goals.</p>
            </div>
            <Link to="/jobs" className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors self-start sm:self-auto">
              Xem tất cả việc làm
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Job 1 */}
            <Link to="/jobs/1" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md block hover:-translate-y-1 transition-all duration-250">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center font-sora font-bold text-cyan-700 text-sm">TC</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">TechCorp</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-wide bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">Remote</span>
              </div>
              <h3 className="font-sora font-bold text-slate-900 text-sm leading-snug mb-2">Information Security Analyst</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Full-time</span>
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mid-Senior</span>
              </div>
              <p className="text-blue-600 font-semibold text-sm mb-2">$800 – $1,200 / month</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">Join our security team to monitor, analyze and respond to security threats.</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
                  7 days ago
                </span>
                <span>73 applicants</span>
              </div>
            </Link>

            {/* Job 2 */}
            <Link to="/jobs/2" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md block hover:-translate-y-1 transition-all duration-250">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center font-sora font-bold text-blue-700 text-sm">NT</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">NovaTech</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-wide bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">Hybrid</span>
              </div>
              <h3 className="font-sora font-bold text-slate-900 text-sm leading-snug mb-2">Frontend Developer (React)</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Full-time</span>
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Junior · Mid</span>
              </div>
              <p className="text-blue-600 font-semibold text-sm mb-2">$700 – $1,100 / month</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">Build modern web applications with React and work with a talented team.</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
                  3 days ago
                </span>
                <span>18 applicants</span>
              </div>
            </Link>

            {/* Job 3 */}
            <Link to="/jobs/3" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md block hover:-translate-y-1 transition-all duration-250">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center font-sora font-bold text-purple-700 text-sm">PW</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">PixelWorks</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-wide bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">Remote</span>
              </div>
              <h3 className="font-sora font-bold text-slate-900 text-sm leading-snug mb-2">Graphic Designer</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Part-time</span>
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mid-level</span>
              </div>
              <p className="text-blue-600 font-semibold text-sm mb-2">$18 – $35 / hour</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">Create stunning visuals for social media, web and branding projects.</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
                  4 days ago
                </span>
                <span>12 applicants</span>
              </div>
            </Link>

            {/* Job 4 */}
            <Link to="/jobs/4" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md block hover:-translate-y-1 transition-all duration-250">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center font-sora font-bold text-emerald-700 text-sm">BP</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">BrightPath</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-wide bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">Remote</span>
              </div>
              <h3 className="font-sora font-bold text-slate-900 text-sm leading-snug mb-2">AI Research Assistant</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Full-time</span>
                <span className="text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Entry · Mid</span>
              </div>
              <p className="text-blue-600 font-semibold text-sm mb-2">$600 – $1,000 / month</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">Work on real-world AI projects and contribute to innovative solutions.</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
                  5 days ago
                </span>
                <span>9 applicants</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* DESIGNER MARKETPLACE */}
      <section className="py-12 sm:py-20 bg-slate-50 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-10">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 sm:mb-2">Featured Talent</p>
              <h2 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Hire creative talent</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md">Browse verified designers, brand architects and visual creators tailored to your business needs.</p>
            </div>
            <Link to="/candidates" className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto">
              Xem tất cả tài năng
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=140&h=140&fit=crop&crop=face&auto=format&q=80" className="w-14 h-14 rounded-2xl object-cover bg-blue-50 border border-slate-100 shadow-sm" alt="Linh Trần" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Available</span>
                </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Linh Trần</h3>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-slate-400">· Hà Nội</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">Poster & Key Visual Designer · 5 yrs</p>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 flex-wrap pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    5.0 (28)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">128 jobs</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    95% match
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">Chuyên thiết kế poster sự kiện, key visual và ấn phẩm truyền thông đậm chất nghệ thuật, thu hút thị giác cao.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">Event Posters</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">Print-Ready</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-pink-50 text-pink-700">Typography</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Starting from</p>
                  <p className="text-xs font-bold text-slate-900">$80 <span className="font-normal text-slate-400">· 2 days</span></p>
                </div>
                <Link to="/candidates/1" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>Xem hồ sơ</Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&h=140&fit=crop&crop=face&auto=format&q=80" className="w-14 h-14 rounded-2xl object-cover bg-emerald-50 border border-slate-100 shadow-sm" alt="Vinh Nguyễn" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">Pro</span>
                </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Vinh Nguyễn</h3>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-slate-400">· Đà Nẵng</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">Digital Ad & Banner Designer · 4 yrs</p>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 flex-wrap pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    4.9 (34)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">94 jobs</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    91% match
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">Tối ưu CTR chiến dịch quảng cáo Facebook, Google Display và sàn TMĐT với bộ banner sắc nét, chuẩn responsive.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">Web Banners</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Google Ads</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Social Ads</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Starting from</p>
                  <p className="text-xs font-bold text-slate-900">$65 <span className="font-normal text-slate-400">· 1 day</span></p>
                </div>
                <Link to="/candidates/2" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>Xem hồ sơ</Link>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=140&h=140&fit=crop&crop=face&auto=format&q=80" className="w-14 h-14 rounded-2xl object-cover bg-violet-50 border border-slate-100 shadow-sm" alt="Quỳnh Anh" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">Pro Verified</span>
                </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Quỳnh Anh</h3>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-slate-400">· TP.HCM</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">Brand Identity Specialist · 6 yrs</p>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 flex-wrap pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    5.0 (42)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">63 jobs</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    97% match
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">Xây dựng hệ thống nhận diện thương hiệu hoàn chỉnh, logo vector sắc gọn và quy chuẩn brand guideline cao cấp.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">Brand Identity</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">Vector Logo</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">Brand Book</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Starting from</p>
                  <p className="text-xs font-bold text-slate-900">$150 <span className="font-normal text-slate-400">· 3 days</span></p>
                </div>
                <Link to="/candidates/3" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>Xem hồ sơ</Link>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="relative">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenMinhTuan&backgroundColor=b6e3f4" className="w-14 h-14 rounded-2xl object-cover bg-sky-100 border border-slate-100 shadow-sm" alt="Nguyễn Minh Tuấn" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Shortlisted</span>
                </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Nguyễn Minh Tuấn</h3>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-slate-400">· Hà Nội</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">Senior UI/UX Designer · 4 yrs</p>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 flex-wrap pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    5.0 (18)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">NovaTech</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    92% match
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">Thiết kế trải nghiệm người dùng hiện đại cho web và mobile apps. Tối ưu hóa design system và tương tác sản phẩm.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">React</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">UI/UX</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-pink-50 text-pink-700">Figma</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Experience</p>
                  <p className="text-xs font-bold text-slate-900">4 years <span className="font-normal text-slate-400">· Senior</span></p>
                </div>
                <Link to="/candidates/4" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>Xem hồ sơ</Link>
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=140&h=140&fit=crop&crop=face&auto=format&q=80" className="w-14 h-14 rounded-2xl object-cover bg-rose-50 border border-slate-100 shadow-sm" alt="Phương Ly" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700">Trending</span>
                </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Phương Ly</h3>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-slate-400">· TP.HCM</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">Social Creative & Content Producer · 3 yrs</p>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 flex-wrap pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    4.9 (56)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">211 jobs</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    89% match
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">Sáng tạo nội dung hình ảnh viral, template mạng xã hội và banner động bắt kịp xu hướng TikTok, Reels.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">Instagram Kits</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">TikTok Covers</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Motion Ads</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Starting from</p>
                  <p className="text-xs font-bold text-slate-900">$95 <span className="font-normal text-slate-400">· 2 days</span></p>
                </div>
                <Link to="/candidates/5" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>Xem hồ sơ</Link>
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=140&h=140&fit=crop&crop=face&auto=format&q=80" className="w-14 h-14 rounded-2xl object-cover bg-amber-50 border border-slate-100 shadow-sm" alt="Tuấn Anh" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Top Agency</span>
                </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Tuấn Anh</h3>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-slate-400">· Cần Thơ</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">Minimalist Logo & Icon Designer · 7 yrs</p>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 flex-wrap pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    5.0 (68)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">155 jobs</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    98% match
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">Thiết kế logo tối giản hiện đại, bộ biểu tượng icon độc quyền và ứng dụng 3D mockup nhận diện thương hiệu.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">Minimalist Logo</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">Monogram</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Vector SVG</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Starting from</p>
                  <p className="text-xs font-bold text-slate-900">$120 <span className="font-normal text-slate-400">· 2 days</span></p>
                </div>
                <Link to="/candidates/6" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>Xem hồ sơ</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-12 sm:py-20" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-12">
            <div>
              <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1 sm:mb-2">How It Works</p>
              <h2 className="font-sora text-xl sm:text-2xl font-bold text-white">AI-powered application</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md">Let our AI handle the heavy lifting — from finding the right jobs to preparing you for interviews.</p>
            </div>
            <Link to="/how-it-works" className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors self-start sm:self-auto">
              Xem cách hoạt động
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-0">
            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center text-center md:items-start md:text-left p-4 sm:p-6 w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-900/30 relative">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
                </svg>
                <span className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-blue-600 text-xs font-bold flex items-center justify-center shadow">1</span>
              </div>
              <h3 className="font-sora font-bold text-white text-base mb-1.5 sm:mb-2">Analyze Job</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">AI scans job postings and matches them with your profile, goals and company culture.</p>
            </div>

            {/* Connector */}
            <div className="hidden md:flex items-center justify-center w-8 mt-10 flex-shrink-0">
              <div className="w-full h-px bg-gradient-to-r from-blue-500 to-indigo-500 opacity-40"></div>
              <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/></svg>
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center text-center md:items-start md:text-left p-4 sm:p-6 w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/30 relative">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                </svg>
                <span className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-indigo-600 text-xs font-bold flex items-center justify-center shadow">2</span>
              </div>
              <h3 className="font-sora font-bold text-white text-base mb-1.5 sm:mb-2">Tailor CV</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">Automatically generates an ATS-friendly CV tailored to each company's requirements.</p>
            </div>

            {/* Connector */}
            <div className="hidden md:flex items-center justify-center w-8 mt-10 flex-shrink-0">
              <div className="w-full h-px bg-gradient-to-r from-indigo-500 to-violet-500 opacity-40"></div>
              <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/></svg>
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center text-center md:items-start md:text-left p-4 sm:p-6 w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-900/30 relative">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
                </svg>
                <span className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-violet-600 text-xs font-bold flex items-center justify-center shadow">3</span>
              </div>
              <h3 className="font-sora font-bold text-white text-base mb-1.5 sm:mb-2">Prepare Interview</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">AI acts as an HR, creating role-specific questions and practice sessions to boost your confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-10">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 sm:mb-2">Success Stories</p>
              <h2 className="font-sora text-xl sm:text-2xl font-bold text-slate-900">Trusted by job seekers and businesses</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Real people. Real results.</p>
            </div>
            <Link to="/testimonials" className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors self-start sm:self-auto">
              Xem thêm đánh giá
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {/* Review 1 */}
            <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 hover:border-blue-200 transition-colors hover:shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenMinhTuan&backgroundColor=b6e3f4" alt="Nguyen Minh Tuan" className="w-10 h-10 rounded-full object-cover bg-sky-100" />
                <div>
                  <p className="font-sora font-semibold text-sm text-slate-900">Nguyễn Minh Tuấn</p>
                  <p className="text-xs text-slate-500">Information Security Analyst</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed italic">"Connect CV helped me land my first internship and the AI-generated CV really made a difference. I got 3 interviews invitations within a week!"</p>
            </div>

            {/* Review 2 */}
            <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 hover:border-blue-200 transition-colors hover:shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=TranThiHa&backgroundColor=ffd5dc" alt="Tran Thi Ha" className="w-10 h-10 rounded-full object-cover bg-pink-100" />
                <div>
                  <p className="font-sora font-semibold text-sm text-slate-900">Trần Thị Hà</p>
                  <p className="text-xs text-slate-500">Graphic Designer</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed italic">"I've hired 5 designers through Connect CV. The quality is amazing and the process is so smooth. Highly recommend!"</p>
            </div>

            {/* Review 3 */}
            <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 hover:border-blue-200 transition-colors hover:shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=LeQuangHuy&backgroundColor=c0aede" alt="Le Quang Huy" className="w-10 h-10 rounded-full object-cover bg-violet-100" />
                <div>
                  <p className="font-sora font-semibold text-sm text-slate-900">Lê Quang Huy</p>
                  <p className="text-xs text-slate-500">Hiring Manager at NovaTech</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed italic">"The platform saves us a lot of time. The AI screening and tailored CVs help us find the right candidates faster and more accurately."</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-12 sm:py-16" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-white mb-3">Ready to transform your career?</h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-6 sm:mb-8">Join thousands of professionals who found their dream jobs with AI-powered matching and tailored CVs.</p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/signup" className="bg-white text-blue-700 text-xs sm:text-sm font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-md">
              Bắt đầu miễn phí
            </Link>
            <Link to="/about" className="border border-white/30 text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-white/10 transition-colors">
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
