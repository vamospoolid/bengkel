import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, Package, RefreshCw, X, CheckCircle2, 
  AlertCircle, History, ArrowLeft, Search
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  minStock: number;
  location?: string;
}

const MobileScanner: React.FC = () => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      startScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [isScanning]);

  const startScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        formatsToSupport: [ 
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;
  };

  const onScanSuccess = async (decodedText: string) => {
    if (decodedText === scannedResult) return;
    
    setScannedResult(decodedText);
    setIsScanning(false);
    
    // Play beep sound (optional)
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    } catch (e) {}

    fetchProduct(decodedText);
  };

  const onScanFailure = (error: any) => {
    // This is called for every frame where a barcode is not found.
    // console.warn(`Code scan error = ${error}`);
  };

  const fetchProduct = async (barcode: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/products?barcode=${barcode}`);
      // Since the backend might return an array
      const found = Array.isArray(res.data) ? res.data.find((p: any) => p.barcode === barcode) : null;
      
      if (found) {
        setProduct(found);
        toast.success("Produk ditemukan!");
      } else {
        setProduct(null);
        toast.error("Barang tidak terdaftar!");
      }
    } catch (error) {
      toast.error("Gagal menarik data barang");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setScannedResult(null);
    setProduct(null);
    setIsScanning(true);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 text-white p-4 flex items-center justify-between shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">Mobile Scanner</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Cek Stok & Info Barang</p>
          </div>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="p-3 hover:bg-zinc-800 rounded-full transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {isScanning ? (
          <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm bg-zinc-100 rounded-[2.5rem] overflow-hidden border-4 border-zinc-200 shadow-2xl relative">
              <div id="reader" className="w-full"></div>
              {/* Overlay styling for the scanner inside the reader ID is handled by html5-qrcode */}
            </div>
            
            <div className="text-center space-y-2 px-6">
               <div className="flex items-center justify-center gap-2 text-primary font-black uppercase text-xs tracking-widest">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Scanner Aktif
               </div>
               <p className="text-sm text-muted-foreground font-medium italic">Arahkan kamera ke barcode barang</p>
            </div>

            <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/20 max-w-sm flex items-start gap-3">
               <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
               <p className="text-[11px] text-blue-700 font-medium">Pastikan pencahayaan cukup dan barcode terlihat jelas di dalam kotak scanner.</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
            {/* Scanned Code Display */}
            <div className="bg-zinc-900 rounded-[2rem] p-6 text-white flex items-center justify-between shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Barcode Terdeteksi</p>
                  <h3 className="text-2xl font-mono font-black italic text-primary">{scannedResult}</h3>
               </div>
               <RefreshCw className="w-8 h-8 text-white/10" />
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mencari di Database...</p>
              </div>
            ) : product ? (
              <div className="glass-card rounded-[2.5rem] border border-border/50 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-border/50 bg-primary/5">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md border border-border">
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">{product.name}</h2>
                        <span className="text-[10px] font-black bg-muted px-2 py-1 rounded border border-border/50 uppercase">{product.location || 'Lokasi Gudang'}</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Stok Saat Ini</p>
                        <div className="flex items-end gap-2">
                           <span className={`text-4xl font-black italic ${product.stock <= product.minStock ? 'text-red-500' : 'text-zinc-900'}`}>{product.stock}</span>
                           <span className="text-[10px] font-black text-muted-foreground uppercase mb-1.5">PCS</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status Stok</p>
                        {product.stock <= product.minStock ? (
                          <div className="flex flex-col gap-1 text-red-500">
                             <div className="flex items-center gap-1 font-black text-xs uppercase italic">
                                <AlertCircle className="w-3.5 h-3.5" /> Kritis
                             </div>
                             <p className="text-[9px] font-medium leading-tight">Segera belanja sebelum kehabisan.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-green-500">
                             <div className="flex items-center gap-1 font-black text-xs uppercase italic">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aman
                             </div>
                             <p className="text-[9px] font-medium leading-tight">Stok mencukupi untuk operasional.</p>
                          </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                   <button 
                    onClick={() => window.location.href = `/inventory?id=${product.id}`}
                    className="py-4 bg-muted border border-border rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                   >
                     <History className="w-4 h-4" /> Kartu Stok
                   </button>
                   <button 
                    onClick={handleReset}
                    className="py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                   >
                     <RefreshCw className="w-4 h-4" /> Scan Lagi
                   </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/5 rounded-[2.5rem] border-2 border-dashed border-red-500/20 p-12 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-2">Barang Tidak Ditemukan</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Barcode <span className="font-mono font-bold text-red-500">{scannedResult}</span> belum terdaftar di sistem Jakarta Motor.</p>
                </div>
                <button 
                  onClick={handleReset}
                  className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/30 flex items-center gap-3"
                >
                  <ArrowLeft className="w-4 h-4" /> COBA SCAN LAGI
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Search Fallback */}
      <div className="p-4 bg-zinc-100 border-t border-zinc-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari nama barang jika barcode rusak..." 
            className="w-full bg-white border border-zinc-300 rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => window.location.href = '/inventory'}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
);

export default MobileScanner;
