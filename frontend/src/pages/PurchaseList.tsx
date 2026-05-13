import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Truck, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Clock, Filter, X } from 'lucide-react';
import api from '../api';
import ConfirmModal from '../components/ConfirmModal';

interface PurchaseItem {
  id: string;
  productId: string;
  product: { name: string; barcode: string };
  quantity: number;
  returnedQty: number;
  purchasePrice: number;
}

interface Purchase {
  id: string;
  invoiceNo: string;
  supplier: { name: string };
  purchaseDate: string;
  dueDate: string | null;
  totalAmount: number;
  status        : 'LUNAS' | 'HUTANG';
  notes         : string | null;
  invoiceImage  : string | null;
  items         : PurchaseItem[];
}

const PurchaseList: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
  // Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState<{ [key: string]: { qty: number, reason: string } }>({});
  const [isReturning, setIsReturning] = useState(false);

  // Confirm Modal State
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string } | null>(null);

  const handleReturnSubmit = async () => {
    if (!selectedPurchase) return;
    
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, data]) => data.qty > 0)
      .map(([id, data]) => ({ purchaseItemId: id, qty: data.qty, reason: data.reason }));

    if (itemsToReturn.length === 0) return alert('Pilih barang yang akan diretur');

    setIsReturning(true);
    try {
      await api.post(`/suppliers/purchases/${selectedPurchase.id}/return`, { itemsToReturn });
      setShowReturnModal(false);
      setSelectedPurchase(null);
      setReturnItems({});
      fetchPurchases();
    } catch (error: any) {
      alert('Gagal memproses retur: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsReturning(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!selectedPurchase) return;
    
    setConfirmData({
      isOpen: true,
      title: 'Konfirmasi Pelunasan',
      message: `Anda akan melunasi nota ${selectedPurchase.invoiceNo} sebesar Rp ${selectedPurchase.totalAmount.toLocaleString('id-ID')}? \n\nStatus nota akan berubah menjadi LUNAS.`,
      onConfirm: async () => {
        try {
          await api.post(`/suppliers/purchases/${selectedPurchase.id}/pay`);
          alert('Nota berhasil dilunasi!');
          setSelectedPurchase(null);
          fetchPurchases();
        } catch (error: any) {
          alert('Gagal melunasi nota: ' + (error.response?.data?.error || error.message));
        }
      }
    });
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/suppliers/purchases');
      setPurchases(res.data);
    } catch (error) {
      console.error('Failed to fetch purchases', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDueSoon = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const isOverdue = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    return dueDate < today;
  };

  const filteredPurchases = purchases.filter(p => 
    p.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Riwayat Pembelian</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Pantau nota pembelian dan status pembayaran ke supplier.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nomor nota atau nama supplier..."
            className="w-full bg-card/30 border border-border rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menarik Data Transaksi Supplier...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPurchases.map((p) => {
            const dueSoon = p.status === 'HUTANG' && isDueSoon(p.dueDate);
            const overdue = p.status === 'HUTANG' && isOverdue(p.dueDate);

            return (
              <div 
                key={p.id} 
                onClick={() => setSelectedPurchase(p)}
                className={`glass-card p-6 rounded-[2rem] border transition-all group cursor-pointer hover:shadow-xl ${
                  overdue ? 'border-red-500/50 bg-red-500/5' : 
                  dueSoon ? 'border-orange-500/50 bg-orange-500/5' : 
                  'border-border/50 hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-inner ${
                      p.status === 'LUNAS' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-black text-xl group-hover:text-primary transition-colors">{p.invoiceNo}</h3>
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          p.status === 'LUNAS' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {p.supplier.name}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(p.purchaseDate).toLocaleDateString('id-ID')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Pembayaran</p>
                       <p className="text-2xl font-black text-foreground italic">Rp {p.totalAmount.toLocaleString('id-ID')}</p>
                    </div>

                    {p.status === 'HUTANG' && p.dueDate && (
                      <div className={`px-6 py-3 rounded-2xl border text-center min-w-[140px] ${
                        overdue ? 'bg-red-500 text-white animate-pulse' : 
                        dueSoon ? 'bg-orange-500 text-white' : 
                        'bg-muted border-border'
                      }`}>
                         <p className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-0.5">Jatuh Tempo</p>
                         <p className="text-xs font-black">{new Date(p.dueDate).toLocaleDateString('id-ID')}</p>
                         {overdue && <p className="text-[8px] font-black uppercase mt-1">MELEWATI BATAS!</p>}
                         {dueSoon && !overdue && <p className="text-[8px] font-black uppercase mt-1">SEGERA BAYAR!</p>}
                      </div>
                    )}

                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[85vh] border border-border/50">
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20"><FileText className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Detail Nota Pembelian</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">{selectedPurchase.invoiceNo} — {selectedPurchase.supplier.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tanggal Transaksi</p>
                     <p className="font-black">{new Date(selectedPurchase.purchaseDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Jatuh Tempo</p>
                     <p className={`font-black ${selectedPurchase.status === 'HUTANG' ? 'text-red-500' : ''}`}>
                        {selectedPurchase.dueDate ? new Date(selectedPurchase.dueDate).toLocaleDateString('id-ID', { dateStyle: 'full' }) : '-'}
                     </p>
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Daftar Barang Masuk</p>
                  <div className="border border-border/50 rounded-2xl overflow-hidden">
                     <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 font-black uppercase text-[10px] tracking-widest">
                           <tr>
                              <th className="px-5 py-3">Nama Barang</th>
                              <th className="px-5 py-3 text-center">Qty</th>
                              <th className="px-5 py-3 text-right">Harga Satuan</th>
                              <th className="px-5 py-3 text-right">Subtotal</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                           {selectedPurchase.items.map((item, idx) => (
                              <tr key={idx}>
                                 <td className="px-5 py-4">
                                    <p className="font-black">{item.product.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{item.product.barcode}</p>
                                 </td>
                                 <td className="px-5 py-4 text-center font-black">
                                    {item.quantity} PCS
                                    {item.returnedQty > 0 && <span className="block text-[9px] text-red-500">(-{item.returnedQty} Retur)</span>}
                                 </td>
                                 <td className="px-5 py-4 text-right font-bold italic">Rp {item.purchasePrice.toLocaleString()}</td>
                                 <td className="px-5 py-4 text-right font-black text-primary">Rp {(item.quantity * item.purchasePrice).toLocaleString()}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               {selectedPurchase.notes && (
                 <div className="mt-8 p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/20 italic text-sm font-medium">
                    <p className="text-[10px] font-black uppercase text-yellow-600 mb-2 not-italic">Catatan Tambahan:</p>
                    "{selectedPurchase.notes}"
                 </div>
               )}

               {selectedPurchase.invoiceImage && (
                 <div className="mt-8 space-y-3">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Foto Nota / Bukti Pembelian</p>
                   <div className="rounded-[2rem] overflow-hidden border border-border shadow-lg">
                     <img 
                       src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/${selectedPurchase.invoiceImage}`} 
                       alt="Invoice" 
                       className="w-full h-auto object-contain max-h-[400px] bg-muted/50"
                     />
                   </div>
                 </div>
               )}
            </div>

            <div className="p-8 border-t border-border/50 bg-zinc-900 text-white flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Grand Total</p>
                  <p className="text-xl font-black italic text-primary">Rp {selectedPurchase.totalAmount.toLocaleString('id-ID')}</p>
               </div>
                <div className="flex items-center gap-3">
                  {selectedPurchase.status === 'HUTANG' && (
                    <button 
                      onClick={handlePayInvoice}
                      className="px-6 py-3 bg-green-500 text-white hover:bg-green-600 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Lunasin Nota
                    </button>
                  )}
                  <button onClick={() => { setReturnItems({}); setShowReturnModal(true); }} className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Retur Barang</button>
                  <button onClick={() => setSelectedPurchase(null)} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Tutup Detail</button>
                </div>
            </div>
          </div>
        </div>
      )}
      {/* Return Modal */}
      {showReturnModal && selectedPurchase && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col border border-border/50">
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-red-500/5">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-red-500">Retur Pembelian</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Kembalikan barang cacat/rusak ke {selectedPurchase.supplier.name}</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-5 py-3">Nama Barang</th>
                    <th className="px-5 py-3 text-center">Beli</th>
                    <th className="px-5 py-3 text-center">Sudah Retur</th>
                    <th className="px-5 py-3 text-center">Qty Retur Saat Ini</th>
                    <th className="px-5 py-3">Alasan Retur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedPurchase.items.map((item) => {
                    const availableToReturn = item.quantity - (item.returnedQty || 0);
                    return (
                      <tr key={item.id} className={availableToReturn === 0 ? 'opacity-50' : ''}>
                        <td className="px-5 py-4 font-black">{item.product.name}</td>
                        <td className="px-5 py-4 text-center">{item.quantity}</td>
                        <td className="px-5 py-4 text-center">{item.returnedQty || 0}</td>
                        <td className="px-5 py-4 text-center">
                          <input 
                            type="number" 
                            min="0" 
                            max={availableToReturn}
                            disabled={availableToReturn === 0}
                            className="w-20 bg-muted border border-border rounded-xl px-3 py-2 text-center font-black focus:outline-none focus:border-red-500"
                            value={returnItems[item.id]?.qty || ''}
                            onChange={(e) => {
                              const val = Math.min(availableToReturn, Math.max(0, Number(e.target.value)));
                              setReturnItems(prev => ({...prev, [item.id]: { ...prev[item.id], qty: val, reason: prev[item.id]?.reason || '' }}));
                            }}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <input 
                            type="text" 
                            placeholder="Contoh: Pecah, Cacat Pabrik"
                            disabled={availableToReturn === 0}
                            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500"
                            value={returnItems[item.id]?.reason || ''}
                            onChange={(e) => {
                              setReturnItems(prev => ({...prev, [item.id]: { ...prev[item.id], qty: prev[item.id]?.qty || 0, reason: e.target.value }}));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-border/50 flex items-center justify-end gap-4 bg-muted/20">
              <button onClick={() => setShowReturnModal(false)} className="px-6 py-3 hover:bg-muted rounded-xl font-bold text-sm transition-all">Batal</button>
              <button 
                onClick={handleReturnSubmit}
                disabled={isReturning || Object.values(returnItems).every(v => !v.qty || v.qty === 0)}
                className="px-8 py-3 bg-red-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isReturning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Proses Retur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmData && (
        <ConfirmModal 
          isOpen={confirmData.isOpen}
          onClose={() => setConfirmData(null)}
          onConfirm={confirmData.onConfirm}
          title={confirmData.title}
          message={confirmData.message}
          type="success"
        />
      )}

    </div>
  );
};

export default PurchaseList;
