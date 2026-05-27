import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log('New update detected! Automatically injecting and refreshing...');
      // Automatically force the service worker to take over and refresh the page
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // This component now works completely silently in the background
  return null;
};

export default PwaUpdatePrompt;
