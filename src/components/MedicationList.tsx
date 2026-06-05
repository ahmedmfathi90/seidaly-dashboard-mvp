import React, { useState } from 'react';
import { Pill, Clock, CheckCircle2, AlertCircle, Edit3, Settings, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Medication } from '../types';
import QuickEditModal from './QuickEditModal';

interface MedicationListProps {
  medications: Medication[];
  onUpdateMedications: (updatedMeds: Medication[]) => void;
  onReset: () => void;
}

export default function MedicationList({ medications, onUpdateMedications, onReset }: MedicationListProps) {
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [expandedCards, setExpandedCards] = useState<{[id: string]: boolean}>({});

  if (!medications || medications.length === 0) return null;

  const toggleAccordion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards(prev => ({...prev, [id]: !prev[id]}));
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

  const resolveAmbiguity = (medId: string, selectedOption: string) => {
    const nextMeds = medications.map(m => {
      if (m.id === medId) {
        return { ...m, name: selectedOption, medicationName: selectedOption } as Medication;
      }
      return m;
    });
    onUpdateMedications(nextMeds);
    setExpandedCards(prev => ({...prev, [medId]: true}));
  };

  const isFrequencyUnclear = (freq?: string) => {
    if (!freq) return true;
    const lower = freq.toLowerCase();
    return lower === 'unknown' || lower === 'غير محدد' || lower.trim() === '';
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
            تم فك الرموز. راجع الأدوية وحدد مواعيد الجرعات بدقة.
          </p>
        </div>
        <button 
          onClick={onReset}
          className="text-teal-400 hover:text-teal-300 text-sm font-extrabold bg-slate-950/40 hover:bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          مسح روشتة أخرى
        </button>
      </div>

      <div className="space-y-4">
        {medications.map((med, index) => {
          const rawName = med.name || (med as any).medicationName || (med as any).medicineName || "دواء غير معروف";
          const isAmbiguous = Array.isArray(rawName);
          const isFreqUnclear = isFrequencyUnclear(med.frequency);
          const isExpanded = expandedCards[med.id || index.toString()];

          return (
            <div 
              key={med.id || index} 
              className={`bg-slate-900/60 backdrop-blur-md rounded-2xl border ${isAmbiguous ? 'border-amber-500/50' : 'border-slate-800'} shadow-lg relative overflow-hidden flex flex-col p-5 transition-all`}
              dir="rtl"
            >
              <div className={`absolute top-0 right-0 left-0 h-1 ${isAmbiguous ? 'bg-amber-500' : 'bg-teal-500'}`}></div>

              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  {!isAmbiguous && (
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-white">{rawName}</h3>
                      <div className="flex items-center bg-teal-500/10 text-teal-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-teal-500/20">
                        <CheckCircle className="w-3 h-3 ml-1" />
                        مؤكد
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingMedication(med);
                  }}
                  className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-full transition-all border border-slate-800 cursor-pointer shrink-0 ml-[-8px] mt-[-8px]"
                  title="تعديل تفاصيل الدواء يدوياً"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {isAmbiguous ? (
                <div className="bg-amber-950/10 border border-amber-900/30 p-4 rounded-xl mb-2">
                  <div className="flex items-start gap-2 text-amber-400 mb-4 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">خط الروشتة غير واضح تماماً، يرجى اختيار الدواء الصحيح أولاً:</span>
                  </div>
                  <div className="space-y-2.5">
                    {rawName.map((option: string, idx: number) => (
                      <label key={idx} className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-800 bg-slate-950/50 cursor-pointer hover:bg-slate-900 transition-colors shadow-sm">
                        <input 
                          type="radio" 
                          name={`med-${med.id}`} 
                          className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 focus:ring-2 accent-amber-500 cursor-pointer" 
                          onChange={() => resolveAmbiguity(med.id || index.toString(), option)} 
                        />
                        <span className="text-slate-200 font-bold text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <div className="flex flex-wrap items-center text-slate-300 text-sm gap-2 font-semibold bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="flex items-center gap-1.5 text-teal-400">
                      <Pill className="w-4 h-4" />
                      <span>{med.form === 'Unknown' ? 'قرص' : med.form}</span>
                    </div>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <span className="font-bold text-slate-200">{med.dosage === 'Unknown' ? 'الجرعة غير محددة' : med.dosage}</span>
                  </div>

                  {isFreqUnclear ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-rose-950/20 border border-rose-900/30 p-4 rounded-xl">
                      <div className="flex items-start gap-2 text-rose-400 text-sm font-bold w-full sm:w-auto">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">مواعيد الجرعة غير واضحة في الروشتة</span>
                      </div>
                      <button 
                        onClick={() => setEditingMedication(med)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-black py-2.5 px-5 rounded-xl shadow-lg shadow-teal-500/20 transition-all whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                      >
                        📅 حدد مواعيد التذكير يدوياً
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-teal-950/20 border border-teal-900/30 p-4 rounded-xl">
                      <div className="bg-teal-950/50 p-2 rounded-lg shrink-0">
                        <Clock className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-teal-500/70 mb-0.5">مواعيد التذكير المستخرجة</span>
                        <span className="block text-sm font-black text-teal-300">{med.frequency}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                    <button 
                      onClick={(e) => toggleAccordion(med.id || index.toString(), e)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-950/50 hover:bg-slate-900 text-slate-300 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">التفاصيل السريرية للدواء</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 bg-slate-950/30 border-t border-slate-800 text-sm text-slate-300 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {med.activeIngredient && med.activeIngredient !== "غير محدد" && (
                          <div>
                            <span className="font-bold text-slate-500 block mb-1 text-xs">المادة الفعالة:</span>
                            <span className="text-indigo-300 font-semibold">{med.activeIngredient}</span>
                          </div>
                        )}
                        {med.medicalUse && med.medicalUse !== "غير محدد" && (
                          <div>
                            <span className="font-bold text-slate-500 block mb-1 text-xs">دواعي الاستعمال:</span>
                            <span className="text-emerald-400/90 font-semibold leading-relaxed block">{med.medicalUse}</span>
                          </div>
                        )}
                        {med.specialInstructions && med.specialInstructions.toLowerCase() !== "unknown" && med.specialInstructions.trim() !== "" && (
                          <div className="flex items-start text-amber-300/80 bg-amber-950/20 p-3 rounded-lg border border-amber-950/50 mt-3 text-xs leading-relaxed">
                            <Settings className="w-4 h-4 ml-2 shrink-0 mt-0.5" />
                            <span className="font-bold">{med.specialInstructions}</span>
                          </div>
                        )}
                        {med.detailedInfo?.sideEffects && med.detailedInfo.sideEffects.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/50">
                            <span className="font-bold text-slate-500 block mb-2 text-xs">الأعراض الجانبية المحتملة:</span>
                            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
                              {med.detailedInfo.sideEffects.map((se, i) => (
                                <li key={i}>{se}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
