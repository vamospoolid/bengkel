import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, X, Package, Loader2, AlertTriangle, ScanLine, History } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  minStock: number;
  priceNormal: number;
  location?: string;
  category?: string;
}

export const StokPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchProducts();
    return () => { stopScanner(); };
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const startScanner = async () => {
    setFoundProduct(null);
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 150));
    try {
      const qr = new Html5Qrcode('stock-reader');
      scannerRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 30, qrbox: { width: 300, height: 200 } },
        (decoded) => {
          stopScanner();
          handleBarcodeResult(decoded);
        },
        () => {}
      );
    } catch (err: any) {
      console.error(err);
      alert('Camera Error: ' + err);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleBarcodeResult = (barcode: string) => {
    setSearch(barcode);
    const found = products.find(p => p.barcode === barcode);
    if (found) {
      setFoundProduct(found);
    }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );

  const lowStock = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gradient">Stok Barang</h1>
            <p className="text-[10px] text-muted-foreground">{products.length} produk • {lowStock > 0 && <span className="text-red-400 font-bold">{lowStock} hampir habis</span>}</p>
          </div>
          <button onClick={() => navigate('/stock-logs')}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all active:scale-95 border border-white/5">
            <History className="w-4 h-4" />
            Riwayat
          </button>
        </div>

        {/* Search + Scan */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setFoundProduct(null); }}
              placeholder="Cari nama atau barcode..."
              className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <button onClick={isScanning ? stopScanner : startScanner}
            className={`p-3 rounded-xl border-2 transition-all active:scale-90 ${isScanning ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-primary/10 border-primary/50 text-primary'}`}>
            {isScanning ? <X className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </button>
        </div>

        {/* Camera View */}
        {isScanning && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-black">
            <div id="stock-reader" className="w-full aspect-[16/9]" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-20 border-2 border-primary rounded-xl shadow-[0_0_20px_rgba(255,69,0,0.4)]">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
            </div>
            <p className="absolute bottom-2 w-full text-center text-[10px] font-bold text-white/70 uppercase tracking-widest">
              <ScanLine className="w-3 h-3 inline mr-1" />Arahkan ke barcode
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 space-y-3">
        {/* Scan Result Card */}
        {foundProduct && (
          <div className="rounded-3xl border-2 border-primary bg-primary/5 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm">{foundProduct.name}</p>
                    <button onClick={() => setFoundProduct(null)} className="p-1 bg-muted rounded-lg text-muted-foreground"><X className="w-3 h-3" /></button>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{foundProduct.barcode}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${foundProduct.stock <= foundProduct.minStock ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                      Stok: {foundProduct.stock} pcs
                    </span>
                    {foundProduct.location && <span className="px-3 py-1.5 bg-muted rounded-xl text-[10px] font-bold text-muted-foreground">📍 {foundProduct.location}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Harga Jual</p>
                  <p className="text-lg font-black text-primary">Rp {foundProduct.priceNormal.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {lowStock > 0 && !foundProduct && !search && (
          <div className="flex items-center gap-3 p-3.5 bg-red-500/5 border border-red-500/20 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-red-400">{lowStock} barang hampir habis!</p>
              <p className="text-[10px] text-muted-foreground">Segera lakukan restock.</p>
            </div>
          </div>
        )}

        {/* Product List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
        ) : filtered.length === 0 && search ? (
          <div className="flex flex-col items-center py-16 gap-3 opacity-40">
            <Package className="w-16 h-16 text-muted-foreground" />
            <p className="text-sm font-bold text-muted-foreground">Barang tidak ditemukan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 60).map(p => (
              <div key={p.id} onClick={() => { setFoundProduct(p); setSearch(p.barcode); }}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{p.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{p.barcode}</p>
                    {p.location && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {p.location}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`block px-2.5 py-1 rounded-full text-xs font-black border ${p.stock <= p.minStock ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                      {p.stock} pcs
                    </span>
                    <p className="text-xs font-black text-primary mt-1">Rp {p.priceNormal.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
