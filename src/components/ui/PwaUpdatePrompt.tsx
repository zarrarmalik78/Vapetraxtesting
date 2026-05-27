import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999] bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 md:p-5 flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-500 w-[340px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-start justify-between">
        <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-violet-600 animate-pulse"></span>
          Update Available
        </h3>
        <button 
          onClick={() => setNeedRefresh(false)}
          className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      
      <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
        A new version of VapeTrax is ready. Update now to get the latest features, bug fixes, and improvements.
      </p>
      
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 bg-violet-600 text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-violet-700 active:scale-95 transition-all shadow-md shadow-violet-600/20"
        >
          <RefreshCw size={16} className="animate-spin-slow" />
          Update App Now
        </button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
