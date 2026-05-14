import React, { useState, useEffect } from 'react';
import { Package, Plus, QrCode, Tag, MapPin, Layers, Loader2, CheckCircle2, AlertTriangle, X, RefreshCw, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

interface Product {
  id: string;
  name: string;
  barcode: string;
  purchasePrice: number;
  priceNormal: number;
  priceGrosir: number;
  priceMitra: number;
  category: string;
  location: string;
}

export const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateItem, setDuplicateItem] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    location: '',
    purchasePrice: 0,
    priceNormal: 0,
    priceGrosir: 0,
    priceMitra: 0,
    barcode: '',
    stock: 0,
    minStock: 5
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (e) { console.error(e); }
  };

  const generateBarcode = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    const code = `JM-${random}`;
    
    // Check if duplicate in local list
    const exists = products.some(p => p.barcode === code);
    if (exists) return generateBarcode();
    
    setForm(prev => ({ ...prev, barcode: code }));
    setDuplicateItem(null);
  };

  const startScanner = async () => {
    try {
      // Trigger permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());

      setShowScanner(true);
      
      setTimeout(async () => {
        const html5QrCode = new Html5Qrcode("catalog-reader");
        setScanner(html5QrCode);

        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            { 
              fps: 15, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              handleBarcodeResult(decodedText);
              stopScanner(html5QrCode);
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner Start Error:", err);
          setShowScanner(false);
        }
      }, 800);
    } catch (err: any) {
      alert("Izin kamera diperlukan untuk scanning: " + err.message);
      setShowScanner(false);
    }
  };

  const stopScanner = async (inst?: Html5Qrcode) => {
    const s = inst || scanner;
    if (s && s.isScanning) {
      await s.stop();
    }
    setShowScanner(false);
  };

  const handleBarcodeResult = (code: string) => {
    setForm(prev => ({ ...prev, barcode: code }));
    
    // Check for duplicate
    const existing = products.find(p => p.barcode === code);
    if (existing) {
      setDuplicateItem(existing);
      setError(null);
    } else {
      setDuplicateItem(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    // Validation: Duplicate Name Check
    const nameExists = products.some(p => p.name.toLowerCase() === form.name.toLowerCase());
    if (nameExists) {
      setError('Nama barang sudah terdaftar di sistem.');
      setIsSaving(false);
      return;
    }

    // Validation: Duplicate Barcode Check
    const barcodeExists = products.some(p => p.barcode === form.barcode);
    if (barcodeExists) {
      setError('Barcode/QR sudah digunakan barang lain.');
      setIsSaving(false);
      return;
    }

    try {
      await api.post('/products', form);
      setShowSuccess(true);
      setForm({
        name: '',
        brand: '',
        category: '',
        location: '',
        purchasePrice: 0,
        priceNormal: 0,
        priceGrosir: 0,
        priceMitra: 0,
        barcode: '',
        stock: 0,
        minStock: 5
      });
      fetchProducts();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data barang.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-32 mesh-bg min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-gradient leading-none">Pendataan Awal</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Katalog & Generate QR Code</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-6">
        {/* Success Alert */}
        {showSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-[2rem] p-5 flex items-center gap-4 animate-in zoom-in duration-300">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-sm text-green-400 uppercase tracking-tight">Barang Berhasil Disimpan!</p>
              <p className="text-[10px] text-green-500/70 font-bold uppercase tracking-widest">Data telah masuk ke server pusat</p>
            </div>
          </div>
        )}

        {/* Duplicate Alert */}
        {duplicateItem && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-5 flex items-center gap-4 animate-in zoom-in duration-300">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm text-orange-400 uppercase tracking-tight">Barcode Terdaftar!</p>
              <p className="text-[10px] text-orange-500/70 font-bold uppercase tracking-widest leading-tight">
                Barang: <span className="text-orange-400">{duplicateItem.name}</span>
              </p>
            </div>
            <button onClick={() => setDuplicateItem(null)} className="p-2 bg-orange-500/10 rounded-xl text-orange-500"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-5 flex items-center gap-4 animate-in slide-in-from-top duration-300">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm text-red-400 uppercase tracking-tight">Gagal Menyimpan</p>
              <p className="text-[10px] text-red-500/70 font-bold">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-2 bg-red-500/10 rounded-xl text-red-500"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Input Form Card */}
        <form onSubmit={handleSubmit} className="glass-card rounded-[2.5rem] p-8 space-y-8 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
          
          <div className="space-y-6 relative z-10">
            {/* Identity Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Identitas Barang</p>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nama Barang *</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input required placeholder="Contoh: Kampas Rem Vario"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-background/50 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Merk / Brand</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input placeholder="Astra, TDR, dll"
                      value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Jenis / Kategori</label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input placeholder="Oli, Sparepart..."
                      value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Etalase / Lokasi</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input placeholder="Rak A-1, Lemari Depan..."
                    value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full bg-background/50 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400 ml-1">Struktur Harga</p>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Harga Modal (Pokok)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">Rp</span>
                  <input type="number" required
                    value={form.purchasePrice || ''} onChange={e => setForm({...form, purchasePrice: parseFloat(e.target.value) || 0})}
                    className="w-full bg-background/50 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-black focus:ring-2 focus:ring-green-400/40 outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Harga Jual Normal</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-primary">Rp</span>
                    <input type="number" required
                      value={form.priceNormal || ''} onChange={e => setForm({...form, priceNormal: parseFloat(e.target.value) || 0})}
                      className="w-full bg-primary/5 border border-primary/20 rounded-2xl pl-12 pr-6 py-4 text-sm font-black text-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2 text-blue-400">Harga Grosir</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400">Rp</span>
                    <input type="number"
                      value={form.priceGrosir || ''} onChange={e => setForm({...form, priceGrosir: parseFloat(e.target.value) || 0})}
                      className="w-full bg-blue-500/5 border border-blue-500/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-black text-blue-400 focus:ring-2 focus:ring-blue-400/40 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2 text-orange-400">Harga Bengkel</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-400">Rp</span>
                    <input type="number"
                      value={form.priceMitra || ''} onChange={e => setForm({...form, priceMitra: parseFloat(e.target.value) || 0})}
                      className="w-full bg-orange-500/5 border border-orange-500/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-black text-orange-400 focus:ring-2 focus:ring-orange-400/40 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Barcode / QR Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 ml-1">Sistem Barcode</p>
              
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input required placeholder="Scan atau Generate..."
                    value={form.barcode} 
                    onChange={e => handleBarcodeResult(e.target.value)}
                    className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl pl-12 pr-6 py-4 text-sm font-mono font-bold text-purple-400 focus:ring-2 focus:ring-purple-400/40 outline-none transition-all" />
                </div>
                <button type="button" onClick={startScanner}
                  className="px-5 bg-purple-500 text-white rounded-2xl shadow-lg shadow-purple-500/20 active:scale-90 transition-all flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </button>
                <button type="button" onClick={generateBarcode}
                  className="px-5 bg-zinc-800 text-white rounded-2xl border border-white/10 active:scale-90 transition-all flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[8px] text-muted-foreground italic px-2 leading-relaxed">* Gunakan tombol refresh untuk generate QR Code otomatis jika barang belum ada barcode.</p>
            </div>

            {/* Initial Stock Section */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Stok Awal</label>
                  <input type="number"
                    value={form.stock || ''} onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})}
                    className="w-full bg-background/50 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Minimum Stok</label>
                  <input type="number"
                    value={form.minStock || ''} onChange={e => setForm({...form, minStock: parseInt(e.target.value) || 0})}
                    className="w-full bg-background/50 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 focus:ring-primary/40 outline-none transition-all" />
                </div>
            </div>

            <button type="submit" disabled={isSaving}
              className="w-full orange-gradient text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm mt-4">
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
              Daftarkan Barang Baru
            </button>
          </div>
        </form>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between p-6">
            <h3 className="text-white font-black uppercase tracking-widest">Scan Barcode Barang</h3>
            <button onClick={() => stopScanner()} className="p-3 bg-white/10 rounded-2xl text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div id="catalog-reader" className="w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden border-4 border-primary/50 shadow-2xl shadow-primary/20"></div>
          </div>
          <div className="p-10 text-center">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest animate-pulse">Arahkan kamera ke barcode</p>
          </div>
        </div>
      )}
    </div>
  );
};
