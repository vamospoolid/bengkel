import React, { useState, useEffect } from 'react';
import { QrCode, X, Plus, Minus, Loader2, CheckCircle2, Camera, Save, Trash2, History } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

interface ScannedItem {
  id: string;
  name: string;
  barcode: string;
  currentStock: number;
  newStock: number;
}

export const OpnamePage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (e) { console.error(e); }
  };

  const startScanner = async () => {
    try {
      // Trigger permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());

      setShowScanner(true);
      
      setTimeout(async () => {
        const html5QrCode = new Html5Qrcode("opname-reader");
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
              handleScanResult(decodedText);
              if ('vibrate' in navigator) navigator.vibrate(50);
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

  const stopScanner = async () => {
    if (scanner && scanner.isScanning) {
      await scanner.stop();
    }
    setShowScanner(false);
  };

  const handleScanResult = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (!product) return;

    setScannedItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, newStock: item.newStock + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        currentStock: product.stock,
        newStock: 1
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, newStock: Math.max(0, item.newStock + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id));
  };

  const syncOpname = async () => {
    if (scannedItems.length === 0) return;
    if (!confirm(`Sync ${scannedItems.length} barang? Stok di sistem akan diperbarui.`)) return;

    setIsSyncing(true);
    try {
      // Loop and update each item
      for (const item of scannedItems) {
        await api.patch(`/products/${item.id}`, { stock: item.newStock });
        // Log the change
        await api.post('/stock-logs', {
          productId: item.id,
          type: 'ADJUSTMENT',
          changeQty: item.newStock - item.currentStock,
          description: 'Stok Opname Mobile'
        });
      }
      setShowSuccess(true);
      setScannedItems([]);
      fetchProducts();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert('Gagal sinkronisasi data opname.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="pb-32 mesh-bg min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-gradient leading-none">Stok Opname</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Audit Fisik & Sync Data</p>
            </div>
          </div>
          <button onClick={syncOpname} disabled={scannedItems.length === 0 || isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 orange-gradient text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50">
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sync
          </button>
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
              <p className="font-black text-sm text-green-400 uppercase tracking-tight">Sync Berhasil!</p>
              <p className="text-[10px] text-green-500/70 font-bold uppercase tracking-widest">Stok pusat telah diperbarui</p>
            </div>
          </div>
        )}

        {/* Main List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Barang Discan ({scannedItems.length})</p>
            {scannedItems.length > 0 && (
              <button onClick={() => setScannedItems([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest">Reset</button>
            )}
          </div>

          {scannedItems.length === 0 ? (
            <div className="glass-card rounded-[2.5rem] p-12 text-center border-dashed border-white/10">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest leading-relaxed">
                Belum ada barang.<br/>Klik tombol kamera untuk mulai scan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scannedItems.map(item => (
                <div key={item.id} className="glass-card rounded-[2rem] p-5 border-white/5 flex items-center justify-between group animate-in slide-in-from-bottom duration-300">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-black truncate">{item.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Sistem: <span className="text-white">{item.currentStock}</span></p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Baru: <span className="text-primary">{item.newStock}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-background/50 rounded-2xl p-1.5 border border-white/5">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-black text-sm">{item.newStock}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 active:scale-90 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button onClick={() => removeItem(item.id)} className="ml-3 p-2 text-muted-foreground hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-32 right-6 flex flex-col gap-4">
        <button onClick={startScanner}
          className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-90 transition-all group">
          <Camera className="w-8 h-8 group-hover:rotate-12 transition-all" />
        </button>
      </div>

      {/* Scanner View Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between p-6">
            <h3 className="text-white font-black uppercase tracking-widest">Continuous Opname</h3>
            <button onClick={stopScanner} className="p-3 bg-white/10 rounded-2xl text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div id="opname-reader" className="w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden border-4 border-primary/50 shadow-2xl shadow-primary/20"></div>
          </div>
          <div className="p-10 text-center space-y-2">
            <p className="text-white font-black text-sm animate-pulse">Scanning...</p>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Scan barang berkali-kali untuk menambah jumlah</p>
          </div>
        </div>
      )}
    </div>
  );
};
