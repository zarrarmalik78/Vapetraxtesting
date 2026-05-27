import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const EidBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on exactly May 27th, 2026
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 4 = May
    const date = today.getDate();

    const isEid = year === 2026 && month === 4 && date === 27;

    console.log("Eid Banner Debug Info:", {
      systemYear: year,
      systemMonth: month,
      systemDate: date,
      isEidActiveWindow: isEid,
      deviceLocalTime: today.toString()
    });

    if (isEid) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden bg-[#022c22] border border-amber-500/30 rounded-3xl shadow-[0_20px_50px_-12px_rgba(245,158,11,0.25)] p-4 md:p-5 lg:p-6 flex flex-col md:flex-row items-center gap-4 lg:gap-6 group animate-in fade-in zoom-in-95 duration-700 mb-6">
      
      {/* Background Aurora / Glassmorphism Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
        <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[150%] bg-gradient-to-br from-emerald-500/20 to-transparent rotate-12 blur-[80px]" />
        <div className="absolute -bottom-[50%] -right-[10%] w-[70%] h-[150%] bg-gradient-to-tl from-amber-500/15 to-transparent -rotate-12 blur-[80px]" />
        
        {/* Subtle dot pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
           <pattern id="pattern-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#FCD34D" />
           </pattern>
           <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-dots)" />
        </svg>
      </div>

      {/* Decorative floating stars */}
      <div className="absolute top-4 left-1/4 opacity-60 animate-pulse delay-75">
        <Sparkles size={14} className="text-amber-300" />
      </div>
      <div className="absolute bottom-4 right-1/4 opacity-50 animate-pulse delay-300">
        <Sparkles size={12} className="text-amber-200" />
      </div>
      <div className="absolute top-1/2 right-10 opacity-40 animate-pulse delay-500">
        <Sparkles size={16} className="text-emerald-300" />
      </div>

      {/* Premium Icon/Illustration Widget */}
      <div className="relative flex-shrink-0 z-10">
        {/* Glowing backdrop for the icon */}
        <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full animate-pulse" />
        <div className="relative bg-gradient-to-b from-[#064e3b] to-[#022c22] p-2.5 lg:p-3 rounded-2xl border border-amber-500/40 shadow-[inset_0_2px_20px_rgba(245,158,11,0.15)] group-hover:border-amber-400/60 transition-colors duration-500">
          <svg viewBox="0 0 64 64" className="w-12 h-12 lg:w-14 lg:h-14 text-amber-400 fill-current drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]" xmlns="http://www.w3.org/2000/svg">
            {/* Glowing moon */}
            <path d="M42 16 A 16 16 0 1 0 48 32 A 12 12 0 1 1 42 16 Z" fill="#FBBF24" />
            
            {/* Twinkling star */}
            <path d="M44 14 L45 16.5 L47.5 17.5 L45 18.5 L44 21 L43 18.5 L40.5 17.5 L43 16.5 Z" fill="#FEF08A" />

            {/* Cute Geometric Ram/Sheep */}
            {/* Fluffy body */}
            <path d="M22 36 C18 36, 15 33, 15 29 C15 26, 17 24.5, 19.5 25 C21 21.5, 24.5 19, 29 19 C33.5 19, 37 21.5, 38.5 25 C41 24.5, 43 26, 43 29 C43 33, 40 36, 36 36 Z" fill="#F8FAFC" />
            
            {/* Legs */}
            <rect x="23" y="35" width="2.5" height="6" rx="1.25" fill="#064E3B" />
            <rect x="27.5" y="35" width="2.5" height="6" rx="1.25" fill="#022C22" />
            <rect x="34" y="35" width="2.5" height="6" rx="1.25" fill="#064E3B" />
            
            {/* Head/Face */}
            <rect x="28.5" y="23" width="7" height="9" rx="3.5" fill="#0F172A" />
            
            {/* Curved Golden Horns */}
            <path d="M28 24 C26.5 22, 26 19, 29 20.5 C30 21, 30.5 22, 30 23.5" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M36 24 C37.5 22, 38 19, 35 20.5 C34 21, 33.5 22, 34 23.5" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round" />
            
            {/* Fluffy wool on head */}
            <circle cx="32" cy="22" r="2.5" fill="#F8FAFC" />
          </svg>
        </div>
      </div>

      {/* Main Message Content */}
      <div className="flex flex-col z-10 w-full text-center md:text-left">
        <h2 className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-black text-xl md:text-2xl lg:text-3xl tracking-tight leading-snug drop-shadow-sm mb-1 md:mb-2">
          Eid Mubarak from Zarar Malik to Moon Vapes Team.
        </h2>
        <p className="text-emerald-50 text-xs md:text-sm lg:text-base leading-relaxed max-w-4xl font-medium opacity-90">
          Wishing you best for Eid Days Sale. May Allah bless your business with continued growth, prosperity and endless success.
        </p>
      </div>

    </div>
  );
};

export default EidBanner;
