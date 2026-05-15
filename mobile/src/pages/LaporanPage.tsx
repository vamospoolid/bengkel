import React, { useState, useEffect } from 'react';
import { 
  Package, Wrench, Loader2, Activity, ShoppingBag, Star, RefreshCw
} from 'lucide-react';
import api from '../api';

interface ReportData {
  summary: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    partsRevenue: number;
    servicesRevenue: number;
  };
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
}

export const LaporanPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let startDate: Date;
      let endDate: Date = new Date();

      if (dateRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === '30d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate = new Date(0); // All time
      }

      const res = await api.get('/reports/financial', { 
        params: { 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        } 
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyusun Laporan...</p>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="pb-32 px-5 pt-8 space-y-8 mesh-bg min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gradient">Analisis Bisnis</h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Laporan Performa Jakarta Motor</p>
        </div>
        <button onClick={fetchReport} className="p-3 bg-muted rounded-2xl text-muted-foreground active:rotate-180 transition-all duration-500">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Date Filter */}
      <div className="flex bg-muted/50 p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
        {(['today', '7d', '30d', 'all'] as const).map(r => (
          <button 
            key={r}
            onClick={() => setDateRange(r)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              dateRange === r ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'text-muted-foreground'
            }`}
          >
            {r === 'today' ? 'Hari Ini' : r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : 'Semua'}
          </button>
        ))}
      </div>

      {summary && (
        <div className="space-y-6">
          {/* Main Profit Card */}
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group border-b-4 border-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="flex items-center justify-between relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Laba Bersih ({dateRange})</p>
              <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${summary.netProfit >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {summary.netProfit >= 0 ? 'Profit' : 'Loss'}
              </div>
            </div>

            <div className="space-y-1 relative z-10">
              <p className={`text-4xl font-black font-mono tracking-tighter ${summary.netProfit >= 0 ? 'text-gradient' : 'text-red-500'}`}>
                Rp {summary.netProfit.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Hasil akhir setelah biaya operasional</p>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-white/5">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Omzet</p>
                <p className="text-sm font-black font-mono text-green-400">Rp {summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Biaya</p>
                <p className="text-sm font-black font-mono text-red-400">Rp {summary.totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-[2rem] space-y-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Suku Cadang</p>
                <p className="text-sm font-black font-mono">Rp {summary.partsRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="glass-card p-6 rounded-[2rem] space-y-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500"><Wrench className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Jasa Servis</p>
                <p className="text-sm font-black font-mono">Rp {summary.servicesRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Top Items Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Performa Item</p>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-orange-400" />
                  <p className="text-xs font-black uppercase tracking-widest">Produk Terlaris</p>
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {data.topProducts.slice(0, 3).map((p, i) => (
                  <div key={i} className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase truncate max-w-[150px]">{p.name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground">{p.quantity} Unit Terjual</p>
                    </div>
                    <p className="text-xs font-black text-primary">Rp {p.revenue.toLocaleString()}</p>
                  </div>
                ))}
                {data.topProducts.length === 0 && <p className="p-8 text-center text-[10px] italic text-muted-foreground">Belum ada data produk</p>}
              </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-blue-400" />
                  <p className="text-xs font-black uppercase tracking-widest">Servis Terfavorit</p>
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {data.topServices.slice(0, 3).map((s, i) => (
                  <div key={i} className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase truncate max-w-[150px]">{s.name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground">{s.count} Kali Dikerjakan</p>
                    </div>
                    <p className="text-xs font-black text-blue-400">Rp {s.revenue.toLocaleString()}</p>
                  </div>
                ))}
                {data.topServices.length === 0 && <p className="p-8 text-center text-[10px] italic text-muted-foreground">Belum ada data servis</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
