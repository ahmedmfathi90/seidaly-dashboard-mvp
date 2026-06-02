import React, { useState, useRef } from 'react';
import { UploadCloud, FileImage, Loader2, X, AlertCircle } from 'lucide-react';
import { Medication, ScanResponse } from '../types';
import { getSimulatedPrescriptionMeds } from '../data/medicationDb';
import { scanPrescriptionClient, compressImage } from '../utils/geminiClient';

interface PrescriptionUploadProps {
  onScanComplete: (medications: Medication[]) => void;
  onCancel?: () => void;
}

export default function PrescriptionUpload({ onScanComplete, onCancel }: PrescriptionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      // High-performance image compression for mobile browser camera scans
      const { base64Data, mimeType } = await compressImage(file);

      // Call our client-side Serverless Gemini API Client!
      const medicationsWithIds = await scanPrescriptionClient(base64Data, mimeType);

      onScanComplete(medicationsWithIds);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ غير متوقع أثناء معالجة الروشتة بذكاء صيدلي.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-lg border border-slate-800 p-6 sm:p-8 w-full max-w-2xl mx-auto text-right text-white" dir="rtl">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-teal-400">مسح ضوئي بالذكاء الاصطناعي</h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">يدعم الروشتات المكتوبة بخط اليد أو المطبوعة باللغات الطبية</p>
        </div>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="text-xs font-bold text-slate-400 hover:text-teal-400 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 py-1.5 px-3 rounded-xl transition-all cursor-pointer"
          >
            إلغاء والعودة
          </button>
        )}
      </div>

      {!previewUrl ? (
        <div className="border-2 border-dashed border-teal-800/80 rounded-3xl bg-teal-950/10 p-8 sm:p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-950/60 p-4 rounded-2xl shadow-md text-teal-400 mb-4 border border-slate-800/80">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          
          <p className="font-extrabold text-teal-300 mb-2">قم بمسح الروشتة ضوئياً</p>
          <p className="text-xs text-teal-500/50 font-semibold mb-6">بصيغة JPG, PNG, WEBP (بحد أقصى 5 ميجابايت)</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-md">
            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900 hover:bg-slate-805 text-teal-400 border border-teal-800/60 hover:border-teal-400 font-bold py-3.5 px-5 rounded-2xl transition-all shadow-md active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer h-12"
            >
              <span>📁 رفع من المعرض / الملفات</span>
            </button>

            {/* Direct Rear Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-black py-3.5 px-5 rounded-2xl transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer h-12"
            >
              <span>📸 التقاط صورة حية</span>
            </button>
          </div>

          {/* Hidden inputs to manage files */}
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="image/*"
          />
          <input 
            type="file" 
            className="hidden" 
            ref={cameraInputRef} 
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40 group pre-card">
            {isScanning && (
              <div className="absolute inset-0 z-30 flex flex-col justify-center items-center bg-slate-950/40 pointer-events-none">
                <style>{`
                  @keyframes scan-laser {
                    0% { top: 12%; }
                    50% { top: 88%; }
                    100% { top: 12%; }
                  }
                  .scanner-laser {
                    position: absolute;
                    left: 12%;
                    right: 12%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #2dd4bf, #4ade80, #2dd4bf, transparent);
                    box-shadow: 0 0 14px 4px rgba(45, 212, 191, 0.7);
                    animation: scan-laser 2.2s infinite ease-in-out;
                  }
                `}</style>
                <div className="relative w-64 h-64 border border-teal-500/25 rounded-2xl flex items-center justify-center bg-teal-950/5 shadow-[0_0_25px_rgba(45,212,191,0.08)]">
                  {/* Glowing corners */}
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg"></div>
                  <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg"></div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg"></div>
                  <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg"></div>
                  
                  {/* Glowing grid scanner box lines */}
                  <div className="absolute inset-2 border border-dashed border-teal-500/10 rounded-xl opacity-60"></div>
                  
                  {/* Scanning Laser Line */}
                  <div className="scanner-laser"></div>
                  
                  {/* Status Indicator text */}
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-400 bg-slate-950/80 px-3 py-1 rounded-full border border-teal-900 shadow-lg animate-pulse">
                    جاري التحليل...
                  </span>
                </div>
              </div>
            )}
            <img 
              src={previewUrl} 
              alt="Prescription preview" 
              className="max-h-80 w-full object-contain mx-auto opacity-90 group-hover:opacity-100 transition-opacity"
            />
            {!isScanning && (
              <button 
                onClick={clearSelection}
                className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur text-slate-350 p-2 rounded-full shadow-md hover:bg-slate-800 hover:text-rose-450 transition-colors border border-slate-800 cursor-pointer"
                title="إزالة الصورة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-4 flex items-center justify-between" dir="rtl">
              <span className="text-slate-300 text-xs font-bold truncate max-w-[80%]">{file?.name}</span>
              <FileImage className="w-4 h-4 text-slate-400 ml-2" />
            </div>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center transition-colors shadow-lg shadow-teal-500/10 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin text-slate-950" />
                جاري فك رموز الروشتة واستخراج الأدوية...
              </>
            ) : (
              'ابدأ الفحص بالذكاء الاصطناعي الآن'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-rose-950/20 text-rose-300 rounded-2xl text-xs font-bold border border-rose-900/50 flex items-start gap-2.5 animate-bounce">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 text-right">
            <p className="font-black text-rose-200">فشل فك الرموز:</p>
            <p className="font-semibold text-rose-300 mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
