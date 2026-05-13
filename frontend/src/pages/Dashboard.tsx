import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Users, Wrench, AlertTriangle, Loader2, ArrowRight, Activity, Calendar, Truck, Clock } from 'lucide-react';
import api from '../api';

interface DashboardProps {
  setActivePage: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActivePage }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconMap: any = {
    TrendingUp: TrendingUp,
    Package: Package,
    Users: Users,
    Wrench: Wrench
  };

  const handleStatClick = (label: string) => {
    if (label.toUpperCase().includes('STOK') || label.toUpperCase().includes('CADANG')) {
      localStorage.setItem('filter_low_stock', 'true');
      setActivePage('inventory');
    }
  };

  if (isLoading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black italic text-muted-foreground tracking-widest animate-pulse">SINKRONISASI DATA...</p>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role?.toLowerCase();

  return (
    <div className="space-y-8 pb-10">
      {/* Header with Date */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase">Ringkasan Bisnis</h2>
          <p className="text-sm text-muted-foreground font-medium">Laporan performa bengkel hari ini secara real-time.</p>
        </div>
        <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-2xl border border-border">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest">
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.stats.map((stat: any, idx: number) => {
          const Icon = iconMap[stat.icon] || TrendingUp;
          const isClickable = stat.label.toUpperCase().includes('STOK') || stat.label.toUpperCase().includes('CADANG');

          return (
            <div 
              key={idx} 
              onClick={() => isClickable && handleStatClick(stat.label)}
              className={`glass-card p-6 rounded-[2rem] hover-glow group border border-border/50 relative overflow-hidden transition-all ${
                isClickable ? 'cursor-pointer hover:border-primary/50' : ''
              }`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-4 rounded-2xl bg-muted/80 group-hover:scale-110 transition-all duration-500 border border-border`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {isClickable && (
                  <div className="bg-primary/10 text-primary p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase border ${
                  stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                }`}>
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-muted-foreground text-xs font-black uppercase tracking-widest relative z-10">{stat.label}</h3>
              <p className="text-2xl font-black mt-2 tracking-tight relative z-10">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Supplier Due Alerts Section - ONLY FOR ADMIN */}
        {userRole === 'admin' && (
          <div className="lg:col-span-1 glass-card p-8 rounded-[2.5rem] border border-border/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg"><Clock className="text-red-500 w-5 h-5" /></div>
                <h3 className="font-black text-xl tracking-tight">Hutang Jatuh Tempo</h3>
              </div>
            </div>
            <div className="space-y-3">
              {data.duePurchases && data.duePurchases.length > 0 ? (
                data.duePurchases.map((p: any) => (
                  <div key={p.id} className="group p-4 bg-red-500/5 rounded-2xl border border-red-500/20 hover:border-red-500/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-xs text-red-500 uppercase tracking-widest">{p.invoiceNo}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 bg-red-500 text-white rounded-lg">DUE</span>
                    </div>
                    <p className="font-bold text-sm tracking-tight">{p.supplier}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Rp {p.amount.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-red-500">{new Date(p.dueDate).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Truck className="w-12 h-12 mb-3 text-muted-foreground" />
                  <p className="text-sm font-bold uppercase tracking-widest">Tidak Ada Hutang</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Alert Section */}
        <div className="lg:col-span-1 glass-card p-8 rounded-[2.5rem] border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><AlertTriangle className="text-orange-500 w-5 h-5" /></div>
              <h3 className="font-black text-xl tracking-tight">Peringatan Stok</h3>
            </div>
          </div>
          <div className="space-y-3">
            {data.lowStockList.length > 0 ? (
              data.lowStockList.map((part: any) => (
                <div key={part.id} className="group flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50 hover:border-orange-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <div>
                      <p className="font-black text-sm tracking-tight">{part.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Sisa: <span className="text-orange-500">{part.stock}</span> • Min: {part.minStock}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-orange-500/10 text-orange-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <Package className="w-12 h-12 mb-3 text-muted-foreground" />
                <p className="text-sm font-bold uppercase tracking-widest">Stok Aman</p>
              </div>
            )}
          </div>
        </div>

        {/* Workshop Status Table */}
        <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Activity className="text-primary w-5 h-5" /></div>
              <h3 className="font-black text-xl tracking-tight">Aktivitas Bengkel Terbaru</h3>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Monitor Antrean</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] border-b border-border/50">
                  <th className="pb-4 px-2">Unit</th>
                  <th className="pb-4 px-2">Model</th>
                  <th className="pb-4 px-2">Pekerjaan</th>
                  <th className="pb-4 px-2">Mekanik</th>
                  <th className="pb-4 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.recentTasks.map((item: any, idx: number) => (
                  <tr key={idx} className="group hover:bg-muted/20 transition-all">
                    <td className="py-5 px-2">
                      <div className="font-mono font-black text-sm text-primary group-hover:scale-105 transition-transform inline-block uppercase">
                        {item.plate}
                      </div>
                    </td>
                    <td className="py-5 px-2 text-xs font-bold text-zinc-300">{item.vehicle}</td>
                    <td className="py-5 px-2 text-xs font-bold">{item.service}</td>
                    <td className="py-5 px-2 text-xs font-medium text-muted-foreground">{item.mechanic}</td>
                    <td className="py-5 px-2 text-right">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        item.status === 'Berjalan' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        item.status === 'Selesai' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                        'bg-orange-500/10 text-orange-500 border-orange-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentTasks.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-30">Belum ada aktivitas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
