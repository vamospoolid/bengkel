import React, { useState, useEffect, useRef } from 'react';
import { History, Search, Filter, ArrowUpRight, ArrowDownLeft, User, Package, Calendar, Loader2, RefreshCw, X, AlertCircle } from 'lucide-react';
import api from '../api';

interface StockLog {
  id: string;
  type: string;
  changeQty: number;
  previousStock: number;
  currentStock: number;
  description: string;
  createdAt: string;
  product: {
    name: string;
    barcode: string;
  };
  user?: {
    name: string;
  };
}

const StockLogs: React.FC = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLogs();
    // Auto-focus search input on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);
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
    log.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.product.barcode.includes(searchTerm) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black tracking-tighter uppercase">Kartu Stok Digital</h3>
          <p className="text-sm text-muted-foreground font-medium">Laporan audit pergerakan seluruh barang bengkel secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari Barang / Barcode / Alasan..."
              className="bg-muted border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchLogs} className="p-2 bg-muted hover:bg-muted/70 rounded-xl transition-all" title="Refresh Data">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border border-border shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-widest font-black border-b border-border">
                <th className="px-6 py-4">Waktu Perubahan</th>
                <th className="px-6 py-4">Informasi Barang</th>
                <th className="px-6 py-4">Jenis Pergerakan</th>
                <th className="px-6 py-4">Petugas</th>
                <th className="px-6 py-4">Detail Perubahan</th>
                <th className="px-6 py-4 text-right">Stok Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-sm font-bold text-muted-foreground animate-pulse">Menghubungkan ke Buku Besar Stok...</p>
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-primary/[0.03] transition-all group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-card border border-border rounded-lg group-hover:border-primary/50 transition-colors">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{log.product.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">BC: {log.product.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit border ${
                        log.type === 'RESTOCK' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        log.type === 'SALE' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                        log.type === 'RETURN' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                        'bg-orange-500/10 border-orange-500/20 text-orange-500'
                      }`}>
                        {log.changeQty > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {log.type === 'SALE' ? 'Penjualan' : log.type === 'RESTOCK' ? 'Penambahan' : log.type === 'RETURN' ? 'Retur' : 'Penyesuaian'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold">{log.user?.name || 'Administrator'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-muted-foreground italic font-medium max-w-[200px] truncate group-hover:whitespace-normal transition-all">"{log.description || log.reference || (log.type === 'RESTOCK' ? 'Penambahan Stok' : log.type === 'SALE' ? 'Penjualan Kasir' : 'Koreksi Stok')}"</p>
                      <p className="text-[10px] font-bold mt-1">
                        {log.previousStock} → <span className={log.changeQty > 0 ? 'text-green-500' : 'text-red-500'}>
                          ({log.changeQty > 0 ? '+' : ''}{log.changeQty})
                        </span>
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-black text-primary font-mono">{log.currentStock}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="opacity-30 flex flex-col items-center gap-2">
                      <History className="w-12 h-12 mb-2" />
                      <p className="font-bold">Belum ada riwayat tercatat.</p>
                      <p className="text-xs italic">Semua pergerakan stok dari Kasir dan Inventaris akan muncul di sini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-border/50">
            <div className="p-8 border-b border-border/50 bg-muted/20 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Detail Audit Stok</h4>
                <p className="text-lg font-black uppercase italic tracking-tighter">Informasi Pergerakan</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase">{selectedLog.product.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground font-bold tracking-widest">BC: {selectedLog.product.barcode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Jenis Perubahan</p>
                  <p className="text-xs font-black uppercase">{selectedLog.type}</p>
                </div>
                <div className="p-4 bg-muted/20 rounded-2xl border border-border/30 text-right">
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Perubahan Qty</p>
                  <p className={`text-xs font-black ${selectedLog.changeQty > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedLog.changeQty > 0 ? '+' : ''}{selectedLog.changeQty} Unit
                  </p>
                </div>
              </div>

              <div className="p-5 bg-card border border-border rounded-2xl shadow-inner">
                <p className="text-[9px] font-black text-muted-foreground uppercase mb-2 tracking-widest flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Keterangan / Alasan
                </p>
                <p className="text-sm font-bold italic leading-relaxed">
                  "{selectedLog.description || selectedLog.reference || 'Tidak ada keterangan tambahan.'}"
                </p>
              </div>

              <div className="space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase px-1">
                    <span>Petugas</span>
                    <span className="text-foreground">{selectedLog.user?.name || 'Administrator'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase px-1">
                    <span>Waktu</span>
                    <span className="text-foreground">{new Date(selectedLog.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                 </div>
                 <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-4">
                    <span className="text-xs font-black uppercase tracking-widest text-primary">Stok Akhir</span>
                    <span className="text-2xl font-black text-primary italic">{selectedLog.currentStock} Unit</span>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-muted/10 border-t border-border/50">
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLogs;
