import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Camera, Bell, ShieldCheck, HeartPulse, Zap, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/*
 * ══════════════════════════════════════════════════════════════════
 *  FEATURE DATA
 *  Each entry drives both a text section and the phone screen.
 * ══════════════════════════════════════════════════════════════════
 */
const FEATURES = [
  {
    id: 0,
    // --- phone screen ---
    phoneIcon: <Camera className="w-11 h-11" />,
    phoneLabel: 'المسح الذكي',
    phoneLine: 'صوّر الروشتة واقرأها فوراً',
    phoneAccent: '#818cf8',
    phoneGrad: 'from-slate-950 via-indigo-950/50 to-slate-900',
    // --- text section ---
    textIcon: <Camera className="w-7 h-7" />,
    textIconClr: 'text-indigo-400',
    textIconBg: 'bg-indigo-500/10 border-indigo-500/20',
    heading: 'مسح ضوئي فائق الدقة.',
    body: 'وجّه الكاميرا نحو أي روشتة مهما كان خطها. سيتم التعرّف على كل دواء واستخراج الجرعات والتعليمات في ثوانٍ.',
  },
  {
    id: 1,
    phoneIcon: <Bell className="w-11 h-11" />,
    phoneLabel: 'التنبيهات',
    phoneLine: 'لا تنسَ جرعتك أبداً',
    phoneAccent: '#fb7185',
    phoneGrad: 'from-slate-950 via-rose-950/50 to-slate-900',
    textIcon: <Bell className="w-7 h-7" />,
    textIconClr: 'text-rose-400',
    textIconBg: 'bg-rose-500/10 border-rose-500/20',
    heading: 'تنبيهات ذكية في وقتها.',
    body: 'إشعار دقيق قبل كل جرعة. النظام يتكيّف مع جدولك ويُذكّرك في اللحظة المناسبة.',
  },
  {
    id: 2,
    phoneIcon: <ShieldCheck className="w-11 h-11" />,
    phoneLabel: 'العائلة',
    phoneLine: 'ملف طبي لكل فرد',
    phoneAccent: '#34d399',
    phoneGrad: 'from-slate-950 via-emerald-950/50 to-slate-900',
    textIcon: <ShieldCheck className="w-7 h-7" />,
    textIconClr: 'text-emerald-400',
    textIconBg: 'bg-emerald-500/10 border-emerald-500/20',
    heading: 'عائلتك كلها في مكان واحد.',
    body: 'أنشئ ملفاً طبياً مستقلاً لكل فرد مع جدول أدوية وأرشيف روشتات منفصل بالكامل.',
  },
] as const;

/*
 * ══════════════════════════════════════════════════════════════════
 *  PHONE SCREEN — The content rendered INSIDE the single frame.
 *  This is a plain div; the parent motion.div handles animation.
 * ══════════════════════════════════════════════════════════════════
 */
