import React, { useEffect, useState } from 'react';
import api from '../api';
import { toast } from 'react-hot-toast';

interface PendingSync {
  id: string;
  url: string;
  data: any;
  timestamp: number;
}

const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet Terhubung! Memulai sinkronisasi...');
      syncData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Internet Terputus! Mode Offline Aktif.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    syncData();

    const interval = setInterval(() => {
      if (navigator.onLine) syncData();
    }, 30000); // Check every 30s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncData = async () => {
    let queue: PendingSync[] = [];
    try {
      const saved = localStorage.getItem('sync_queue');
      queue = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(queue)) queue = [];
    } catch (e) {
      console.warn("Sync queue corrupted, resetting");
      localStorage.setItem('sync_queue', '[]');
      queue = [];
    }
    setPendingCount(queue.length);
    
    if (queue.length === 0 || !navigator.onLine) return;

    console.log(`[Sync] Found ${queue.length} pending items. Starting sync...`);

    const updatedQueue = [...queue];
    for (const item of queue) {
      try {
        await api.post(item.url, item.data);
        // Remove from queue on success
        const index = updatedQueue.findIndex(q => q.id === item.id);
        if (index > -1) updatedQueue.splice(index, 1);
        console.log(`[Sync] Successfully synced item: ${item.id}`);
      } catch (error) {
        console.error(`[Sync] Failed to sync item: ${item.id}`, error);
        // Break the loop if we still have network issues
        break;
      }
    }

    localStorage.setItem('sync_queue', JSON.stringify(updatedQueue));
    setPendingCount(updatedQueue.length);
    
    if (updatedQueue.length === 0 && queue.length > 0) {
      toast.success(`${queue.length} data berhasil disinkronkan ke Server!`);
    } else if (queue.length > updatedQueue.length) {
      toast.success(`${queue.length - updatedQueue.length} data berhasil disinkronkan!`);
    }
  };

  return (
    <>
      {children}
      {pendingCount > 0 && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest">{pendingCount} Data Menunggu Auto-Sync (30s)</span>
          </div>
        </div>
      )}
    </>
  );
};

export default SyncProvider;
