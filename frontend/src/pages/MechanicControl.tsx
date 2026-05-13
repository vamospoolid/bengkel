import React, { useState, useEffect } from 'react';
import { Wrench, Clock, CheckCircle2, Play, Package, AlertCircle, Loader2, ChevronRight, User } from 'lucide-react';
import api from '../api';

interface WorkOrder {
  id: string;
  plateNumber: string;
  customerName: string;
  model: string;
  status: string;
  complaint: string;
  services: string[];
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

const MechanicControl: React.FC = () => {
  const [tasks, setTasks] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<WorkOrder | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      // Fetch only active/pending tasks for the logged in mechanic
      const res = await api.get('/workshop/active');
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/workshop/orders/${id}/status`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      alert('Gagal update status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground p-4 pb-20">
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black tracking-tight">KONTROL MEKANIK</h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Jakarta Motor Service Hub</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <User className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-orange-500">
          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Antrean</p>
          <p className="text-2xl font-black">{tasks.filter(t => t.status === 'QUEUED').length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Dikerjakan</p>
          <p className="text-2xl font-black">{tasks.filter(t => t.status === 'PROGRESS').length}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Tugas Aktif</h3>
        
        {tasks.length === 0 ? (
          <div className="glass-card p-10 rounded-3xl flex flex-col items-center justify-center text-center opacity-50">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm font-bold">Semua tugas selesai!</p>
            <p className="text-[10px] mt-1 text-muted-foreground">Istirahat sejenak atau cek antrean baru.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`glass-card rounded-3xl overflow-hidden border transition-all ${task.status === 'PROGRESS' ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-border'}`}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black tracking-tighter">{task.plateNumber}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                        task.status === 'PROGRESS' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {task.status === 'PROGRESS' ? 'Pengerjaan' : 'Antrean'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">{task.model} - {task.customerName}</p>
                  </div>
                  <Clock className="w-5 h-5 text-muted-foreground/30" />
                </div>

                <div className="p-3 bg-muted/40 rounded-xl mb-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Keluhan
                  </p>
                  <p className="text-xs font-medium leading-relaxed italic">"{task.complaint || 'Tidak ada catatan keluhan'}"</p>
                </div>

                {task.startTime && (
                  <div className="mb-4 flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/5 p-2 rounded-lg border border-blue-500/20">
                    <Clock className="w-3 h-3" /> Dimulai: {new Date(task.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <div className="space-y-1.5 mb-5">
                   <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Jasa & Part</p>
                   {task.services.map((s, idx) => (
                     <div key={idx} className="flex items-center gap-2 text-xs font-bold">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                       {s}
                     </div>
                   ))}
                </div>

                <div className="flex gap-2">
                  {task.status === 'QUEUED' ? (
                    <button 
                      onClick={() => updateStatus(task.id, 'PROGRESS')}
                      className="flex-1 py-3.5 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      <Play className="w-4 h-4" /> MULAI KERJA
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => updateStatus(task.id, 'TESTING')}
                        className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" /> SELESAI
                      </button>
                      <button className="w-14 py-3.5 bg-muted rounded-2xl flex items-center justify-center active:scale-95 transition-all">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Nav Simulation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border flex justify-around">
         <div className="flex flex-col items-center gap-1 text-primary">
            <Wrench className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Tugas</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Riwayat</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Profil</span>
         </div>
      </div>
    </div>
  );
};

export default MechanicControl;
