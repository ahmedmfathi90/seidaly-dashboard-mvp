import React, { useState } from 'react';
import { X, Info, AlertTriangle, ShieldAlert, Pill, Clock, Activity, FileText } from 'lucide-react';
import { Medication } from '../types';

interface MedicationInfoModalProps {
  medication: Medication | null;
  onClose: () => void;
}

export default function MedicationInfoModal({ medication, onClose }: MedicationInfoModalProps) {
  if (!medication) return null;

  const name = medication.name || (medication as any).medicationName || "دواء غير معروف";
  const displayImage = medication.medicineBoxImageUrl || 
    (medication.form?.toLowerCase().includes("syrup") || medication.form?.toLowerCase().includes("liquid") || medication.form?.includes("شراب")
      ? "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=80" 
      : "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80");

  const [activeTab, setActiveTab] = useState<'indications' | 'sideEffects' | 'contraindications'>('indications');

  const detailedInfo = medication.detailedInfo || {
    indications: ["علاج الأعراض العامة وتخفيف الآلام"],
    sideEffects: ["آمن بالجرعات العادية الموصى بها"],
    contraindications: ["الحساسية للمادة الفعالة بالدواء"]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 text-right" onClick={onClose} dir="rtl">
      <div 
        className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header Cover Image */}
        <div className="h-48 w-full relative bg-slate-950 overflow-hidden shrink-0">
          <img 
            src={displayImage} 
            alt={`Medicine box for ${name}`} 
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none"></div>
          
          {/* Glass Overlay with Title & Close button */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-950 border border-slate-800 rounded-full transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-teal-500/20 text-teal-400 text-xs font-black px-3.5 py-1.5 rounded-full border border-teal-500/30 backdrop-blur-md shadow-md">
              🩺 دليل الدواء الذكي
            </div>
          </div>

          <div className="absolute bottom-4 right-6 left-6">
            <h2 className="text-2xl font-black text-white tracking-wide truncate">{name}</h2>
            <p className="text-teal-400 text-xs font-bold mt-1 block uppercase tracking-widest">{medication.dosage} ({medication.form})</p>
            {medication.activeIngredient && medication.activeIngredient !== "غير محدد" && (
              <p className="text-sky-300 text-[10px] font-bold mt-1 opacity-80">💊 {medication.activeIngredient}</p>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3.5 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
          <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
            <Pill className="w-4 h-4 text-teal-400 mb-1" />
            <span className="text-[10px] text-slate-500 font-bold">الشكل الدوائي</span>
            <span className="text-xs font-black text-white mt-0.5">{medication.form || "أقراص"}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
            <Clock className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-[10px] text-slate-500 font-bold">جرعة التكرار</span>
            <span className="text-xs font-black text-white mt-0.5 truncate max-w-full">{medication.frequency || "كل 12 ساعة"}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
            <Activity className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[10px] text-slate-500 font-bold">فترة العلاج</span>
            <span className="text-xs font-black text-white mt-0.5">{medication.duration || "7 أيام"}</span>
          </div>
        </div>

        {/* Medical Use Badge */}
        {medication.medicalUse && medication.medicalUse !== "غير محدد" && (
          <div className="mx-6 my-2 px-4 py-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 shrink-0">
            <span className="text-base">🩺</span>
            <span>{medication.medicalUse}</span>
          </div>
        )}

        {/* Clinical Tabs Bar */}
        <div className="flex border-b border-slate-800 p-2 bg-slate-950/20 gap-1.5 shrink-0">
          <button 
            onClick={() => setActiveTab('indications')}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'indications' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>دواعي الاستعمال</span>
          </button>
          <button 
            onClick={() => setActiveTab('sideEffects')}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'sideEffects' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>الأعراض الجانبية</span>
          </button>
          <button 
            onClick={() => setActiveTab('contraindications')}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'contraindications' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>موانع الاستعمال</span>
          </button>
        </div>

        {/* Detailed Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 max-h-[40vh]">
          {activeTab === 'indications' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-teal-400 font-extrabold text-sm mb-1">
                <FileText className="w-4 h-4" />
                <span>متى يجب تناول واستعمال هذا الدواء؟</span>
              </div>
              <div className="space-y-2.5">
                {detailedInfo.indications.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl text-slate-300 text-xs font-bold leading-relaxed flex items-start gap-2.5 shadow-sm">
                    <span className="bg-teal-500/20 text-teal-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">{idx + 1}</span>
                    <span className="pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sideEffects' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>الآثار الجانبية المحتملة وطرق التعامل معها</span>
              </div>
              <div className="space-y-2.5">
                {detailedInfo.sideEffects.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl text-slate-300 text-xs font-bold leading-relaxed flex items-start gap-2.5 shadow-sm">
                    <span className="bg-amber-500/20 text-amber-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">{idx + 1}</span>
                    <span className="pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contraindications' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>تحذيرات هامة وموانع استعمال الدواء</span>
              </div>
              <div className="space-y-2.5">
                {detailedInfo.contraindications.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl text-slate-300 text-xs font-bold leading-relaxed flex items-start gap-2.5 shadow-sm border-l-2 border-l-rose-500/40">
                    <span className="bg-rose-500/20 text-rose-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">{idx + 1}</span>
                    <span className="pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Medical Disclaimer */}
        <div className="bg-slate-950/80 px-6 py-4 border-t border-slate-800 text-[10px] text-slate-500 font-medium text-center leading-relaxed shrink-0">
          ⚠️ تنبيه طبي هام: هذه المعلومات مستخرجة بدقة علمية للأغراض الإرشادية والتعليمية فقط. لا تستخدمها كبديل لاستشارة الطبيب المعالج أو الصيدلاني المختص.
        </div>
      </div>
    </div>
  );
}
