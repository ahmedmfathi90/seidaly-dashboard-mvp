import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pill, Activity, ArrowRightLeft, ShieldCheck, HeartPulse } from 'lucide-react';

export default function Login() {
  const { userName, setUserName, setIsLoggedIn } = useAuth();
  const [nameInput, setNameInput] = useState(userName);
  const [avatar, setAvatar] = useState('👨‍⚕️');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setUserName(nameInput);
      setIsLoggedIn(true);
      setIsSubmitting(false);
    }, 800); // Premium delay feeling
  };

  const avatars = ['👨‍⚕️', '👩‍⚕️', '👴', '👵', '👶', '🤵', '👩'];

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-teal-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden select-none" dir="rtl">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-teal-500/10 border border-teal-500/20 p-4 rounded-2xl text-teal-400 mb-4 shadow-inner">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-teal-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
            صـيـدلـي
          </h1>
          <p className="text-slate-400 text-xs mt-2 font-medium">مساعدك الدوائي الذكي وجدول أدوية عائلتك</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">اسم المستخدم الكريم</label>
            <input 
              type="text" 
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="مثال: أحمد فتحي"
              required
              className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-sm font-semibold text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wider">اختر رمزك التعبيري (الأفاتار)</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`w-11 h-11 text-xl rounded-xl flex items-center justify-center border transition-all ${avatar === av ? 'bg-teal-500/20 border-teal-400 scale-110 shadow-lg shadow-teal-500/10' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                تأمين وحفظ ملفات عائلتك الطبية بشكل منفصل.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <HeartPulse className="w-5 h-5 text-indigo-400 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                قراءة ذكية للروشتات وجدول أدوية تزامني.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>دخول لوحة التحكم</span>
                <ArrowRightLeft className="w-4 h-4 text-slate-950 rotate-180" />
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
