import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, ArrowLeft, Share2, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

interface Product {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  supplier?: string;
  price: number;
}

export const ShoppingListPage: React.FC = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStock();
  }, []);

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      const lowStock = res.data.filter((p: Product) => p.stock <= p.minStock);
      setItems(lowStock);
    } catch (error) {
      console.error('Failed to fetch shopping list', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const text = items.map(item => `- ${item.name}: Butuh segera (Stok: ${item.stock}, Min: ${item.minStock})`).join('\n');
    const msg = `*DAFTAR BELANJA JAKARTA MOTOR*\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n${text}\n\nMohon segera diproses.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 animate-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-muted rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Daftar Belanja</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Otomatis Berdasarkan Stok</p>
          </div>
        </div>
        <button onClick={fetchLowStock} className="p-2.5 bg-primary/10 text-primary rounded-xl active:scale-90 transition-all">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-black font-mono text-orange-500">{items.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Barang perlu di-restock</p>
        </div>
      </div>

      {/* Action Buttons */}
      {items.length > 0 && (
        <button 
          onClick={handleShare}
          className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" /> Bagikan Ke Supplier (WA)
        </button>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Menganalisis Gudang...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-3xl flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <p className="font-black text-lg uppercase tracking-tight">Stok Aman!</p>
              <p className="text-xs text-muted-foreground mt-1">Semua barang memiliki jumlah yang cukup.</p>
            </div>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm uppercase tracking-tight truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-red-400 uppercase bg-red-500/10 px-1.5 py-0.5 rounded">Stok: {item.stock}</span>
                  <span className="text-[10px] font-bold text-muted-foreground italic">Min: {item.minStock}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-primary">Rp {item.price?.toLocaleString('id-ID')}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Est. Harga</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
