import React, { useState } from 'react';
import { Pill, Clock, Calendar, CheckCircle2, AlertCircle, Info, ImageOff, Edit3, Settings } from 'lucide-react';
import { Medication } from '../types';
import MedicationInfoModal from './MedicationInfoModal';
import QuickEditModal from './QuickEditModal';

interface MedicationListProps {
  medications: Medication[];
  onUpdateMedications: (updatedMeds: Medication[]) => void;
  onReset: () => void;
}

export default function MedicationList({ medications, onUpdateMedications, onReset }: MedicationListProps) {
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  if (!medications || medications.length === 0) return null;

  // Check if medication is missing dosages or timings (OCR raw/null)
  const isFlagged = (med: Medication) => {
    const dosageLower = (med.dosage || '').toLowerCase();
    const freqLower = (med.frequency || '').toLowerCase();
    const isNoDosage = !dosageLower || dosageLower === 'unknown' || dosageLower.trim() === '';
    const isNoFreq = !freqLower || freqLower === 'unknown' || freqLower.trim() === '';
    return isNoDosage || isNoFreq;
  };

  const handleEditSave = (updated: Medication) => {
    const nextMeds = medications.map(m => m.id === updated.id ? updated : m);
    onUpdateMedications(nextMeds);
    setEditingMedication(null);
  };

  const handleEditDelete = () => {
    if (editingMedication) {
      const nextMeds = medications.filter(m => m.id !== editingMedication.id);
      onUpdateMedications(nextMeds);
      setEditingMedication(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800" dir="rtl">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-teal-400 flex items-center justify-start gap-2">
            <CheckCircle2 className="w-6 h-6 text-teal-450" />
            جاهز للمراجعة والتعديل
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            تم فك الرموز واستخراجه بنجاح. اضغط على أي بطاقة لتعديل المواعيد أو الكمية.
          </p>
        </div>
        <button 
          onClick={onReset}
          className="text-teal-400 hover:text-teal-300 text-sm font-extrabold bg-slate-950/40 hover:bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          مسح روشتة أخرى
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {medications.map((med, index) => {
          const isWarning = isFlagged(med);
          // Map names robustly in case keys came back as medicationName
          const name = med.name || (med as any).medicationName || (med as any).medicineName || "دواء غير معروف";
          const hasRealImage = med.medicineBoxImageUrl && !med.medicineBoxImageUrl.includes("placehold.co");
          const displayImage = hasRealImage ? med.medicineBoxImageUrl : 
            (med.form?.toLowerCase().includes("syrup") || med.form?.toLowerCase().includes("liquid") || med.form?.includes("شراب")
              ? "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=80" 
              : "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80");

          return (
            <div 
              key={med.id || index} 
              onClick={() => setEditingMedication(med)}
              className={`bg-slate-900/60 backdrop-blur-md rounded-3xl border hover:border-teal-500/50 shadow-lg hover:shadow-xl transition-all relative overflow-hidden group flex flex-col cursor-pointer ${isWarning ? 'border-amber-500/50' : 'border-slate-800'}`}
              dir="rtl"
            >
              {/* Highlight ribbon */}
              <div className={`absolute top-0 right-0 left-0 h-1.5 ${isWarning ? 'bg-amber-500' : 'bg-teal-500'}`}></div>
              
              <div className="h-40 w-full relative bg-slate-950/40 border-b border-slate-800/80 overflow-hidden shrink-0">
                <img 
                  src={displayImage} 
                  alt={`Medicine box for ${name}`} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-95"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none"></div>
                
                {/* Floating Glassmorphic Drug Package Design */}
                <div className="absolute bottom-3 right-4 left-4 flex justify-between items-center">
                  <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl max-w-[70%] truncate shadow-md">
                    <span className="text-[11px] font-black text-teal-400 tracking-wide uppercase">{name}</span>
                  </div>
                  <div className="flex items-center bg-teal-500/20 text-teal-400 text-[10px] font-extrabold px-2.5 py-1 rounded-md border border-teal-500/30 shadow-md">
                    مُعتمد
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {/* Visual Flag warning if data holds null */}
                {isWarning && (
                  <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>⚠️ يرجى تحديد الجرعة والمواعيد (اضغط للتعديل)</span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="text-right">
                    <h3 className="text-lg font-black text-white">{name}</h3>
                    <div className="flex items-center text-slate-400 text-xs mt-1.5 gap-2 font-semibold">
                      <Pill className="w-3.5 h-3.5 text-teal-400" />
                      <span>{med.form === 'Unknown' ? 'قرص' : med.form}</span>
                      <span>•</span>
                      <span className="font-bold text-slate-300">{med.dosage === 'Unknown' ? 'غير محدد' : med.dosage}</span>
                    </div>
                    {med.medicalUse && med.medicalUse !== "غير محدد" && (
                      <p className="text-emerald-400/80 text-[10px] font-bold mt-1.5 leading-snug">🩺 {med.medicalUse}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMedication(med);
                      }}
                      className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-full transition-all border border-slate-800 cursor-pointer"
                      title="معلومات الدواء"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMedication(med);
                      }}
                      className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-full transition-all border border-slate-800 cursor-pointer"
                      title="تعديل المواعيد"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 bg-slate-950/40 rounded-2xl p-4 border border-slate-800 mb-4 flex-1">
                  <div className="flex items-start text-xs gap-2">
                    <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">مواعيد التكرار</span>
                      <span className="text-white font-black">{med.frequency || 'حسب الحاجة / غير محدد'}</span>
                    </div>
                  </div>
                  <div className="flex items-start text-xs gap-2 pt-2 border-t border-slate-850">
                    <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">فترة العلاج</span>
                      <span className="text-slate-300 font-bold">{med.duration === 'Unknown' ? 'حسب الحاجة' : med.duration}</span>
                    </div>
                  </div>
                </div>

                {med.specialInstructions && med.specialInstructions.toLowerCase() !== "unknown" && med.specialInstructions.trim() !== "" && (
                  <div className="flex items-center text-xs text-indigo-300 bg-indigo-950/30 p-3 rounded-xl border border-indigo-950/60 mt-auto">
                    <Settings className="w-3.5 h-3.5 ml-1.5 shrink-0 text-indigo-400" />
                    <span className="font-bold">{med.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Medication factual information bottom sheets */}
      <MedicationInfoModal 
        medication={selectedMedication} 
        onClose={() => setSelectedMedication(null)} 
      />

      {/* Medisafe scheduling editor modal sheet */}
      {editingMedication && (
        <QuickEditModal
          medication={editingMedication}
          isOpen={!!editingMedication}
          onClose={() => setEditingMedication(null)}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
        />
      )}
    </div>
  );
}
