import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Wrench, Bike, Car, Play } from 'lucide-react';
import api from '../api';

const CustomerDisplay: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Auto refresh every 5s
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/work-orders');
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch display data', error);
    }
  };

  const progressTasks = tasks.filter(t => t.status === 'PROGRESS');
  const queuedTasks = tasks.filter(t => t.status === 'QUEUED');

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Jakarta Motor</h1>
            <p className="text-primary font-bold tracking-[0.3em] text-sm uppercase">Status Servis Kendaraan</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-black tracking-tighter text-zinc-400">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* PROGRESS COLUMN */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
              <Play className="w-6 h-6 text-blue-500 fill-blue-500" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-blue-500">Sedang Dikerjakan</h2>
          </div>
          <div className="flex-1 space-y-4">
            {progressTasks.length === 0 ? (
              <div className="h-40 bg-zinc-900/30 rounded-[2rem] border border-zinc-800 border-dashed flex items-center justify-center text-zinc-600 font-bold italic">
                Tidak ada unit dalam pengerjaan
              </div>
            ) : (
              progressTasks.map(t => (
                <div key={t.id} className="bg-zinc-900/50 border-l-8 border-blue-500 p-8 rounded-[2rem] flex justify-between items-center animate-in slide-in-from-left-10 duration-500">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                      {t.vehicleType === 'MOBIL' ? <Car className="w-10 h-10 text-blue-400" /> : <Bike className="w-10 h-10 text-blue-400" />}
                    </div>
                    <div>
                      <h3 className="text-6xl font-mono font-black tracking-widest text-white leading-none">{t.plateNumber}</h3>
                      <p className="text-xl font-bold text-zinc-500 uppercase mt-2">{t.model || 'Sepeda Motor'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 mb-2 inline-block">
                      <span className="text-blue-500 font-black text-sm uppercase tracking-widest">PIT {Math.floor(Math.random() * 3) + 1}</span>
                    </div>
                    <p className="text-zinc-500 font-bold text-sm uppercase">Mekanik: {t.mechanic?.name?.split(' ')[0] || 'Tersedia'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QUEUED COLUMN */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-orange-500/20 p-3 rounded-xl border border-orange-500/30">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-orange-500">Antrean Berikutnya</h2>
          </div>
          <div className="flex-1 space-y-4">
            {queuedTasks.length === 0 ? (
              <div className="h-40 bg-zinc-900/30 rounded-[2rem] border border-zinc-800 border-dashed flex items-center justify-center text-zinc-600 font-bold italic">
                Antrean kosong
              </div>
            ) : (
              queuedTasks.slice(0, 5).map(t => (
                <div key={t.id} className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl flex justify-between items-center opacity-70 scale-95">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-zinc-800/50 rounded-xl flex items-center justify-center border border-zinc-700/50">
                      {t.vehicleType === 'MOBIL' ? <Car className="w-6 h-6 text-zinc-500" /> : <Bike className="w-6 h-6 text-zinc-500" />}
                    </div>
                    <div>
                      <h3 className="text-4xl font-mono font-black tracking-widest text-zinc-300">{t.plateNumber}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-600 font-black text-sm uppercase">MENUNGGU</span>
                  </div>
                </div>
              ))
            )}
            {queuedTasks.length > 5 && (
              <div className="p-4 text-center">
                <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-xs">+{queuedTasks.length - 5} Unit Lainnya Dalam Antrean</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Scrolling Text */}
      <div className="mt-10 bg-primary/10 border border-primary/20 p-4 rounded-2xl overflow-hidden relative group">
        <div className="whitespace-nowrap flex items-center gap-20 animate-marquee">
          <span className="text-primary font-black uppercase tracking-widest text-sm flex items-center gap-4 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> INFO: SERVIS RUTIN MENJAGA PERFORMA MESIN TETAP OPTIMAL 
          </span>
          <span className="text-primary font-black uppercase tracking-widest text-sm flex items-center gap-4 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> TERSEDIA PEMBAYARAN VIA QRIS & TRANSFER BANK
          </span>
          <span className="text-primary font-black uppercase tracking-widest text-sm flex items-center gap-4 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> HUBUNGI KASIR UNTUK KONSULTASI MASALAH MOTOR ANDA
          </span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CustomerDisplay;