function PhoneScreen({
  icon, label, line, accent, grad, dotIdx,
}: {
  icon: React.ReactNode; label: string; line: string;
  accent: string; grad: string; dotIdx: number;
}) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-b ${grad} flex flex-col items-center justify-center px-5 text-center`}>
      {/* mini top bar */}
      <div className="absolute top-9 inset-x-0 flex justify-between items-center px-5">
        <span className="text-[10px] text-slate-500 font-bold">{label}</span>
        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
          <Pill className="w-3 h-3 text-teal-400" />
        </div>
      </div>
      {/* icon */}
      <div className="mb-4 p-5 rounded-3xl" style={{ color: accent, background: `${accent}15` }}>
        {icon}
      </div>
      <h3 className="text-white font-black text-lg leading-snug">{line}</h3>
      {/* dots */}
      <div className="absolute bottom-7 flex gap-1.5">
        {FEATURES.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === dotIdx ? 18 : 6,
              background: i === dotIdx ? accent : '#334155',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════
 *  STATIC PHONE FRAME — Used both for the sticky desktop version
 *  and the inline mobile version.
 * ══════════════════════════════════════════════════════════════════
 */
function PhoneFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative w-[260px] h-[530px] rounded-[2.6rem] border-[7px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 inset-x-0 flex justify-center z-30">
          <div className="w-[88px] h-[25px] bg-slate-900 rounded-b-2xl" />
        </div>
        {/* status bar */}
        <div className="absolute top-1 inset-x-0 flex justify-between items-center px-5 z-20 text-[9px] font-bold text-slate-500">
          <span>9:41</span>
          <div className="flex items-center gap-1 opacity-60">
            <div className="w-3 h-[7px] rounded-[2px] border border-slate-500 relative">
              <div className="absolute inset-[1.5px] rounded-[1px] bg-slate-500" />
            </div>
          </div>
        </div>
        {/* screen content slot */}
        {children}
      </div>
    </div>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════════
 */
export default function LandingPage() {
  const { setHasSeenLanding } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // ── The single state that controls the phone screen ──
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Refs for each scrolling text section ──
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Capture PWA install prompt ──
  useEffect(() => {
    const h = (e: Event) => { 
      e.preventDefault(); 
      setInstallPrompt(e); 
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  // ── IntersectionObserver: fires when a text section crosses the
  //    vertical center of the viewport → updates activeIdx ──
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = Number(entry.target.getAttribute('data-idx'));
            if (!isNaN(i)) setActiveIdx(i);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0.01 },
    );
    sectionRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleInstall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if it is an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else if (isIOS) {
      alert("للتثبيت على آيفون:\n1. اضغط على أيقونة المشاركة (Share) في الأسفل.\n2. اختر (Add to Home Screen) أو (إضافة للشاشة الرئيسية).");
    } else {
      alert('عفواً، متصفحك لا يدعم التثبيت المباشر، يرجى التثبيت من قائمة المتصفح بالضغط على "Add to Home screen".');
    }
  };

  const feat = FEATURES[activeIdx] ?? FEATURES[0];

  return (
    <div className="bg-slate-950 text-white font-sans" dir="rtl">

      {/* ── ambient blobs ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[550px] h-[550px] rounded-full bg-teal-500/[0.06] blur-[130px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-[130px]" />
      </div>

      {/* ════════════════════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-2xl text-center"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-6">
            <span className="bg-gradient-to-l from-teal-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              أدويتك
            </span>
            <br />
            <span className="text-white">بأمان وذكاء.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed mb-10 font-medium max-w-lg mx-auto">
            المساعد الدوائي الأول لقراءة الروشتات وتنظيم جرعات عائلتك في مكان واحد.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setHasSeenLanding(true)}
              className="px-8 py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base shadow-xl shadow-teal-500/20 transition-colors"
            >
              ابدأ الاستخدام الآن ←
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleInstall}
              className="px-8 py-4 rounded-2xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-base backdrop-blur transition-colors flex items-center gap-2"
            >
              <Zap className="w-5 h-5 text-teal-400" />
              تثبيت التطبيق
            </motion.button>
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 text-slate-600">
            <ChevronDown className="w-5 h-5 animate-bounce" />
            <span className="text-xs font-medium">مرّر للأسفل</span>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FEATURES — TWO COMPLETELY DIFFERENT LAYOUTS
          ▸ Desktop (md+) : CSS Grid, left scrolls, right is sticky
          ▸ Mobile  (<md) : Simple vertical stack, no sticky at all
      ════════════════════════════════════════════════════════════ */}

      {/* ──────── DESKTOP LAYOUT (hidden below md) ──────── */}
      <div className="relative z-10 hidden md:block max-w-7xl mx-auto px-6 lg:px-12">
        {/*
          CSS Grid with 2 equal columns.
          The sticky column uses `self-start` so the grid row
          doesn't force both columns to the same height,
          allowing `sticky` to work correctly.
        */}
        <div className="grid grid-cols-2 gap-0">

          {/* COL 1 — SCROLLING TEXT SECTIONS (order-2 → appears on the right in RTL) */}
          <div className="order-2">
            {FEATURES.map((f, idx) => (
              <div
                key={f.id}
                ref={(el) => { sectionRefs.current[idx] = el; }}
                data-idx={idx}
                className="min-h-screen flex items-center px-8 lg:px-14"
              >
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.35 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                >
                  <div className={`inline-flex p-3.5 rounded-2xl border mb-5 ${f.textIconClr} ${f.textIconBg}`}>
                    {f.textIcon}
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black mb-5 text-white leading-tight">
                    {f.heading}
                  </h2>
                  <p className="text-base lg:text-lg text-slate-400 leading-relaxed font-medium max-w-md">
                    {f.body}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>

          {/* COL 2 — STICKY PHONE (order-1 → appears on the left in RTL)
              ┌─────────────────────────────────────────────────────┐
              │  sticky  top-0  h-screen  →  stays in viewport     │
              │  self-start  →  doesn't stretch to sibling height  │
              │  ONE phone frame. AnimatePresence crossfades inside │
              └─────────────────────────────────────────────────────┘ */}
          <div className="order-1 sticky top-0 h-screen flex items-center justify-center self-start">
            <div className="relative">
              {/* animated outer glow */}
              <div
                className="absolute inset-4 rounded-[3rem] blur-3xl opacity-20 transition-all duration-700 pointer-events-none"
                style={{ backgroundColor: feat.phoneAccent }}
              />
              <PhoneFrame>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0"
                  >
                    <PhoneScreen
                      icon={feat.phoneIcon}
                      label={feat.phoneLabel}
                      line={feat.phoneLine}
                      accent={feat.phoneAccent}
                      grad={feat.phoneGrad}
                      dotIdx={activeIdx}
                    />
                  </motion.div>
                </AnimatePresence>
              </PhoneFrame>
            </div>
          </div>

        </div>{/* end grid */}
      </div>{/* end desktop layout */}

      {/* ──────── MOBILE LAYOUT (hidden at md+) ────────
           Simple vertical stack. Each section = text + phone card.
           No sticky. No overlap. Completely isolated. */}
      <div className="relative z-10 md:hidden px-6">
        {FEATURES.map((f) => (
          <div key={f.id} className="py-20 flex flex-col items-center gap-10">
            {/* Text block */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full text-right"
            >
              <div className={`inline-flex p-3 rounded-2xl border mb-4 ${f.textIconClr} ${f.textIconBg}`}>
                {f.textIcon}
              </div>
              <h2 className="text-3xl font-black mb-4 text-white leading-tight">
                {f.heading}
              </h2>
              <p className="text-base text-slate-400 leading-relaxed font-medium">
                {f.body}
              </p>
            </motion.div>

            {/* Inline phone (NOT sticky — just a normal block element) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
              className="flex justify-center"
            >
              <PhoneFrame className="scale-90">
                <PhoneScreen
                  icon={f.phoneIcon}
                  label={f.phoneLabel}
                  line={f.phoneLine}
                  accent={f.phoneAccent}
                  grad={f.phoneGrad}
                  dotIdx={f.id}
                />
              </PhoneFrame>
            </motion.div>
          </div>
        ))}
      </div>{/* end mobile layout */}

      {/* ════════════════════════════════════════════════════════════
          FINAL CTA — Phone + Card side by side
      ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-6 sm:px-12">

        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-5xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden"
        >
          {/* Card background styling */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            {/* Phone (Inside the card, scaled down on the left) */}
            <div className="shrink-0 order-2 lg:order-1 scale-[0.85] lg:scale-[0.8] origin-left lg:-ml-6 -mt-8 lg:mt-0">
              <div className="relative">
                <div className="absolute inset-4 rounded-[3rem] blur-3xl opacity-20 pointer-events-none bg-emerald-500" />
                <PhoneFrame>
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950/50 to-slate-900 flex flex-col items-center justify-center px-5 text-center">
                    <div className="mb-4 p-4 rounded-3xl" style={{ color: '#34d399', background: '#34d39915' }}>
                      <HeartPulse className="w-10 h-10" />
                    </div>
                    <h3 className="text-white font-black text-lg">جاهز لحمايتك</h3>
                    <p className="text-slate-500 text-[11px] mt-1 font-medium">حماية صحية ذكية لعائلتك</p>
                  </div>
                </PhoneFrame>
              </div>
            </div>

            {/* Text Content (Centered) */}
            <div className="flex-1 text-center order-1 lg:order-2 w-full flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6 text-teal-400">
                <HeartPulse className="w-7 h-7" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white leading-tight">
                جاهز للبدء؟
              </h2>
              <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 font-medium max-w-md">
                انضم وابدأ في حماية صحة عائلتك بدون أي تعقيد.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setHasSeenLanding(true)}
                  className="px-10 py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-lg shadow-xl shadow-teal-500/20 transition-colors"
                >
                  حمل الآن ←
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleInstall}
                  className="px-10 py-4 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 text-teal-400" />
                  تثبيت كـ PWA
                </motion.button>
              </div>
              <p className="text-slate-600 text-xs mt-6 font-medium">بدون اشتراك · يعمل بدون إنترنت</p>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
