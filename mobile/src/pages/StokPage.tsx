import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, X, Package, Plus, Minus, CheckCircle2, Loader2, AlertTriangle, ScanLine, History } from 'lucide-react';
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
  const [stockDelta, setStockDelta] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', barcode: '', stock: 0, priceNormal: 0, location: '', minStock: 5 });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedBarcode = useRef<string>('');

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
    setStockDelta(0);
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 150));
    try {
      const qr = new Html5Qrcode('stock-reader');
      scannerRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 30, qrbox: { width: 300, height: 200 } },
        (decoded) => {
          scannedBarcode.current = decoded;
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
      setStockDelta(0);
    } else {
      setNewProduct(prev => ({ ...prev, barcode }));
      setShowNewForm(true);
    }
  };

  const handleUpdateStock = async () => {
    if (!foundProduct || stockDelta === 0) return;
    setIsSaving(true);
    try {
      const newStock = foundProduct.stock + stockDelta;
      await api.patch(`/products/${foundProduct.id}`, { stock: newStock });
      setScanSuccess(true);
      setTimeout(() => {
        setScanSuccess(false);
        setFoundProduct(null);
        setStockDelta(0);
        setSearch('');
        fetchProducts();
      }, 1500);
    } catch { alert('Gagal update stok'); }
    finally { setIsSaving(false); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', newProduct);
      setShowNewForm(false);
      setSearch('');
      fetchProducts();
    } catch { alert('Gagal menambah barang'); }
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
          <div className={`rounded-3xl border-2 overflow-hidden transition-all ${scanSuccess ? 'border-green-500 bg-green-500/5' : 'border-primary bg-primary/5'}`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-sm">{foundProduct.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{foundProduct.barcode}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${foundProduct.stock <= foundProduct.minStock ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                      Stok: {foundProduct.stock} pcs
                    </span>
                    {foundProduct.location && <span className="px-2 py-1 bg-muted rounded-lg text-[10px] font-bold text-muted-foreground">{foundProduct.location}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-primary">Rp {foundProduct.priceNormal.toLocaleString('id-ID')}</p>
                  {scanSuccess && <p className="text-[10px] font-bold text-green-400 mt-1">✓ Stok diperbarui!</p>}
                </div>
              </div>
            </div>

            {!scanSuccess && (
              <div className="px-4 pb-4 border-t border-border/50 pt-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Update Stok</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setStockDelta(p => p - 1)}
                    className="w-12 h-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-xl flex items-center justify-center active:scale-90 transition-all">
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className={`text-3xl font-black ${stockDelta > 0 ? 'text-green-400' : stockDelta < 0 ? 'text-red-400' : 'text-foreground'}`}>
                      {stockDelta > 0 ? `+${stockDelta}` : stockDelta}
                    </p>
                    <p className="text-[10px] text-muted-foreground">→ Jadi: {foundProduct.stock + stockDelta} pcs</p>
                  </div>
                  <button onClick={() => setStockDelta(p => p + 1)}
                    className="w-12 h-12 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl font-black text-xl flex items-center justify-center active:scale-90 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick add buttons */}
                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25].map(n => (
                    <button key={n} onClick={() => setStockDelta(p => p + n)}
                      className="flex-1 py-2 bg-muted rounded-xl text-xs font-black text-muted-foreground hover:text-foreground transition-all active:scale-90">
                      +{n}
                    </button>
                  ))}
                </div>

                <button onClick={handleUpdateStock} disabled={isSaving || stockDelta === 0}
                  className="w-full mt-3 py-3.5 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Simpan Perubahan Stok
                </button>
              </div>
            )}
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
          <div className="flex flex-col items-center py-12 gap-3">
            <Package className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">Barang tidak ditemukan</p>
            <button onClick={() => { setNewProduct(p => ({ ...p, barcode: search })); setShowNewForm(true); }}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 transition-all">
              + Daftarkan sebagai Barang Baru
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 60).map(p => (
              <button key={p.id} onClick={() => { setFoundProduct(p); setStockDelta(0); setSearch(p.barcode); }}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 active:scale-[0.98] transition-all">
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
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Product Sheet */}
      {showNewForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewForm(false)} />
          <div className="relative bg-card rounded-t-3xl border-t border-border max-h-[85vh] overflow-y-auto">
            <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-muted rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <div><h3 className="font-black text-base">Barang Baru</h3><p className="text-[10px] text-muted-foreground">Daftarkan produk ke sistem</p></div>
              <button onClick={() => setShowNewForm(false)} className="p-2 bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddProduct} className="px-5 pb-10 space-y-4">
              {newProduct.barcode && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Barcode Terdeteksi</p>
                  <p className="font-mono font-bold">{newProduct.barcode}</p>
                </div>
              )}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Nama Barang *</label>
                <input required autoFocus placeholder="Contoh: Oli Yamalube 1L"
                  value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              {!newProduct.barcode && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Barcode</label>
                  <input placeholder="Scan atau ketik manual"
                    value={newProduct.barcode} onChange={e => setNewProduct(p => ({ ...p, barcode: e.target.value }))}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Stok Awal</label>
                  <input required type="number" min="0" value={newProduct.stock}
                    onChange={e => setNewProduct(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Stok Minimum</label>
                  <input type="number" min="0" value={newProduct.minStock}
                    onChange={e => setNewProduct(p => ({ ...p, minStock: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Harga Jual</label>
                  <input required type="number" min="0" value={newProduct.priceNormal}
                    onChange={e => setNewProduct(p => ({ ...p, priceNormal: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Lokasi Rak</label>
                  <input placeholder="A1, B2..." value={newProduct.location}
                    onChange={e => setNewProduct(p => ({ ...p, location: e.target.value.toUpperCase() }))}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all">
                SIMPAN BARANG
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
