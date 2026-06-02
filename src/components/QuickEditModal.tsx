import React, { useState, useEffect } from 'react';
import { X, Pill, Clock, AlertTriangle, Check, Trash2, Bell, Sparkles } from 'lucide-react';
import { Medication } from '../types';

interface QuickEditModalProps {
  medication: Medication;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Medication) => void;
  onDelete?: () => void;
}

export default function QuickEditModal({ medication, isOpen, onClose, onSave, onDelete }: QuickEditModalProps) {
  // Local state initialized block from the original medication
  const [name, setName] = useState(medication.name || '');
  const [dosage, setDosage] = useState(medication.dosage || '');
  const [form, setForm] = useState(medication.form || 'Tablet');
  const [duration, setDuration] = useState(medication.duration || '7 days');
  
  // Custom interactive scheduler states:
  // Timings: default checkboxes/blocks
  const [morning, setMorning] = useState(false);
  const [noon, setNoon] = useState(false);
  const [night, setNight] = useState(false);

  // Food Instructions
  const [foodInstruction, setFoodInstruction] = useState<'before' | 'after' | 'needed' | 'none'>('none');

  // Interval dropdown
  const [intervalOption, setIntervalOption] = useState<string>('custom');

  // Inventory & Alarm Tracking
  const [inventoryQty, setInventoryQty] = useState<number>(20);
  const [refillAlertEnabled, setRefillAlertEnabled] = useState<boolean>(true);

  // Parse existing data if any on open
  useEffect(() => {
    if (isOpen) {
      setName(medication.name || '');
      setDosage(medication.dosage && medication.dosage !== 'Unknown' ? medication.dosage : '');
      setForm(medication.form && medication.form !== 'Unknown' ? medication.form : 'Tablet');
      setDuration(medication.duration && medication.duration !== 'Unknown' ? medication.duration : '7 أيام');

      // Sync active state inputs
      setFoodInstruction(
        medication.specialInstructions?.includes('قبل الأكل') ? 'before' :
        medication.specialInstructions?.includes('بعد الأكل') ? 'after' :
        medication.specialInstructions?.includes('عند اللزوم') ? 'needed' : 'none'
      );

      // Guess morning/noon/night
      const freqLower = (medication.frequency || '').toLowerCase();
      const specLower = (medication.specialInstructions || '').toLowerCase();
      
      const hasMorning = freqLower.includes('morning') || freqLower.includes('الصبح') || freqLower.includes('صباحا') || freqLower.includes('3 times') || freqLower.includes('ثلاث مرات') || freqLower.includes('3 مرات') || freqLower.includes('every 8');
      const hasNoon = freqLower.includes('noon') || freqLower.includes('ظهر') || freqLower.includes('ظهرًا') || freqLower.includes('3 times') || freqLower.includes('ثلاث مرات') || freqLower.includes('every 8');
      const hasNight = freqLower.includes('night') || freqLower.includes('evening') || freqLower.includes('ليل') || freqLower.includes('مساء') || freqLower.includes('twice') || freqLower.includes('مرتين') || freqLower.includes('every 12') || freqLower.includes('every 8');

      setMorning(hasMorning);
      setNoon(hasNoon);
      setNight(hasNight);

      // Guess interval
      if (freqLower.includes('every 8') || freqLower.includes('8 ساعات') || freqLower.includes('3 times') || freqLower.includes('مرات')) {
        setIntervalOption('8h');
      } else if (freqLower.includes('every 12') || freqLower.includes('12 ساعة') || freqLower.includes('twice') || freqLower.includes('مرتين')) {
        setIntervalOption('12h');
      } else if (freqLower.includes('every 24') || freqLower.includes('once') || freqLower.includes('مرة يوميا')) {
        setIntervalOption('24h');
      } else {
        setIntervalOption('custom');
      }

      // Default inventory
      if (medication.name.includes('Syrup') || medication.name.includes('شراب') || form.toLowerCase() === 'syrup') {
        setInventoryQty(100);
      } else {
        setInventoryQty(30);
      }
    }
  }, [isOpen, medication]);

  if (!isOpen) return null;

  // Handle auto intervals
  const handleIntervalChange = (val: string) => {
    setIntervalOption(val);
    if (val === '8h') {
      setMorning(true);
      setNoon(true);
      setNight(true);
    } else if (val === '12h') {
      setMorning(true);
      setNoon(false);
      setNight(true);
    } else if (val === '24h') {
      setMorning(true);
      setNoon(false);
      setNight(false);
    } else if (val === 'needed') {
      setMorning(false);
      setNoon(false);
      setNight(false);
      setFoodInstruction('needed');
    }
  };

  // Icon Classification preview
  const renderMedIcon = () => {
    const f = form.toLowerCase();
    const styleStr = "w-12 h-12 p-2.5 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-all duration-300 ";
    
    if (f.includes('syrup') || f.includes('liquid') || f.includes('شراب') || f.includes('معلق')) {
      return (
        <div className={styleStr + "bg-amber-100 text-amber-700"}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
      );
    } else if (f.includes('injection') || f.includes('ampoule') || f.includes('حقن') || f.includes('ابرة')) {
      return (
        <div className={styleStr + "bg-rose-100 text-rose-700"}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 9.172v.24a4.502 4.502 0 01-3.172 4.292L14.25 14.5l-3.328-3.328 1-1.328a4.5 4.5 0 014.292-3.172h.24a2.25 2.25 0 012.25 2.25z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l-4.75 4.75m4.75-4.75L6.5 16.5m2.5-2.25H4.5m4.75 4.75L12 21m-7.25-2.25L3 21" />
          </svg>
        </div>
      );
    } else if (f.includes('drops') || f.includes('قطرة') || f.includes('عين')) {
      return (
        <div className={styleStr + "bg-indigo-100 text-indigo-700"}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
      );
    } else {
      // Default Pill
      return (
        <div className={styleStr + "bg-teal-100 text-teal-700"}>
          <Pill className="w-7 h-7" />
        </div>
      );
    }
  };

  const handleSaveClick = () => {
    // Construct dynamic description
    const selectedTimes: string[] = [];
    if (morning) selectedTimes.push("09:00 AM");
    if (noon) selectedTimes.push("02:00 PM");
    if (night) selectedTimes.push("10:00 PM");

    let foodText = '';
    if (foodInstruction === 'before') foodText = 'قبل الأكل';
    if (foodInstruction === 'after') foodText = 'بعد الأكل';
    if (foodInstruction === 'needed') foodText = 'عند اللزوم';

    // Form Arabic and English frequency
    let dynamicFrequency = '';
    if (intervalOption === '8h') dynamicFrequency = '3 مرات يومياً (كل 8 ساعات)';
    else if (intervalOption === '12h') dynamicFrequency = 'مرتين يومياً (كل 12 ساعة)';
    else if (intervalOption === '24h') dynamicFrequency = 'مرة واحدة يومياً (كل 24 ساعة)';
    else if (foodInstruction === 'needed') dynamicFrequency = 'عند اللزوم فقط';
    else {
      const parts = [];
      if (morning) parts.push("صباحاً");
      if (noon) parts.push("ظهراً");
      if (night) parts.push("مساءً");
      dynamicFrequency = parts.length > 0 ? parts.join(' و ') : 'حسب الحاجة';
    }

    const updatedMed: Medication & { timings?: string[], foodInstruction?: string, inventoryQty?: number, refillAlertEnabled?: boolean } = {
      ...medication,
      name: name || medication.name,
      dosage: dosage || "Unknown",
      form: form || "Tablet",
      frequency: dynamicFrequency,
      duration: duration || "حسب الطبيب",
      specialInstructions: foodText || medication.specialInstructions,
      timings: selectedTimes.length > 0 ? selectedTimes : ["09:00 AM"],
      foodInstruction: foodInstruction,
      inventoryQty: Number(inventoryQty) || 20,
      refillAlertEnabled: refillAlertEnabled,
    };

    onSave(updatedMed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col md:max-h-[90vh] animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header Block */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            {renderMedIcon()}
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">تعديل مواعيد الدواء والجرعة</h2>
              <p className="text-xs text-slate-500 mt-0.5">جدولة دقيقة بأسلوب Medisafe الذكي</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-right">
          
          {/* Section: Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">اسم الدواء</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: بانادول"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الجرعة (Dosage)</label>
              <input 
                type="text" 
                value={dosage} 
                onChange={(e) => setDosage(e.target.value)}
                placeholder="مثال: 500mg أو كبسولة"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">شكل الدواء</label>
              <select 
                value={form} 
                onChange={(e) => setForm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              >
                <option value="Tablet">أقراص (Tablets)</option>
                <option value="Capsule">كبسولات (Capsules)</option>
                <option value="Syrup">شراب / سائل (Syrup)</option>
                <option value="Injection">حقن (Injection)</option>
                <option value="Drops">قطرة (Drops)</option>
                <option value="Inhaler">بخاخ (Inhaler)</option>
                <option value="Ointment">مرهم / كريم (Ointment)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">المدة (Duration)</label>
              <input 
                type="text" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                placeholder="مثال: 7 أيام"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Section: Interval Automations */}
          <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100/50">
            <h4 className="text-sm font-bold text-teal-950 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
              أتمتة الفترات الزمنية السريعة:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                type="button"
                onClick={() => handleIntervalChange('24h')}
                className={`py-2 px-3 text-xs rounded-xl font-bold border transition-all ${intervalOption === '24h' ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                كل 24 ساعة (مرة)
              </button>
              <button 
                type="button"
                onClick={() => handleIntervalChange('12h')}
                className={`py-2 px-3 text-xs rounded-xl font-bold border transition-all ${intervalOption === '12h' ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                كل 12 ساعة (مرتين)
              </button>
              <button 
                type="button"
                onClick={() => handleIntervalChange('8h')}
                className={`py-2 px-3 text-xs rounded-xl font-bold border transition-all ${intervalOption === '8h' ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                كل 8 ساعات (3 مرات)
              </button>
              <button 
                type="button"
                onClick={() => handleIntervalChange('needed')}
                className={`py-2 px-3 text-xs rounded-xl font-bold border transition-all ${intervalOption === 'needed' ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                عند اللزوم فقط
              </button>
            </div>
          </div>

          {/* Section: Visual Time Blocks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">مواعيد تناول الدوّاء (أوقات التنبيه)</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                type="button"
                onClick={() => { setMorning(!morning); setIntervalOption('custom'); }}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${morning ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-2xl">🌅</span>
                <span className="font-bold text-sm">الصبح</span>
                <span className="text-xs text-slate-500">09:00 AM</span>
              </button>

              <button 
                type="button"
                onClick={() => { setNoon(!noon); setIntervalOption('custom'); }}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${noon ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-2xl">☀️</span>
                <span className="font-bold text-sm">الظهر</span>
                <span className="text-xs text-slate-500">02:00 PM</span>
              </button>

              <button 
                type="button"
                onClick={() => { setNight(!night); setIntervalOption('custom'); }}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${night ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-2xl">🌙</span>
                <span className="font-bold text-sm">بالليل</span>
                <span className="text-xs text-slate-500">10:00 PM</span>
              </button>
            </div>
            {!morning && !noon && !night && intervalOption !== 'needed' && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                تحذير: لم تختر أي مواعيد. سيتم جدولة الدواء للتنبيه عند الحاجة فقط.
              </p>
            )}
          </div>

          {/* Section: Food Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">العلاقة بالوجبات</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                type="button"
                onClick={() => setFoodInstruction('before')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${foodInstruction === 'before' ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>🍽️</span> قبل الأكل
              </button>

              <button 
                type="button"
                onClick={() => setFoodInstruction('after')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${foodInstruction === 'after' ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>🍔</span> بعد الأكل
              </button>

              <button 
                type="button"
                onClick={() => setFoodInstruction('needed')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${foodInstruction === 'needed' ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>💊</span> عند اللزوم
              </button>
            </div>
          </div>

          {/* Section: Inventory & Alarm */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">كمية العلبة المتوفرة بالمخزون</label>
              <div className="relative flex items-center">
                <input 
                  type="number" 
                  value={inventoryQty} 
                  onChange={(e) => setInventoryQty(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none font-bold"
                  placeholder="مثال: 30 قرص أو 100 مل"
                />
                <span className="absolute left-3 text-xs font-bold text-slate-400 bg-slate-100 py-1.5 px-3 rounded-lg">
                  {form.toLowerCase().includes('syrup') ? 'مللي (ml)' : 'جرعة/قرص'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">يساعدنا ذلك في تنبيهك قبل نفاد المخزون من الصيدلية المنزلية.</p>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200/60 mt-3">
              <div className="flex items-start gap-2.5">
                <div className="bg-teal-100 p-1.5 rounded-lg text-teal-700 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">تفعيل جرس النفاذ (Refill Guard)</h5>
                  <p className="text-xs text-slate-500 mt-0.5">سنقوم بتنبيهك فور تبقي أقل من 5 جرعات بالعلبة.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={refillAlertEnabled} 
                  onChange={(e) => setRefillAlertEnabled(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 pointer-events-none"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
          {onDelete ? (
            <button 
              type="button" 
              onClick={() => { onDelete(); onClose(); }}
              className="px-4 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-sm font-bold flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              حذف تماماً
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="button" 
              onClick={handleSaveClick}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm shadow-teal-600/10 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
