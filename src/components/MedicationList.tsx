import React, { useState } from 'react';
import { Pill, CheckCircle2, AlertCircle, Edit3, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Medication } from '../types';
import QuickEditModal from './QuickEditModal';
import { generateMedicationSchedules } from '../utils/scheduleHelper';

interface MedicationListProps {
  medications: Medication[];
  onUpdateMedications: (updatedMeds: Medication[]) => void;
  onReset: () => void;
}

/** Translates English drug forms / frequencies into clear Arabic */
const toArabic = (text?: string): string => {
  if (!text) return 'غير محدد';
  const t = text.trim();
  if (/[\u0600-\u06FF]/.test(t)) return t;
  const lower = t.toLowerCase();

  const map: Record<string, string> = {
    'tablet': 'أقراص', 'tablets': 'أقراص',
    'capsule': 'كبسولات', 'capsules': 'كبسولات',
    'syrup': 'شراب', 'liquid': 'سائل',
    'injection': 'حقن', 'injections': 'حقن',
    'drop': 'نقط', 'drops': 'نقط', 'oral drops': 'نقط بالفم',
    'ointment': 'مرهم', 'cream': 'كريم', 'gel': 'جل',
    'inhaler': 'بخاخ', 'spray': 'بخاخ', 'suppository': 'لبوس',
    'unknown': 'غير محدد',
    'once daily': 'مرة واحدة يومياً', 'once a day': 'مرة واحدة يومياً',
    'twice daily': 'مرتين يومياً', 'twice a day': 'مرتين يومياً',
    'three times daily': 'ثلاث مرات يومياً', 'three times a day': 'ثلاث مرات يومياً',
    'every 12 hours': 'كل ١٢ ساعة', 'every 8 hours': 'كل ٨ ساعات',
    'every 6 hours': 'كل ٦ ساعات', 'every 24 hours': 'كل ٢٤ ساعة',
    'as needed': 'عند اللزوم', 'when needed': 'عند اللزوم',
  };
  if (map[lower]) return map[lower];

  const hourMatch = lower.match(/every\s+(\d+)\s+hours?/);
  if (hourMatch) return `كل ${hourMatch[1]} ساعة`;

  // Replace known English tokens inside mixed strings
  let result = t;
  Object.entries(map).forEach(([en, ar]) => {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ar);
  });
  return result;
};

