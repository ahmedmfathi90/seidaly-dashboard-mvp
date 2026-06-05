import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle, Sparkles } from 'lucide-react';
import { Medication } from '../types';
import { scanPrescriptionClient, compressImage } from '../utils/geminiClient';

interface PrescriptionUploadProps {
  onScanComplete: (medications: Medication[]) => void;
  onCancel?: () => void;
}

const specialties = [
  "عام (غير محدد)",
  "الباطنة",
  "الأطفال",
  "النساء والتوليد",
  "الجلدية",
  "العظام",
  "الأسنان",
  "العيون",
  "الأنف والأذن والحنجرة",
  "القلب والأوعية الدموية",
  "المخ والأعصاب",
  "النفسية والعصبية",
  "الجراحة العامة",
  "المسالك البولية",
  "الأورام"
];

function ShimmerLoader() {
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const statuses = [
    "جاري قراءة خط الطبيب المكتوب...",
    "يتم الآن مطابقة الأدوية بنوع السن والتخصص الطبي...",
    "نتحقق من التوافقات الدوائية والجرعات المناسبة...",
    "نجهز الآن جدول المواعيد والتنبيهات باللغة العربية...",
    "اللمسات الأخيرة... جاري تنظيم النتائج لعرضها بوضوح ✨"
  ];

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2200);
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + Math.random() * 8));
    }, 600);
    return () => { clearInterval(msgInterval); clearInterval(progressInterval); };
  }, []);

  return (
    <div className="space-y-5 w-full text-right" dir="rtl">
      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-teal-400 to-indigo-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 3 Shimmer Cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-800 rounded-lg w-2/5"></div>
              <div className="flex gap-1.5">
                <div className="h-5 w-12 bg-slate-800 rounded-lg"></div>
                <div className="h-5 w-14 bg-slate-800/50 rounded-lg"></div>
              </div>
            </div>
            <div className="h-11 bg-slate-800/40 rounded-xl w-full"></div>
            <div className="h-9 bg-slate-800/25 rounded-xl w-full"></div>
          </div>
        ))}
      </div>

      {/* Rotating Status Text */}
      <div className="text-center py-3 bg-slate-950/50 rounded-2xl border border-slate-800">
        <p className="text-teal-400 font-bold text-sm animate-pulse transition-all duration-300">
          {statuses[statusIndex]}
        </p>
        <p className="text-slate-500 text-[10px] mt-1 font-semibold">
          {Math.round(progress)}% مكتمل
        </p>
      </div>
    </div>
  );
}

