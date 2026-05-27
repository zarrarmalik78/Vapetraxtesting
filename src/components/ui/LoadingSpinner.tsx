import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullScreen, className }) => {
  return (
    <div className={cn(
      "flex items-center justify-center",
      fullScreen ? "fixed inset-0 bg-[#0f0f23] z-50" : "w-full h-full",
      className
    )}>
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-violet-500/10 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
