import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Plus, Briefcase, ChevronDown, Check, Mic, Send, Zap } from 'lucide-react';
import { candidates } from '../data/mockData.js'; // Using local mock if needed

export default function InterviewPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: "How do you approach designing a user flow for a complex product? Can you walk me through your process?",
      tags: ["Technical Question", "UI/UX"]
    },
    {
      id: 2,
      type: 'user',
      text: "Great question! When designing a user flow for a complex product, I usually follow these steps:\n1. Understand the goal: Identify the main user goal and business objectives.\n2. Research: Analyze target users, needs, and pain points.\n3. Ideate & sketch: Create multiple flow options and wireframes...",
      time: "Just now"
    },
    {
      id: 3,
      type: 'ai',
      text: "Great structured approach! Tell me more about your Research step — what tools and methods do you use?",
      quickReplies: ["💡 Talk about user interviews", "📊 Mention usability testing"]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMsg = {
      id: Date.now(),
      type: 'user',
      text: inputValue,
      time: "Just now"
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: "That's a solid answer! Can you share a specific example from a past project and what was the biggest challenge?",
        tags: ["Follow-up"]
      }]);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (text) => {
    setInputValue(text);
    setTimeout(handleSend, 100); // Wait for state update
  };

  const [mobileStagesOpen, setMobileStagesOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full font-inter bg-slate-50">
      {/* Mobile Stage Banner (Collapsible) */}
      <div className="md:hidden bg-white border-b border-slate-100 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-600 flex items-center justify-center text-[10px] font-bold text-blue-600">2</span>
            <div>
              <p className="text-xs font-bold text-slate-800">Stage 2: Technical Questions</p>
              <p className="text-[10px] text-slate-400">Senior UI/UX Designer · NovaTech</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileStagesOpen(!mobileStagesOpen)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1"
          >
            <span>50%</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileStagesOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile Stages Dropdown */}
        {mobileStagesOpen && (
          <div className="pt-3 pb-1 border-t border-slate-100 mt-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-500 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> 1. Introduction
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-blue-600 font-bold">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">2</span>
                2. Technical Questions
              </span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Current</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px]">3</span>
                3. Behavioral Questions
              </span>
              <span>Pending</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px]">4</span>
                4. Wrap Up
              </span>
              <span>Pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Left Sidebar (Desktop) */}
        <div className="w-64 bg-white border-r border-slate-100 flex flex-col overflow-y-auto flex-shrink-0 p-5 hidden md:flex">
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Interview for</p>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500">
                <Zap className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <p className="font-sora font-bold text-sm text-slate-900">Senior UI/UX Designer</p>
                <p className="text-xs text-slate-500">NovaTech</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-xs bg-sky-50 text-sky-700 font-semibold px-2.5 py-1 rounded-full">Remote</span>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full">Full-time</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 relative">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Interview Stages</p>
            <div className="space-y-0">
              <div className="relative pl-9 pb-5">
                <div className="absolute left-[13px] top-[28px] bottom-0 w-0.5 bg-slate-200"></div>
                <div className="absolute left-0 w-7 h-7 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} />
                </div>
                <p className="text-sm text-slate-500 font-medium pt-1">Introduction</p>
              </div>
              <div className="relative pl-9 pb-5">
                <div className="absolute left-[13px] top-[28px] bottom-0 w-0.5 bg-slate-200"></div>
                <div className="absolute left-0 w-7 h-7 rounded-full bg-blue-50 border-2 border-blue-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <p className="text-sm font-semibold text-blue-600 pt-1">Technical Questions</p>
              </div>
              <div className="relative pl-9 pb-5">
                <div className="absolute left-[13px] top-[28px] bottom-0 w-0.5 bg-slate-200"></div>
                <div className="absolute left-0 w-7 h-7 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                  <span className="text-xs text-slate-400 font-medium">3</span>
                </div>
                <p className="text-sm text-slate-400 pt-1">Behavioral Questions</p>
              </div>
              <div className="relative pl-9">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                  <span className="text-xs text-slate-400 font-medium">4</span>
                </div>
                <p className="text-sm text-slate-400 pt-1">Wrap Up</p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">Progress</p>
              <p className="text-xs font-bold text-blue-600">50%</p>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="font-sora text-base sm:text-lg font-bold text-slate-900 leading-tight">AI Interview Assistant</h1>
                <p className="text-xs sm:text-sm text-slate-500 truncate max-w-[200px] sm:max-w-none">Practice with AI after your CV is screened.</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                AI Active
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 sm:gap-3 ${msg.type === 'user' ? 'justify-end' : ''} animate-[fadeIn_0.3s_ease-out]`}>
                {msg.type === 'ai' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-600">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
                <div className={`flex-1 ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                  {msg.type === 'ai' && (
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">AI Interviewer</span>
                      {msg.tags?.map((tag, idx) => (
                        <span key={idx} className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-700'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`max-w-full sm:max-w-xl ${msg.type === 'user' ? 'text-right' : ''}`}>
                    <div className={`p-3.5 sm:p-4 shadow-sm ${msg.type === 'user' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl rounded-tr-none text-white' : 'bg-white rounded-2xl rounded-tl-none border border-slate-100 text-slate-800'}`}>
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      {msg.quickReplies && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                          {msg.quickReplies.map((reply, idx) => (
                            <button 
                              key={idx}
                              onClick={() => handleQuickReply(reply)}
                              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.type === 'user' && msg.time && (
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{msg.time}</p>
                    )}
                  </div>
                </div>
                {msg.type === 'user' && (
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenBao&backgroundColor=b6e3f4" className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-100 flex-shrink-0" alt="User" />
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 sm:gap-3 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-600">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none p-3 px-4 shadow-sm border border-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 block animate-[bounce_1.4s_infinite]"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 block animate-[bounce_1.4s_infinite_0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 block animate-[bounce_1.4s_infinite_0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-slate-100 p-2.5 sm:p-4 flex-shrink-0">
            <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
              <div className="flex-1 bg-slate-100 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 flex items-end gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all border border-transparent focus-within:border-slate-200">
                <textarea 
                  placeholder="Type your answer..." 
                  rows={1}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-700 placeholder-slate-400 outline-none resize-none leading-relaxed max-h-[100px] sm:max-h-[120px]"
                />
                <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 flex-shrink-0">
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-blue-600 to-indigo-600"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
