import React, { useState, useEffect } from 'react';
import { History, Search, ArrowUpRight, ArrowDownLeft, Package, Loader2, X, AlertCircle } from 'lucide-react';
import api from '../api';

interface StockLog {
  id: string;
  type: string;
  changeQty: number;
  previousStock: number;
  currentStock: number;
  description: string;
  reference?: string;
  createdAt: string;
  product: {
    name: string;
    barcode: string;
  };
  user?: {
    name: string;
  };
}

export const StockLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/stock-logs');
      setLogs(res.data);
    } catch (error: any) {
      console.error('Failed to fetch stock logs', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.product?.barcode?.includes(searchTerm)) ||
    (log.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.reference?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getLogTypeInfo = (type: string) => {
    switch (type) {
      case 'SALE': return { label: 'Penjualan', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
      case 'RESTOCK': return { label: 'Penambahan', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' };
      case 'RETURN': return { label: 'Retur', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' };
      default: return { label: 'Penyesuaian', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' };
    }
  };

  return (
    <div className="pb-32 mesh-bg min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 pt-8 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-gradient">Riwayat Stok</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Audit Pergerakan Barang</p>
          </div>
          <button onClick={fetchLogs} className="p-3 bg-primary/10 text-primary rounded-2xl active:scale-90 transition-all">
             <History className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari Barang, Barcode, atau Alasan..."
            className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Menarik Data Audit...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 opacity-40">
            <History className="w-12 h-12" />
            <p className="text-sm font-bold">Tidak ada riwayat ditemukan</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const info = getLogTypeInfo(log.type);
            return (
              <button 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className="w-full glass-card p-4 rounded-[2rem] border-white/5 text-left active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${info.bg} ${info.color}`}>
                      {log.changeQty > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm uppercase truncate">{log.product?.name || 'Produk'}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${log.changeQty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {log.changeQty > 0 ? '+' : ''}{log.changeQty}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground">Sisa: {log.currentStock}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Detail Sheet */}
      {selectedLog && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-card rounded-t-[3rem] border-t border-white/10 p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center -mt-4 mb-4"><div className="w-12 h-1.5 bg-white/10 rounded-full" /></div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Detail Audit</h3>
                <p className="text-xl font-black uppercase tracking-tighter italic">Log Pergerakan Stok</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-3 bg-muted rounded-2xl"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Package className="w-7 h-7 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base uppercase truncate leading-tight">{selectedLog.product?.name || 'Produk'}</p>
                  <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-widest">BC: {selectedLog.product?.barcode || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tipe</p>
                   <p className="text-xs font-black uppercase">{getLogTypeInfo(selectedLog.type).label}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-white/5 text-right">
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Perubahan</p>
                   <p className={`text-xs font-black ${selectedLog.changeQty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedLog.changeQty > 0 ? '+' : ''}{selectedLog.changeQty} Unit
                   </p>
                </div>
              </div>

              <div className="p-5 bg-background/50 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Keterangan / Alasan
                </p>
                <p className="text-sm font-bold italic text-foreground/90 leading-relaxed">
                  "{selectedLog.description || selectedLog.reference || 'Tidak ada keterangan.'}"
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                 <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                    <span>Petugas</span>
                    <span className="text-foreground">{selectedLog.user?.name || 'Administrator'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                    <span>Waktu</span>
                    <span className="text-foreground">{new Date(selectedLog.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                 </div>
                 <div className="flex justify-between items-center p-5 bg-primary/10 rounded-[2rem] border border-primary/20 mt-4">
                    <span className="text-xs font-black uppercase tracking-widest text-primary">Stok Akhir</span>
                    <span className="text-3xl font-black text-primary font-mono">{selectedLog.currentStock}</span>
                 </div>
              </div>
            </div>

            <button onClick={() => setSelectedLog(null)}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all">
              Tutup Audit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
