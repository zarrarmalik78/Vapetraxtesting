import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useConnectivity, ConnectivityStatus } from '../../hooks/useConnectivity';
import { cn } from '../../lib/utils';

const statusConfig: Record<ConnectivityStatus, { 
  label: string; 
  icon: React.ElementType; 
  dotColor: string; 
  bgColor: string; 
  textColor: string;
  animate: boolean;
}> = {
  online: {
    label: 'Online',
    icon: Wifi,
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 border-emerald-200',
    textColor: 'text-emerald-700',
    animate: false,
  },
  offline: {
    label: 'Offline',
    icon: WifiOff,
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    textColor: 'text-red-700',
    animate: false,
  },
  syncing: {
    label: 'Syncing',
    icon: RefreshCw,
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-700',
    animate: true,
  },
};

const ConnectivityBadge: React.FC = () => {
  const { status } = useConnectivity();
  const [visible, setVisible] = useState(true);
  const [lastStatus, setLastStatus] = useState<ConnectivityStatus>(status);

  useEffect(() => {
    setLastStatus(status);
    setVisible(true);

    // Auto-hide "online" badge after 4 seconds
    if (status === 'online') {
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-500 shadow-sm",
        config.bgColor,
        config.textColor,
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      )}
    >
      <div className={cn(
        "w-2 h-2 rounded-full",
        config.dotColor,
        config.animate && "animate-pulse"
      )} />
      <Icon size={14} className={config.animate ? "animate-spin" : ""} />
      <span>{config.label}</span>
    </div>
  );
};

export default ConnectivityBadge;
