import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

interface WebRTCCameraProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
  medicalSpecialty: string;
  setMedicalSpecialty: (specialty: string) => void;
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

export default function WebRTCCamera({ onCapture, onCancel, medicalSpecialty, setMedicalSpecialty }: WebRTCCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    if (!medicalSpecialty) {
      setError("الرجاء اختيار التخصص الطبي أولاً لتحسين دقة قراءة الذكاء الاصطناعي.");
      return;
    }
    setError(null);
    setIsStarting(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error(err);
      setError("لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات اللازمة.");
    } finally {
      setIsStarting(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onCapture(base64Data);
      }
    }
  };

  if (!cameraActive) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-lg border border-slate-800 p-6 sm:p-8 w-full max-w-md mx-auto text-right text-white" dir="rtl">
        <h2 className="text-xl font-black text-teal-400 mb-6">إعداد المسح الذكي</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 text-rose-300 rounded-xl text-xs font-bold border border-rose-900/50">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-350 mb-2">التخصص الطبي (يساعد الذكاء الاصطناعي في توقع الأدوية بدقة)</label>
          <select 
            value={medicalSpecialty}
            onChange={(e) => setMedicalSpecialty(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
          >
            <option value="" disabled>اختر التخصص...</option>
            {specialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs py-3.5 rounded-2xl cursor-pointer transition-all"
          >
            إلغاء
          </button>
          <button 
            type="button"
            onClick={startCamera}
            disabled={isStarting}
            className="flex-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs py-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 flex-[2]"
          >
            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            فتح الكاميرا
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 pt-safe-top flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => { stopCamera(); onCancel(); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/50 backdrop-blur rounded-full text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full text-white text-xs font-bold" dir="rtl">
          {medicalSpecialty}
        </div>
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay Mask */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
          <div className="flex-1 bg-black/50 backdrop-blur-[2px]"></div>
          <div className="flex justify-center shrink-0">
            <div className="w-[10vw] bg-black/50 backdrop-blur-[2px]"></div>
            <div className="w-[80vw] h-[60vh] max-h-[600px] border-2 border-teal-500/80 rounded-2xl relative shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]">
              {/* Corner indicators */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-xl -ml-[2px] -mt-[2px]"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-xl -mr-[2px] -mt-[2px]"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-xl -ml-[2px] -mb-[2px]"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-xl -mr-[2px] -mb-[2px]"></div>
              
              {/* Scanning Laser Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-scan-laser opacity-70"></div>
            </div>
            <div className="w-[10vw] bg-black/50 backdrop-blur-[2px]"></div>
          </div>
          <div className="flex-1 bg-black/50 backdrop-blur-[2px]"></div>
        </div>
        
        {/* Instruction text */}
        <div className="absolute bottom-32 inset-x-0 z-20 text-center text-white/90 font-bold text-sm drop-shadow-md animate-pulse">
          ضع الروشتة أو العلبة داخل الإطار
        </div>
      </div>

      {/* Capture Button Area */}
      <div className="h-32 bg-black pb-safe-bottom flex items-center justify-center relative z-20">
        <button 
          onClick={capturePhoto}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-white rounded-full"></div>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
