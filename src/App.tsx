import React from 'react';
import { Pill, Activity, Home, User, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useNotifications } from './hooks/useNotifications';

function AppContent() {
  const { userName, userAge, isLoggedIn, setIsLoggedIn, hasSeenLanding } = useAuth();
  const { showPrompt, iosWarning, requestPermission, dismissPrompt } = useNotifications();

  // --- Global Medication Alarm Scheduler ---
  React.useEffect(() => {
    const checkAlarms = () => {
      const savedData = localStorage.getItem('seidaly_membersData');
      if (!savedData) return;

      try {
        const data = JSON.parse(savedData);
        // Format current time as "hh:mm A" (e.g. "09:00 AM")
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 hour should be 12
        const strHours = hours < 10 ? '0' + hours : hours.toString();
        const strMinutes = minutes < 10 ? '0' + minutes : minutes.toString();
        const currentTimeStr = `${strHours}:${strMinutes} ${ampm}`;

        // Get saved list of family profiles for names
        const familySaved = localStorage.getItem('seidaly_familyMembers');
        const familyList = familySaved ? JSON.parse(familySaved) : [];

        // Loop over all members in membersData
        Object.keys(data).forEach(memberId => {
          const memberObj = data[memberId];
          const meds = memberObj.medications || [];
          const memberProfile = familyList.find((f: any) => f.id === memberId);
          const memberName = memberProfile ? memberProfile.name : (memberId === 'me' ? 'الأساسي' : 'المرافق');

          meds.forEach((med: any) => {
            const timings = med.timings || [];
            if (timings.includes(currentTimeStr)) {
              const notificationTag = `alarm-${med.id}-${currentTimeStr}`;
              
              if ('serviceWorker' in navigator && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  navigator.serviceWorker.ready.then(reg => {
                    if (reg.active) {
                      reg.active.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        payload: {
                          title: `تذكير بموعد الدواء ⏰ (${med.name})`,
                          body: `حان الآن موعد جرعة ${med.name} (${med.dosage}) للمريض: ${memberName}. يرجى تناولها بالوقت المحدد.`,
                          icon: '/pwa-192x192.png',
                          badge: '/pwa-192x192.png',
                          vibrate: [200, 100, 200],
                          tag: notificationTag,
                          data: '/'
                        }
                      });
                    } else {
                      reg.showNotification(`تذكير بموعد الدواء ⏰ (${med.name})`, {
                        body: `حان الآن موعد جرعة ${med.name} (${med.dosage}) للمريض: ${memberName}.`,
                        icon: '/pwa-192x192.png',
                        badge: '/pwa-192x192.png',
                        vibrate: [200, 100, 200],
                        tag: notificationTag
                      } as any);
                    }
                  });
                }
              } else if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`تذكير بموعد الدواء ⏰ (${med.name})`, {
                  body: `حان الآن موعد جرعة ${med.name} (${med.dosage}) للمريض: ${memberName}.`,
                  icon: '/pwa-192x192.png',
                  tag: notificationTag
                });
              }
            }
          });
        });
      } catch (err) {
        console.error('Error in local alarm scheduler:', err);
      }
    };

    // Run checking immediately
    checkAlarms();

    // Check every 60 seconds
    const intervalId = setInterval(checkAlarms, 60000);
    return () => clearInterval(intervalId);
  }, []);

  if (!hasSeenLanding) {
    return <LandingPage />;
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-teal-950 to-slate-900 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950 animate-in fade-in duration-300 relative overflow-x-hidden w-full" dir="rtl">
      {/* Interactive Glowing Ambient Background Blurs */}
      <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[130px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[130px] animate-pulse pointer-events-none"></div>

      {/* Header */}
      <header className="bg-slate-950/40 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20 transition-all shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-500/10 border border-teal-500/20 p-2 rounded-xl text-teal-400 shadow-sm">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-teal-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
                صيدلي <span className="font-medium text-slate-500 text-xs ml-1 hidden sm:inline">/ Seidaly</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-950/40 py-1.5 px-3 rounded-xl border border-slate-800">
                <User className="w-4 h-4 text-teal-400 fill-teal-400/10" />
                <span>{userName}</span>
             </div>
             
             {/* Logout / Switch Name Button */}
             <button 
               onClick={() => setIsLoggedIn(false)}
               className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 py-1.5 px-3 rounded-xl border border-rose-950/60 cursor-pointer transition-all hover:scale-105"
               title="تسجيل خروج / تغيير الحساب"
             >
               <LogOut className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">تغيير الحساب</span>
             </button>

             <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-teal-400 bg-teal-950/30 px-3 py-1.5 rounded-full border border-teal-950">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                AI Core Online
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24 relative z-10 min-h-[calc(100vh-64px)] overflow-x-hidden">
        <Dashboard />
      </main>

      {/* Push Notification Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            <div className="w-12 h-12 bg-teal-50/20 text-teal-400 rounded-full flex items-center justify-center mb-4 border border-teal-500/30">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 text-right" dir="rtl">تفعيل الإشعارات</h3>
            
            {iosWarning ? (
              <div className="space-y-4">
                <p className="text-sm text-rose-400 bg-rose-950/20 border border-rose-900/40 p-4 rounded-2xl text-right leading-relaxed font-bold" dir="rtl">
                  {iosWarning}
                </p>
                <button 
                  onClick={dismissPrompt}
                  className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  حسناً، فهمت
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-6 text-right leading-relaxed" dir="rtl">
                  اسمح لنا بإرسال إشعارات لتذكيرك بمواعيد الأدوية الخاصة بك وعائلتك في الوقت المناسب.
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={dismissPrompt}
                    className="flex-1 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                  >
                    ليس الآن
                  </button>
                  <button 
                    onClick={requestPermission}
                    className="flex-1 min-h-[44px] bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-teal-500/20"
                  >
                    موافق
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
