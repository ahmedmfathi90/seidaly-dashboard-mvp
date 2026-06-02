import React, { useState } from 'react';
import { 
  Pill, Activity, Camera, ScanBarcode, UserPlus, FileEdit, 
  CheckCircle2, AlertTriangle, Users, BookOpen, Save, 
  Plus, Trash2, Bell, RefreshCw, ChevronLeft, ChevronRight, Check, X,
  ArrowLeft
} from 'lucide-react';
import PrescriptionUpload from './PrescriptionUpload';
import MedicationList from './MedicationList';
import MedicationInfoModal from './MedicationInfoModal';
import { Medication } from '../types';
import { useAuth } from '../context/AuthContext';
import { lookupMedication, getSimulatedPrescriptionMeds } from '../data/medicationDb';
import { scanPrescriptionClient, getDrugInfoClient, compressImage } from '../utils/geminiClient';

// Define typed schema for archive folders
interface ArchivedVisit {
  id: string;
  clinicName: string;
  date: string;
  medsCount: number;
  medications: { name: string; dosage: string; form?: string }[];
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar: string;
}

export default function Dashboard() {
  const { userName } = useAuth();
  const [streak, setStreak] = useState(5);
  const [scanOpen, setScanOpen] = useState(false);

  // --- Family Members Profile State ---
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: "me", name: userName, relation: "أنا", avatar: "👨‍⚕️" },
    { id: "father", name: "الوالد (الأب)", relation: "الأب", avatar: "👴" },
    { id: "mother", name: "الوالدة (الأم)", relation: "الأم", avatar: "👵" }
  ]);

  const [activeMemberId, setActiveMemberId] = useState<string>("me");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("ابن");
  const [newMemberAvatar, setNewMemberAvatar] = useState("👶");

  // Keep family names updated if the main user changes their name in auth
  React.useEffect(() => {
    setFamilyMembers(prev => prev.map(m => m.id === "me" ? { ...m, name: userName } : m));
  }, [userName]);

  // --- Multi-Profile Storage System ---
  const [membersData, setMembersData] = useState<{
    [key: string]: {
      medications: Medication[];
      archivedScans: ArchivedVisit[];
      takenSlots: { [key: string]: boolean };
    }
  }>({
    me: {
      medications: [],
      archivedScans: [],
      takenSlots: {}
    },
    father: {
      medications: [],
      archivedScans: [],
      takenSlots: {}
    },
    mother: {
      medications: [],
      archivedScans: [],
      takenSlots: {}
    }
  });

  // Helper getters for active profile
  const currentMemberData = membersData[activeMemberId] || { medications: [], archivedScans: [], takenSlots: {} };
  const medications = currentMemberData.medications;
  const archivedScans = currentMemberData.archivedScans;
  const takenSlots = currentMemberData.takenSlots;

  // Helper setters for active profile
  const setMedications = (updater: Medication[] | ((prev: Medication[]) => Medication[])) => {
    setMembersData(prev => {
      const prevData = prev[activeMemberId] || { medications: [], archivedScans: [], takenSlots: {} };
      const nextMeds = typeof updater === 'function' ? updater(prevData.medications) : updater;
      return {
        ...prev,
        [activeMemberId]: {
          ...prevData,
          medications: nextMeds
        }
      };
    });
  };

  const setArchivedScans = (updater: ArchivedVisit[] | ((prev: ArchivedVisit[]) => ArchivedVisit[])) => {
    setMembersData(prev => {
      const prevData = prev[activeMemberId] || { medications: [], archivedScans: [], takenSlots: {} };
      const nextScans = typeof updater === 'function' ? updater(prevData.archivedScans) : updater;
      return {
        ...prev,
        [activeMemberId]: {
          ...prevData,
          archivedScans: nextScans
        }
      };
    });
  };

  const setTakenSlots = (updater: { [key: string]: boolean } | ((prev: { [key: string]: boolean }) => { [key: string]: boolean })) => {
    setMembersData(prev => {
      const prevData = prev[activeMemberId] || { medications: [], archivedScans: [], takenSlots: {} };
      const nextSlots = typeof updater === 'function' ? updater(prevData.takenSlots) : updater;
      return {
        ...prev,
        [activeMemberId]: {
          ...prevData,
          takenSlots: nextSlots
        }
      };
    });
  };

  // --- Flow State ---
  const [editableMedications, setEditableMedications] = useState<Medication[] | null>(null);
  const [clinicNameInput, setClinicNameInput] = useState("");
  const [visitDateInput, setVisitDateInput] = useState(new Date().toISOString().split('T')[0]);
  
  // Navigation / Drawer overlays
  const [viewArchiveOpen, setViewArchiveOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedVisit | null>(null);
  
  // Manual Add Form UI
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDosage, setNewDosage] = useState("");
  const [newForm, setNewForm] = useState("Tablet");


  // Medication Box Scanner State & Refs
  const boxScannerInputRef = React.useRef<HTMLInputElement>(null);
  const [isBoxScanning, setIsBoxScanning] = useState(false);
  const [scannedBoxInfo, setScannedBoxInfo] = useState<Medication | null>(null);

  const handleBoxScanSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsBoxScanning(true);
      setScannedBoxInfo(null);

      try {
        // High-performance compression for heavy mobile photos
        const { base64Data, mimeType } = await compressImage(file);

        // Call our client-side Serverless Gemini API Client!
        const medicationsWithIds = await scanPrescriptionClient(base64Data, mimeType);

        if (medicationsWithIds.length > 0) {
          // Open the information sheet popups directly without saving to active timeline schedule!
          setScannedBoxInfo(medicationsWithIds[0]);
        } else {
          alert("⚠️ لم يتم التعرف على علبة الدواء. يرجى تصويرها بوضوح تحت إضاءة جيدة.");
        }

      } catch (err: any) {
        console.error(err);
        alert("❌ حدث خطأ أثناء فحص علبة الدواء.");
      } finally {
        setIsBoxScanning(false);
        if (boxScannerInputRef.current) boxScannerInputRef.current.value = '';
      }
    }
  };

  // --- Dynamic Navigation Actions (Only Back Button Allowed) ---
  const handleGoBack = () => {
    if (selectedArchive) {
      setSelectedArchive(null);
    } else if (viewArchiveOpen) {
      setViewArchiveOpen(false);
    } else if (manualAddOpen) {
      setManualAddOpen(false);
    } else if (scanOpen) {
      setScanOpen(false);
    } else if (editableMedications) {
      setEditableMedications(null);
    } else if (addMemberOpen) {
      setAddMemberOpen(false);
    }
  };

  // Check if we are in any sub-view to show the back button
  const isSubViewActive = scanOpen || manualAddOpen || viewArchiveOpen || selectedArchive || editableMedications || addMemberOpen;

  // --- Medication Actions ---
  const handleMedicationUploadComplete = (medsFromOCR: any[]) => {
    const robustMappedMeds = medsFromOCR.map(m => {
      const name = m.name || m.medicationName || m.medicineName || m.drugName || "دواء غير معروف";
      const specialInstructions = m.specialInstructions || m.notes || m.special_instructions || "لا يوجد";
      return {
        ...m,
        name: name,
        medicationName: name,
        specialInstructions: specialInstructions,
        notes: specialInstructions,
        dosage: m.dosage || "غير محدد",
        form: m.form || "Tablet",
        frequency: m.frequency || "غير محدد",
        duration: m.duration || "غير محدد",
        activeIngredient: m.activeIngredient || "غير محدد",
        medicalUse: m.medicalUse || "غير محدد",
      };
    });
    setEditableMedications(robustMappedMeds);
    setClinicNameInput("");
    setScanOpen(false);
  };

  const handleSavePrescription = () => {
    if (!editableMedications || editableMedications.length === 0) return;

    const finalMeds = editableMedications.map(m => ({
      ...m,
      id: m.id || "med-" + Math.random().toString(36).substring(7),
      inventoryQty: m.inventoryQty || (m.form.toLowerCase().includes('syrup') ? 100 : 20),
      timings: m.timings || ["09:00 AM"],
    }));

    setMedications(prev => [...prev, ...finalMeds]);

    const newArchiveFolder: ArchivedVisit = {
      id: "archive-" + Math.random().toString(36).substring(7),
      clinicName: clinicNameInput || "روشتة جديدة بالذكاء الاصطناعي",
      date: visitDateInput || new Date().toISOString().split('T')[0],
      medsCount: finalMeds.length,
      medications: finalMeds.map(m => ({
        name: m.name,
        dosage: m.dosage,
        form: m.form
      }))
    };

    setArchivedScans(prev => [newArchiveFolder, ...prev]);
    setStreak(prev => prev + 1);
    setEditableMedications(null);
  };

  const handleManualAddSave = async () => {
    if (!newName.trim()) return;

    let enrichedMed: Medication = await getDrugInfoClient(newName);

    // Override with custom dosage or form if the user manually entered them in the form
    enrichedMed = {
      ...enrichedMed,
      id: "med-manual-" + Math.random().toString(36).substring(7),
      dosage: newDosage.trim() ? newDosage : enrichedMed.dosage,
      form: newForm || enrichedMed.form,
      timings: ["09:00 AM"],
      inventoryQty: 30
    };

    setMedications(prev => [...prev, enrichedMed!]);
    setNewName("");
    setNewDosage("");
    setManualAddOpen(false);
  };

  // --- Deletion Functions ---
  const handleDeleteMedication = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("هل أنت متأكد من رغبتك في إيقاف وحذف هذا الدواء من جدولك النشط؟")) {
      setMedications(prev => prev.filter(m => m.id !== idToDelete));
    }
  };

  const handleDeleteArchive = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("هل أنت متأكد من رغبتك في حذف هذه الروشتة المؤرشفة نهائياً؟")) {
      setArchivedScans(prev => prev.filter(scan => scan.id !== idToDelete));
      if (selectedArchive?.id === idToDelete) {
        setSelectedArchive(null);
      }
    }
  };

  // --- Family Addition Action ---
  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newId = "member-" + Math.random().toString(36).substring(7);
    const newMember: FamilyMember = {
      id: newId,
      name: newMemberName,
      relation: newMemberRelation,
      avatar: newMemberAvatar
    };

    setFamilyMembers(prev => [...prev, newMember]);
    
    // Initialize blank data for this member
    setMembersData(prev => ({
      ...prev,
      [newId]: {
        medications: [],
        archivedScans: [],
        takenSlots: {}
      }
    }));

    // Switch to this new member instantly
    setActiveMemberId(newId);
    setNewMemberName("");
    setAddMemberOpen(false);
  };

  // --- Calculation Helpers ---
  const activeMember = familyMembers.find(m => m.id === activeMemberId) || familyMembers[0];

  const toggleTaken = (medId: string, time: string) => {
    const key = `${medId}-${time}`;
    setTakenSlots(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const executeBuyRefill = (medId: string) => {
    setMedications(prev => prev.map(m => {
      if (m.id === medId) {
        return {
          ...m,
          inventoryQty: (m.inventoryQty || 0) + 30
        };
      }
      return m;
    }));
  };

  const lowStockMeds = medications.filter(m => (m.inventoryQty !== undefined && m.inventoryQty <= 5));

  const timelineItems: { med: Medication; time: string; period: string }[] = [];
  medications.forEach(med => {
    const times = med.timings && med.timings.length > 0 ? med.timings : ["09:00 AM"];
    times.forEach(t => {
      let arabicPeriod = "الصبح";
      if (t.includes("PM")) {
        const hour = parseInt(t.split(":")[0]);
        if (hour >= 1 && hour < 6) arabicPeriod = "الظهر";
        else arabicPeriod = "بالليل";
      }
      timelineItems.push({ med, time: t, period: arabicPeriod });
    });
  });

  const totalSlotsToday = timelineItems.length;
  const takenSlotsCount = timelineItems.filter(item => takenSlots[`${item.med.id}-${item.time}`]).length;

  if (scanOpen) {
    return (
      <div className="space-y-4">
        {/* Floating Quick Navigation (Only Back button allowed) */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-3.5 flex justify-start items-center shadow-lg max-w-4xl mx-auto" dir="rtl">
          <button onClick={handleGoBack} className="flex items-center gap-1.5 text-xs font-bold text-teal-400 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl transition-all cursor-pointer hover:scale-105">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            <span>رجوع للخلف</span>
          </button>
        </div>
        <PrescriptionUpload onScanComplete={handleMedicationUploadComplete} />
      </div>
    );
  }

  if (editableMedications) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500 text-right" dir="rtl">
        {/* Floating Quick Navigation (Only Back button allowed) */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-3.5 flex justify-start items-center shadow-lg" dir="rtl">
          <button onClick={handleGoBack} className="flex items-center gap-1.5 text-xs font-bold text-teal-400 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl transition-all cursor-pointer hover:scale-105">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            <span>رجوع للخلف</span>
          </button>
        </div>

        <div className="bg-slate-950/80 backdrop-blur-xl text-white rounded-3xl p-6 border border-slate-800 shadow-xl mb-4">
          <h3 className="text-xl font-black text-teal-400">خطوة أخيرة: تفقد المواعيد والجرعات</h3>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            قام محرك Seidaly بقراءة الروشتة وتحديد الأدوية. يمكنك الضغط على أي بطاقة بالأسفل لضبط جرس التنبيه أو تفعيل التنبيه بنفاذ العلبة بدقة متقدمة!
          </p>
        </div>

        <MedicationList 
          medications={editableMedications} 
          onUpdateMedications={(updated) => setEditableMedications(updated)}
          onReset={() => setScanOpen(true)}
        />
        
        {/* Pre-Save Folder & Action Area */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-lg mt-6">
          <h3 className="font-extrabold text-lg text-teal-400 mb-4 border-b border-slate-800 pb-3">أرشفة وحفظ الروشتة</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">اسم الطبيب المعالج / العيادة</label>
              <input 
                type="text" 
                value={clinicNameInput}
                onChange={(e) => setClinicNameInput(e.target.value)}
                placeholder="مثال: د. محمد سعيد (عيادة الباطنة)" 
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-sm font-semibold" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">تاريخ الروشتة / الزيارة</label>
              <input 
                type="date" 
                value={visitDateInput}
                onChange={(e) => setVisitDateInput(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-sm font-semibold text-left" dir="ltr" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              onClick={() => setEditableMedications(null)}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء تماماً
            </button>
            <button 
              onClick={handleSavePrescription}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 px-8 py-3 rounded-xl text-sm font-black transition-colors shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              حفظ وتفعيل التنبيهات
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Dynamic Global Navigation Bar (Only Back button allowed) */}
      {isSubViewActive && (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-3.5 flex justify-start items-center shadow-lg animate-in slide-in-from-top-3 duration-300" dir="rtl">
          <button onClick={handleGoBack} className="flex items-center gap-1.5 text-xs font-bold text-teal-400 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl transition-all cursor-pointer hover:scale-105">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            <span>رجوع للخلف</span>
          </button>
        </div>
      )}

      {/* Header Profile */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden text-right animate-in fade-in duration-500" dir="rtl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/5 rounded-full translate-x-12 -translate-y-12 opacity-50"></div>
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
             <span>{activeMember.avatar}</span>
             <span>الملف الطبي: {activeMember.name}</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">
             مساعد الصيدلة الذكي لـ {activeMember.relation} • {medications.length} أدوية نشطة في الجدول.
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end z-10 shrink-0 gap-2">
          <span className="bg-teal-950/30 text-teal-400 text-xs font-extrabold px-3 py-1.5 rounded-full border border-teal-950 shadow-sm">
             ⭐ مساعد صيدلي ذكي (نشط بالكامل)
          </span>
          <span className="text-[10px] text-slate-500 font-bold bg-slate-950/60 border border-slate-800 py-1 px-3.5 rounded-full">
            مستقر وسلس • Serverless
          </span>
        </div>
      </div>

      {/* Grid: Core Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
        <button 
          onClick={() => setScanOpen(true)} 
          className="group bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all text-right flex flex-col justify-between min-h-[150px] relative overflow-hidden cursor-pointer hover:scale-[1.02]"
        >
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
          <div className="bg-white/20 p-3 rounded-2xl w-fit self-end group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg">AI مسح روشتة لـ {activeMember.relation}</h3>
            <p className="text-teal-100 text-xs mt-1 font-medium">تفسير تلقائي للخط اليدوي وصرف الأدوية فوراً للملف الحالي</p>
          </div>
        </button>

        <button 
          onClick={() => {
            if (!isBoxScanning) boxScannerInputRef.current?.click();
          }}
          disabled={isBoxScanning}
          className="group bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 text-slate-100 border border-slate-800 shadow-lg hover:shadow-xl transition-all text-right flex flex-col justify-between min-h-[150px] cursor-pointer hover:scale-[1.02] disabled:cursor-wait"
        >
          <div className="bg-slate-950/40 p-3 rounded-2xl w-fit self-end text-slate-350 group-hover:scale-110 transition-transform border border-slate-800">
            {isBoxScanning ? (
              <span className="inline-block w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Camera className="w-6 h-6 text-teal-400" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">
              {isBoxScanning ? "جاري فحص العلبة..." : "تصوير علبة الدواء"}
            </h3>
            <p className="text-slate-400 text-xs mt-1">التقاط صورة للعلبة للتعرف التلقائي على المادة الفعالة ودواعي الاستعمال</p>
          </div>
        </button>

        {/* Hidden inputs to capture physical medication boxes directly from the camera */}
        <input 
          type="file" 
          ref={boxScannerInputRef} 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleBoxScanSelected} 
        />

        <button 
          onClick={() => setManualAddOpen(true)}
          className="group bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 text-slate-100 border border-slate-800 shadow-lg hover:shadow-xl transition-all text-right flex flex-col justify-between min-h-[150px] cursor-pointer hover:scale-[1.02]"
        >
          <div className="bg-slate-950/40 p-3 rounded-2xl w-fit self-end text-indigo-400 group-hover:scale-110 transition-transform border border-slate-800">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">تسجيل يدوي سريع</h3>
            <p className="text-slate-400 text-xs mt-1">إضافة أدوية فيتامينات أو مكملات مباشرة</p>
          </div>
        </button>
      </div>

      {/* Manual Add Expandable Dialog */}
      {manualAddOpen && (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-5 shadow-lg text-right mt-2 animate-in slide-in-from-top-4" dir="rtl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <h4 className="font-black text-teal-400 flex items-center gap-1">
              <Plus className="w-4 h-4 text-teal-400" />
              إضافة دواء يدوياً للجدول اليومي
            </h4>
            <button onClick={() => setManualAddOpen(false)} className="text-slate-400 hover:text-slate-300 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم الدواء</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: فيتامين د" 
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/20 outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">الجرعة</label>
              <input 
                type="text" 
                value={newDosage}
                onChange={(e) => setNewDosage(e.target.value)}
                placeholder="مثال: حبة واحدة" 
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/20 outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">الشكل</label>
              <select 
                value={newForm}
                onChange={(e) => setNewForm(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/20 outline-none bg-slate-900"
              >
                <option value="Tablet">أقراص (Tablet)</option>
                <option value="Capsule">كبسولات (Capsule)</option>
                <option value="Syrup">شراب (Syrup)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
            <button onClick={() => setManualAddOpen(false)} className="px-4 py-1.5 text-xs text-slate-400 cursor-pointer">إلغاء</button>
            <button onClick={handleManualAddSave} className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs px-5 py-1.5 rounded-lg cursor-pointer">إضافة</button>
          </div>
        </div>
      )}

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Timeline & Streaks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Adherence Streak Widget */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-3xl p-5 text-slate-950 flex items-center justify-between shadow-lg relative overflow-hidden" dir="rtl">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8"></div>
            <div>
              <h4 className="font-black text-lg flex items-center gap-1.5">
                🔥 سلسلة الالتزام المتواصلة: {streak} أيام!
              </h4>
              <p className="text-slate-900 text-xs mt-1 font-medium">خطوة رائعة نحو المحافظة على انتظام نسب دواءك بالدم لـ {activeMember.name}.</p>
            </div>
            <div className="text-2xl font-black bg-white/20 px-4 py-2 rounded-xl text-right">
              {totalSlotsToday > 0 ? Math.round((takenSlotsCount / totalSlotsToday) * 100) : 100}% التزام
            </div>
          </div>

          {/* Today Timeline */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 shadow-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6" dir="rtl text-right">
              <h3 className="font-extrabold text-lg text-teal-400 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400 animate-pulse" />
                مخطط جدولة اليوم لـ ({activeMember.name})
              </h3>
              <p className="text-xs text-slate-400 font-bold bg-slate-950/60 border border-slate-800 px-3 py-1 rounded-lg">
                أنجزت {takenSlotsCount} من أصل {totalSlotsToday} جرعات اليوم
              </p>
            </div>
            
            <div className="space-y-3.5">
              {timelineItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-medium">
                  <Pill className="w-8 h-8 mx-auto mb-2 opacity-30 animate-bounce" />
                  لا يوجد جرعات مجدولة لـ {activeMember.name} حالياً. <br />
                  <span className="text-xs text-slate-500">قم بمسح روشتة أو إضافة دواء يدوياً لتفعيل الجدولة الحية!</span>
                </div>
              ) : (
                timelineItems.map((item, index) => {
                  const itemKey = `${item.med.id}-${item.time}`;
                  const isTaken = !!takenSlots[itemKey];

                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${isTaken ? 'bg-teal-950/20 border-teal-900/50 opacity-70' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}
                      dir="rtl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isTaken ? 'bg-teal-950 text-teal-400' : 'bg-slate-900 text-slate-500'}`}>
                          {item.period === "الصبح" ? "🌅" : item.period === "الظهر" ? "☀️" : "🌙"}
                        </div>
                        <div className="text-right">
                          <h4 className={`font-bold text-white text-sm ${isTaken ? 'line-through text-slate-500' : ''}`}>
                            {item.med.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-bold block mt-0.5" dir="ltr">
                            {item.med.dosage} ({item.med.form}) • {item.time} ({item.period})
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Delete Medication Button */}
                        <button
                          onClick={(e) => handleDeleteMedication(item.med.id!, e)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-900/60"
                          title="إزالة الدواء من الجدول"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => toggleTaken(item.med.id!, item.time)}
                          className={`rounded-full p-2 transition-all cursor-pointer ${isTaken ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/10' : 'border-2 border-slate-700 hover:border-teal-400 text-transparent'}`}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Family Panel, Inventory & Archives */}
        <div className="space-y-6">
          
          {/* Family Profiles Management Section */}
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-lg text-right" dir="rtl">
            <h4 className="font-extrabold text-teal-400 text-sm mb-4 flex items-center justify-start gap-1.5">
               <Users className="w-4 h-4 text-teal-400" />
               ملفات العائلة الطبية المزامنة
            </h4>

            {/* Profile Bubbles Grid */}
            <div className="flex flex-wrap gap-3 justify-start items-center">
               {familyMembers.map((member) => {
                 const isActive = member.id === activeMemberId;
                 return (
                   <button
                     key={member.id}
                     onClick={() => {
                       setActiveMemberId(member.id);
                       setSelectedArchive(null);
                     }}
                     className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer min-w-[70px] ${isActive ? 'bg-teal-500/10 border-teal-500/30 scale-105 shadow-md shadow-teal-500/5' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}
                   >
                     <span className="text-2xl mb-1">{member.avatar}</span>
                     <span className="text-[10px] font-black text-slate-300 truncate max-w-[65px]">{member.relation}</span>
                     {isActive && (
                       <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-teal-500 border-2 border-slate-900 rounded-full"></span>
                     )}
                   </button>
                 );
               })}
               
               {/* Add Member Quick Button */}
               <button 
                 onClick={() => setAddMemberOpen(!addMemberOpen)}
                 className="w-12 h-12 rounded-full bg-slate-950/40 flex items-center justify-center border border-dashed border-slate-750 text-slate-500 hover:bg-slate-950 hover:text-teal-400 hover:border-teal-500/40 cursor-pointer transition-all"
                 title="إضافة فرد عائلة جديد"
               >
                 <UserPlus className="w-5 h-5" />
               </button>
            </div>

            {/* Add Member Dynamic Inline Panel */}
            {addMemberOpen && (
              <form onSubmit={handleAddFamilyMember} className="mt-4 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 animate-in slide-in-from-top-3 duration-300">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                  <span className="text-xs font-black text-slate-300">إضافة فرد عائلة جديد</span>
                  <button type="button" onClick={() => setAddMemberOpen(false)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">اسم الشخص</label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="مثال: يوسف، سارة..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الصلة</label>
                    <select
                      value={newMemberRelation}
                      onChange={(e) => setNewMemberRelation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                    >
                      <option value="الزوجة">الزوجة</option>
                      <option value="الزوج">الزوج</option>
                      <option value="الابن">الابن</option>
                      <option value="الابنة">الابنة</option>
                      <option value="الأخ">الأخ</option>
                      <option value="الأخت">الأخت</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الأفاتار</label>
                    <select
                      value={newMemberAvatar}
                      onChange={(e) => setNewMemberAvatar(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                    >
                      <option value="👨">👨 شاب</option>
                      <option value="👩">👩 فتاة</option>
                      <option value="👶">👶 طفل</option>
                      <option value="👴">👴 جد</option>
                      <option value="👵">👵 جدة</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs py-2 rounded-xl transition-all cursor-pointer"
                >
                  إضافة للملفات الطبية
                </button>
              </form>
            )}
          </div>

          {/* Refill Alarm / Inventory tracking alerts */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-5 shadow-lg text-right" dir="rtl">
            <h4 className="font-extrabold text-teal-400 text-sm mb-3.5 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-teal-400 animate-bounce" />
              تتبع كميات الدواء والمخزون
            </h4>

            {lowStockMeds.length === 0 ? (
               <div className="bg-teal-950/20 border border-teal-900/30 rounded-2xl p-4 text-teal-300 text-xs font-bold flex items-center gap-2">
                 <span>🌿</span> جميع أدوية صيدليتك المنزلية وفيرة ومستقرة.
               </div>
            ) : (
              <div className="space-y-3">
                {lowStockMeds.map((m, idx) => (
                  <div key={idx} className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-4 flex flex-col gap-2">
                     <div className="flex items-start gap-2">
                       <div className="bg-rose-950/40 p-1.5 rounded-lg text-rose-400 shrink-0 border border-rose-900/40">
                         <AlertTriangle className="w-4 h-4" />
                       </div>
                       <div>
                         <h5 className="font-extrabold text-slate-100 text-xs">{m.name} المتبقي قليل!</h5>
                         <p className="text-[10px] text-rose-300 font-semibold mt-0.5">
                           متبقي {m.inventoryQty} جرعات فقط في العلبة الحالية.
                         </p>
                       </div>
                     </div>
                     <button 
                       onClick={() => executeBuyRefill(m.id!)}
                       className="w-full bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-rose-300 text-[10px] font-extrabold py-1.5 px-3.5 rounded-xl transition-all self-end flex items-center justify-center gap-1 cursor-pointer hover:border-rose-900"
                     >
                       <RefreshCw className="w-3 h-3 text-rose-400" />
                       إعادة شراء (تعبئة علبة جديدة +30 حبة)
                     </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Isolated Folders archive click toggle */}
          <div 
            onClick={() => setViewArchiveOpen(true)}
            className="bg-slate-950/80 shadow-lg p-5 rounded-3xl text-white hover:bg-slate-900 transition-all border border-slate-800 cursor-pointer text-right flex items-center justify-between relative overflow-hidden" 
            dir="rtl"
          >
            <div className="absolute left-0 bottom-0 top-0 w-16 bg-white/5 translate-x-3 -skew-x-12"></div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-3 rounded-2xl text-slate-400 border border-slate-800">
                <BookOpen className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-100">روشتات {activeMember.name} (الأرشيف)</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{archivedScans.length} روشتات مؤرشفة</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </div>

        </div>
      </div>

      {/* Visited Folder list details bottom overlay drawer */}
      {viewArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 shadow-2xl" onClick={() => setViewArchiveOpen(false)}>
          <div 
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-850 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300 text-right" 
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/40">
              <div>
                <h2 className="text-lg font-black text-white">أرشيف روشتات {activeMember.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">جميع الأطباء والروشتات المسجلة لهذا الشخص بالتحديد</p>
              </div>
              <button 
                onClick={() => setViewArchiveOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors focus:outline-none cursor-pointer border border-transparent hover:border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto min-h-[40vh]">
              {selectedArchive ? (
                <div className="space-y-4 border border-teal-950 bg-teal-950/10 p-5 rounded-2xl relative">
                  <button 
                    onClick={() => setSelectedArchive(null)}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center justify-start gap-1 pb-2 border-b border-teal-950/30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                    العودة لقائمة الروشتات
                  </button>
                  
                  {/* Delete Button inside active archive view */}
                  <button
                    onClick={(e) => {
                      handleDeleteArchive(selectedArchive.id, e);
                    }}
                    className="absolute top-5 left-5 text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-950/40 transition-all border border-slate-800 hover:border-rose-900/60 cursor-pointer"
                    title="حذف هذه الروشتة نهائياً"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>

                  <div>
                    <h3 className="font-extrabold text-white text-base">{selectedArchive.clinicName}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1" dir="ltr">{selectedArchive.date}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400">الأدوية التي تضمنتها الروشتة:</h4>
                    {selectedArchive.medications.map((m, idx) => (
                      <div key={idx} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white text-sm">{m.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">الجرعة: {m.dosage === 'Unknown' ? 'غير مسجل' : m.dosage}</p>
                        </div>
                        <span className="text-[10px] text-teal-400 bg-teal-950/30 border border-teal-900/50 py-1 px-3.5 rounded-full font-bold">
                          {m.form || 'tablet'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : archivedScans.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-25 animate-bounce" />
                  لا يوجد روشتات مؤرشفة لـ {activeMember.name} بعد.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {archivedScans.map((folder, idx) => (
                    <div 
                      key={folder.id || idx}
                      onClick={() => setSelectedArchive(folder)}
                      className="bg-slate-950/40 hover:bg-slate-900 border hover:border-teal-500/30 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between relative group border-slate-800"
                    >
                      {/* Delete Quick Button on Cards */}
                      <button
                        onClick={(e) => handleDeleteArchive(folder.id, e)}
                        className="absolute top-3 left-3 text-slate-600 group-hover:text-rose-400 hover:bg-rose-950/40 p-1.5 rounded-lg transition-all border border-transparent group-hover:border-slate-800 hover:border-rose-900 cursor-pointer"
                        title="حذف سريع"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="pl-6 text-right">
                        <h4 className="font-extrabold text-white text-sm line-clamp-1">{folder.clinicName}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold">{folder.date}</p>
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-semibold">{folder.medsCount} أدوية مسجلة</span>
                        <span className="text-xs font-bold text-teal-400 flex items-center">عرض التفاصيل ←</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button 
                onClick={() => setViewArchiveOpen(false)}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer"
              >
                إغلاق الأرشيف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medication factual information bottom sheet for physical box scanning */}
      {scannedBoxInfo && (
        <MedicationInfoModal 
          medication={scannedBoxInfo} 
          onClose={() => setScannedBoxInfo(null)} 
        />
      )}


    </div>
  );
}
