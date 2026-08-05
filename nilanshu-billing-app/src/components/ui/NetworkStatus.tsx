import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card text-card-foreground border-2 border-destructive/50 shadow-2xl rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center animate-pulse">
          <WifiOff className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">No Internet Connection</h2>
          <p className="text-muted-foreground">
            Please connect to the internet to use the billing software.
            The app requires an active connection to sync with the database and prevent data errors.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-destructive w-full animate-pulse"></div>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Waiting for connection...
          </p>
        </div>
      </div>
    </div>
  );
}