export default function MedicationList({ medications, onUpdateMedications, onReset }: MedicationListProps) {
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  if (!medications || medications.length === 0) return null;

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleAccordion = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEditSave = (updated: Medication) => {
    const finalMed = generateMedicationSchedules(updated) as Medication;
    onUpdateMedications(medications.map(m => (m.id === finalMed.id ? finalMed : m)));
    setEditingMedication(null);
  };

  const handleDelete = (medId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدواء من القائمة؟')) {
      onUpdateMedications(medications.filter(m => m.id !== medId));
      if (editingMedication?.id === medId) setEditingMedication(null);
    }
  };

  const resolveAmbiguity = (medId: string, selectedOption: string) => {
    onUpdateMedications(
      medications.map(m =>
        m.id === medId
          ? ({ ...m, name: selectedOption, medicationName: selectedOption } as Medication)
          : m
      )
    );
    setExpandedCards(prev => ({ ...prev, [medId]: true }));
  };

  const isFreqUnclear = (f?: string) => {
    if (!f) return true;
    const l = f.trim().toLowerCase();
    return !l || l === 'unknown' || l === 'غير محدد';
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* ── Section Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800" dir="rtl">
        <div className="text-right">
          <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            جاهز للمراجعة والتعديل
          </h2>
          <p className="text-slate-400 mt-1 text-xs">
            تم فك الرموز. راجع كل دواء وحدد مواعيد الجرعات بدقة.
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-teal-400 hover:text-teal-300 text-xs font-extrabold bg-slate-950/40 hover:bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0"
        >
          مسح روشتة أخرى
        </button>
      </div>

      {/* ── Cards ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {medications.map((med, index) => {
          const cardId = med.id || index.toString();
          const rawName = med.name || (med as any).medicationName || (med as any).medicineName || 'دواء غير معروف';
          const isAmbiguous = Array.isArray(rawName);
          const isExpanded = expandedCards[cardId];
          const hasActiveIngredient = med.activeIngredient && med.activeIngredient !== 'غير محدد';
          const hasMedicalUse = med.medicalUse && med.medicalUse !== 'غير محدد';
          const hasSpecialInstructions = med.specialInstructions && med.specialInstructions.toLowerCase() !== 'unknown' && med.specialInstructions.trim() !== '';
          const hasSideEffects = med.detailedInfo?.sideEffects && med.detailedInfo.sideEffects.length > 0;
          const hasAnyDetails = hasActiveIngredient || hasMedicalUse || hasSpecialInstructions || hasSideEffects || !isFreqUnclear(med.frequency);

          return (
            <div
              key={cardId}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isAmbiguous
                  ? 'border-amber-500/40 bg-slate-900/70'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
              dir="rtl"
            >
              {/* ── Top accent bar ── */}
              <div className={`h-1 ${isAmbiguous ? 'bg-gradient-to-l from-amber-500 to-orange-400' : 'bg-gradient-to-l from-teal-500 to-teal-400'}`} />

              {/* ── Card Header ── */}
              <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {!isAmbiguous && (
                    <h3 className="text-base font-black text-white truncate">{rawName}</h3>
                  )}
                  {isAmbiguous && (
                    <h3 className="text-base font-black text-amber-300">تأكيد اسم الدواء</h3>
                  )}
                  {!isAmbiguous && med.medicalUse && med.medicalUse !== 'غير محدد' && (
                    <p className="text-[11px] text-teal-400/80 font-semibold truncate mt-0.5">
                      {med.medicalUse}
                    </p>
                  )}
                </div>

                {/* ── Form / Dosage Tags ── */}
                {!isAmbiguous && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950/60 border border-slate-800 px-2 py-1 rounded-lg">
                      {toArabic(med.form)}
                    </span>
                    {med.dosage && med.dosage !== 'Unknown' && (
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-950/30 border border-teal-900/40 px-2 py-1 rounded-lg">
                        {toArabic(med.dosage)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Ambiguous: Radio Options ── */}
              {isAmbiguous && (
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold leading-relaxed">
                      ⚠️ الخط غير واضح بنسبة 100%.. يرجى تأكيد الدواء الصحيح:
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rawName.map((option: string, idx: number) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer hover:bg-slate-900/80 hover:border-slate-700 transition-all group"
                      >
                        <input
                          type="radio"
                          name={`ambig-${cardId}`}
                          className="w-4 h-4 accent-amber-500 cursor-pointer shrink-0"
                          onChange={() => resolveAmbiguity(cardId, option)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors block truncate">
                            {option}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                          احتمال {idx + 1}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Confirmed: Frequency + Accordion ── */}
              {!isAmbiguous && (
                <div className="px-5 pb-1">

                  {/* Frequency Status */}
                  {isFreqUnclear(med.frequency) ? (
                    <div className="flex items-center justify-between gap-3 bg-rose-950/15 border border-rose-900/30 p-3 rounded-xl mb-3">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>مواعيد الجرعة غير واضحة في الروشتة</span>
                      </div>
                      <button
                        onClick={() => setEditingMedication(med)}
                        className="text-[10px] font-black text-slate-950 bg-teal-500 hover:bg-teal-400 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                      >
                        📅 حدد يدوياً
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 bg-teal-950/15 border border-teal-900/30 p-3 rounded-xl mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">🕒</span>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold text-teal-500/60">الجرعة</span>
                          <span className="block text-sm font-black text-teal-300 truncate">{toArabic(med.frequency)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingMedication(med)}
                        className="flex items-center gap-1 text-[10px] font-black text-teal-400 hover:text-white bg-slate-950/40 hover:bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-3 h-3" />
                        تعديل يدوياً
                      </button>
                    </div>
                  )}

                  {/* ── Accordion ── */}
                  {hasAnyDetails && (
                    <div className="border border-slate-800/60 rounded-xl overflow-hidden mb-3">
                      <button
                        onClick={() => toggleAccordion(cardId)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/40 hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          🔽 تفاصيل الدواء والجرعة (اضغط للعرض)
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-slate-500" />
                          : <ChevronDown className="w-4 h-4 text-slate-500" />
                        }
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-3.5 bg-slate-950/30 border-t border-slate-800 space-y-3 text-sm">

                          {/* Dosage line */}
                          {med.dosage && med.dosage !== 'Unknown' && (
                            <div className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">•</span>
                              <div>
                                <span className="text-slate-500 text-xs font-bold">الجرعة: </span>
                                <span className="text-white font-bold">{toArabic(med.dosage)}</span>
                                {!isFreqUnclear(med.frequency) && (
                                  <span className="text-teal-400 font-semibold"> ({toArabic(med.frequency)})</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Active Ingredient */}
                          {hasActiveIngredient && (
                            <div className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">•</span>
                              <div>
                                <span className="text-slate-500 text-xs font-bold">المادة الفعالة: </span>
                                <span className="text-indigo-300 font-semibold">{med.activeIngredient}</span>
                              </div>
                            </div>
                          )}

                          {/* Medical Use */}
                          {hasMedicalUse && (
                            <div className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">•</span>
                              <div>
                                <span className="text-slate-500 text-xs font-bold">الاستخدام: </span>
                                <span className="text-emerald-400/90 font-semibold">{med.medicalUse}</span>
                              </div>
                            </div>
                          )}

                          {/* Side Effects */}
                          {hasSideEffects && (
                            <div className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">•</span>
                              <div>
                                <span className="text-slate-500 text-xs font-bold">الأعراض الجانبية: </span>
                                <span className="text-amber-300/80 font-semibold">
                                  {med.detailedInfo!.sideEffects.join('، ')}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Special Instructions */}
                          {hasSpecialInstructions && (
                            <div className="bg-amber-950/15 border border-amber-900/30 p-2.5 rounded-lg flex items-start gap-2 text-xs">
                              <span className="shrink-0 mt-0.5">⚠️</span>
                              <span className="text-amber-300 font-bold leading-relaxed">{med.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Bottom Actions Bar ── */}
              <div className="px-5 py-2.5 border-t border-slate-800/50 flex items-center justify-end bg-slate-950/20">
                <button
                  onClick={() => handleDelete(cardId)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-450 hover:bg-rose-950/20 border border-transparent px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف الدواء
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── QuickEdit Modal ───────────────────────────────────── */}
      {editingMedication && (
        <QuickEditModal
          medication={editingMedication}
          isOpen={!!editingMedication}
          onClose={() => setEditingMedication(null)}
          onSave={handleEditSave}
          onDelete={() => {
            if (editingMedication) {
              onUpdateMedications(medications.filter(m => m.id !== editingMedication.id));
              setEditingMedication(null);
            }
          }}
        />
      )}
    </div>
  );
}