export default function PrescriptionUpload({ onScanComplete, onCancel }: PrescriptionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [medicalSpecialty, setMedicalSpecialty] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('image/')) {
        setError('يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP).');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleScan = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // Compress native high-resolution image to ~80KB before API transmission
      const { base64Data, mimeType } = await compressImage(file);

      // Call our client-side Serverless Gemini API Client
      const medicationsWithIds = await scanPrescriptionClient(base64Data, mimeType, medicalSpecialty);

      onScanComplete(medicationsWithIds);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ غير متوقع أثناء معالجة الروشتة بذكاء صيدلي.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-8 w-full max-w-2xl mx-auto text-right text-white relative overflow-hidden" dir="rtl">
      
      {/* Decorative top blur */}
      <div className="absolute top-0 right-1/4 w-40 h-40 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

      {isLoading ? (
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black bg-gradient-to-l from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              جاري فك الرموز الطبية...
            </h2>
            <p className="text-slate-400 text-xs font-semibold">نستخدم الذكاء الاصطناعي السريري لمطابقة خط الطبيب بالجرعات الصحيحة</p>
          </div>
          <ShimmerLoader />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-l from-teal-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-teal-400" />
                المسح الذكي للروشتات
              </h2>
              <p className="text-slate-400 text-xs mt-1 font-medium">التقط صورة واضحة للروشتة لفك رموزها الطبية بدقة</p>
            </div>
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel}
                className="text-xs font-bold text-slate-400 hover:text-teal-400 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                إلغاء والعودة
              </button>
            )}
          </div>

          {/* STEP 1: Select Medical Specialty */}
          <div className="mb-6 bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl relative z-10">
            <label className="block text-xs font-black text-slate-300 mb-2.5">
              التخصص الطبي للمريض (إجباري لتحسين توقع الأدوية)
            </label>
            <select 
              value={medicalSpecialty}
              onChange={(e) => setMedicalSpecialty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3.5 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
            >
              <option value="" disabled>اختر تخصص الطبيب المعالج...</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Hidden inputs to trigger OS actions */}
          <input 
            type="file" 
            className="hidden" 
            ref={cameraInputRef} 
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
          />
          <input 
            type="file" 
            className="hidden" 
            ref={galleryInputRef} 
            onChange={handleFileChange}
            accept="image/*"
          />

          {!previewUrl ? (
            <div className="space-y-4 relative z-10">
              {/* Massive Premium Dark Camera Trigger */}
              <button
                type="button"
                disabled={!medicalSpecialty}
                onClick={() => cameraInputRef.current?.click()}
                className={`w-full py-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-300 group cursor-pointer ${
                  medicalSpecialty 
                    ? 'border-teal-500/30 hover:border-teal-400 bg-teal-950/5 hover:bg-teal-950/10' 
                    : 'border-slate-800/80 bg-slate-950/20 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`p-4 rounded-2xl transition-all ${
                  medicalSpecialty 
                    ? 'bg-teal-500/10 text-teal-400 group-hover:scale-110 shadow-lg shadow-teal-500/5' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  <Camera className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className={`font-black text-base ${medicalSpecialty ? 'text-teal-300' : 'text-slate-500'}`}>تصوير الروشتة بالكاميرا</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">سيفتح تطبيق كاميرا الهاتف الأساسي بجودة كاملة</p>
                </div>
              </button>

              {/* Secondary Gallery Upload */}
              <button
                type="button"
                disabled={!medicalSpecialty}
                onClick={() => galleryInputRef.current?.click()}
                className={`w-full py-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-bold ${
                  medicalSpecialty 
                    ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white' 
                    : 'border-slate-800 bg-slate-950/10 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-slate-400" />
                رفع صورة روشتة جاهزة من المعرض
              </button>

              {/* Demo Data trigger to visualize designs without uploading */}
              <button
                type="button"
                onClick={() => {
                  const demoMeds: Medication[] = [
                    {
                      id: "demo-ambig",
                      name: ["Biodroxil 250mg", "Biomega 100mg", "Baccidal 50mg"] as any,
                      form: "Drops",
                      dosage: "Unknown",
                      frequency: "Unknown",
                      activeIngredient: "Cefadroxil",
                      medicalUse: "مضاد حيوي لعلاج الالتهابات البكتيرية للأطفال",
                      detailedInfo: {
                        sideEffects: ["قد يسبب اضطراب بسيط في المعدة"]
                      }
                    },
                    {
                      id: "demo-confirmed",
                      name: "Panadol Extra",
                      form: "Tablet",
                      dosage: "500mg",
                      frequency: "twice daily",
                      activeIngredient: "Paracetamol + Caffeine",
                      medicalUse: "مسكن للآلام وخافض للحرارة",
                      detailedInfo: {
                        sideEffects: ["قد يسبب أرق خفيف بسبب الكافيين"]
                      },
                      specialInstructions: "بعد الأكل"
                    },
                    {
                      id: "demo-unclear",
                      name: "Amoxil 500mg",
                      form: "Capsule",
                      dosage: "500mg",
                      frequency: "Unknown",
                      activeIngredient: "Amoxicillin",
                      medicalUse: "مضاد حيوي واسع المجال",
                      detailedInfo: {
                        sideEffects: ["إسهال خفيف أو حساسية في الجلد"]
                      }
                    }
                  ];
                  onScanComplete(demoMeds);
                }}
                className="w-full py-4 rounded-xl border border-dashed border-teal-500/30 bg-teal-950/10 hover:bg-teal-950/20 text-teal-400 hover:text-teal-300 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-bold"
              >
                <span>✨</span>
                <span>استعراض كروت الأدوية والتصميم (بيانات تجريبية)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6 relative z-10">
              <div className="relative rounded-2xl overflow-hidden border border-slate-850 bg-slate-950/40 group pre-card">
                <img 
                  src={previewUrl} 
                  alt="Prescription preview" 
                  className="max-h-80 w-full object-contain mx-auto opacity-95 group-hover:opacity-100 transition-opacity"
                />
                
                <button 
                  onClick={clearSelection}
                  className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur text-slate-300 p-2.5 rounded-full shadow-md hover:bg-slate-800 hover:text-rose-400 transition-colors border border-slate-800 cursor-pointer"
                  title="إزالة الصورة"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-4 flex items-center justify-between" dir="rtl">
                  <span className="text-slate-300 text-xs font-bold truncate max-w-[80%]">{file?.name}</span>
                  <div className="bg-teal-500/20 text-teal-400 px-3 py-1 rounded-lg text-[10px] font-black">جاهزة للفحص</div>
                </div>
              </div>

              <button
                onClick={handleScan}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-black py-4 px-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-teal-500/10 text-base cursor-pointer"
              >
                ابدأ التحليل بالذكاء الاصطناعي الآن ✨
              </button>
            </div>
          )}
        </>
      )}

      {error && !isLoading && (
        <div className="mt-5 p-4 bg-rose-950/20 text-rose-300 rounded-2xl text-xs font-bold border border-rose-900/50 flex items-start gap-2.5 relative z-10 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 text-right">
            <p className="font-black text-rose-200">فشل التحليل:</p>
            <p className="font-semibold text-rose-300 mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
