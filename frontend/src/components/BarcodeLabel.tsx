import React, { useEffect, useRef, useState, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Tag, Minus, ChevronDown, Loader2 } from 'lucide-react';
import api from '../api';

interface Product {
  id: string;
  name: string;
  barcode: string;
  brand?: string;
  category: string;
  priceNormal: number;
  priceGrosir?: number;
  priceMitra?: number;
}

interface BarcodeLabelProps {
  product?: Product;
  products?: Product[];
  workshopName?: string;
  onClose: () => void;
}

type LabelSize = 'small' | 'medium' | 'large' | 'label3' | 'large78x100' | 'landscape100x70';

const SIZES: Record<string, { label: string; w: string; h: string; fontSize: number; barcodeW: number; barcodeH: number }> = {
  small:  { label: '40 × 20 mm',  w: '40mm',  h: '20mm',  fontSize: 5.5,  barcodeW: 1.2, barcodeH: 20 },
  medium: { label: '60 × 30 mm',  w: '60mm',  h: '30mm',  fontSize: 7,    barcodeW: 1.5, barcodeH: 28 },
  large:  { label: '80 × 40 mm',  w: '80mm',  h: '40mm',  fontSize: 8.5,  barcodeW: 1.8, barcodeH: 36 },
  label3: { label: '33 × 15 mm (3 Kolom)', w: '33mm', h: '15mm', fontSize: 5, barcodeW: 0.9, barcodeH: 14 },
  large78x100: { label: '78 × 100 mm (Portrait)', w: '78mm', h: '100mm', fontSize: 12, barcodeW: 2.8, barcodeH: 80 },
  landscape100x70: { label: '100 × 70 mm (Landscape)', w: '100mm', h: '70mm', fontSize: 14, barcodeW: 3, barcodeH: 100 },
  label40x30: { label: '40 × 30 mm (1 Kolom)', w: '40mm', h: '30mm', fontSize: 8, barcodeW: 1.5, barcodeH: 40 },
};

// Single label component - renders one barcode SVG
const SingleLabel: React.FC<{ product: Product; size: string; workshopName: string; showPrice: boolean }> = ({
  product, size, workshopName, showPrice
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const cfg = SIZES[size] || SIZES.medium;

  useEffect(() => {
    if (svgRef.current && product.barcode) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: 'CODE128',
          width: cfg.barcodeW,
          height: cfg.barcodeH,
          displayValue: true,
          fontSize: cfg.fontSize + 1,
          textMargin: 2,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (e) {
        console.error('Barcode error:', e);
      }
    }
  }, [product.barcode, size, cfg]);

  return (
    <div
      className="label-item"
      style={{
        width: cfg.w,
        height: cfg.h,
        border: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2mm 2mm',
        background: '#fff',
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        gap: '1px',
        overflow: 'hidden',
      }}
    >
      <p style={{ fontSize: `${cfg.fontSize - 1}px`, fontFamily: 'Arial, sans-serif', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
        {workshopName}
      </p>
      <p style={{ fontSize: `${cfg.fontSize + 0.5}px`, fontFamily: 'Arial, sans-serif', color: '#111', fontWeight: '600', margin: 0, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {product.name.length > 22 ? product.name.substring(0, 22) + '…' : product.name}
      </p>
      <svg ref={svgRef} style={{ maxWidth: '100%', display: 'block' }} />
      {showPrice && (
        <p style={{ fontSize: `${cfg.fontSize + 1}px`, fontFamily: 'Arial, sans-serif', color: '#000', fontWeight: '700', margin: 0, letterSpacing: '0.03em' }}>
          Rp {product.priceNormal.toLocaleString('id-ID')}
        </p>
      )}
    </div>
  );
};

const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ product, products = [], workshopName = 'JAKARTA MOTOR', onClose }) => {
  const isBatch = products.length > 0;
  const initialProducts = isBatch ? products : (product ? [product] : []);
  
  const [productQtys, setProductQtys] = useState<Record<string, number>>(
    Object.fromEntries(initialProducts.map(p => [p.id, 1]))
  );
  
  const [size, setSize] = useState<string>('medium');
  const [showPrice, setShowPrice] = useState(false);
  const [labelsPerRow, setLabelsPerRow] = useState(3);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/app-settings/label_columns');
        if (res.data && res.data.items) {
          const cols = Number(Array.isArray(res.data.items) ? res.data.items[0] : res.data.items);
          if (cols > 0) setLabelsPerRow(cols);
        }
      } catch (error) {
        console.error('Failed to fetch label settings', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleQtyChange = (id: string, delta: number) => {
    setProductQtys(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const totalLabels = Object.values(productQtys).reduce((sum, q) => sum + q, 0);

  const handleSilentPrint = async () => {
    if (totalLabels === 0) return alert('Pilih minimal 1 label untuk dicetak.');
    setIsPrinting(true);
    
    // 1. Coba cara Electron (Silent Print) - PALING STABIL
    if ((window as any).electron) {
      try {
        const printerName = localStorage.getItem('label_printer');
        if (!printerName) {
          alert('Printer Label belum diatur di menu Pengaturan.');
          setIsPrinting(false);
          return;
        }

        const cfg = SIZES[size] || SIZES.medium;
        const widthMicrons = parseInt(cfg.w) * 1000;
        const heightMicrons = parseInt(cfg.h) * 1000;

        const html = printAreaRef.current?.innerHTML || '';
        const success = await (window as any).electron.invoke('print-silent', {
          silent: true,
          deviceName: printerName,
          pageSize: { width: widthMicrons, height: heightMicrons },
          margins: { marginType: 'none' }
        }, `<html><head><style>@page { margin: 0; } body { margin: 0; padding: 0; }</style></head><body>${html}</body></html>`);

        if (success) {
          setIsPrinting(false);
          return;
        }
      } catch (err) {
        console.error('Electron label print failed', err);
      }
    }

    // 2. Fallback ke Backend (Hanya jika diatur di VPS)
    try {
      const printItems = initialProducts
        .filter(p => productQtys[p.id] > 0)
        .map(p => ({
          product: p,
          qty: productQtys[p.id]
        }));

      await api.post('/print/labels', {
        items: printItems,
        showPrice,
        sizeType: size === 'large78x100' ? 'large70x100' : size === 'label3' ? 'label33x15' : size
      });
    } catch (error: any) {
      console.error('Silent print fallback error:', error);
      alert('Gagal cetak silent. Silakan gunakan metode browser (tombol bawah).');
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrint = useCallback(() => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return;

    const columnWidth = SIZES[size].w;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Label Batch</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(${labelsPerRow}, ${columnWidth});
            gap: 0;
            padding: 0;
            justify-content: start;
          }
          .label-item {
            page-break-inside: avoid;
            border: 0.1mm solid #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          @media print {
            body { margin: 0; }
            @page { 
              margin: 0; 
              size: auto; 
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-grid">
          ${printContent}
        </div>
        <script>
          window.onload = () => { 
            setTimeout(() => {
              window.print(); 
              window.onafterprint = () => window.close(); 
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }, [printAreaRef, size, labelsPerRow]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-primary/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight leading-none">
                {isBatch ? `Cetak Label Massal (${initialProducts.length} Barang)` : 'Generate Label Barcode'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {isBatch ? 'Sesuaikan jumlah label untuk setiap item di daftar.' : initialProducts[0]?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* LEFT: Controls & List */}
          <div className="md:w-96 p-6 border-r border-border/50 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
            
            {/* Ukuran Label */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ukuran Label</label>
              <div className="grid grid-cols-1 gap-2">
                {['small', 'medium', 'large', 'label3', 'label40x30', 'large78x100', 'landscape100x70'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all text-xs font-bold ${
                      size === s
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <span className="capitalize">{s === 'large78x100' ? 'Resi Portrait' : s === 'landscape100x70' ? 'Resi Landscape' : s === 'label3' ? 'Label Harga 3 Kol' : s === 'label40x30' ? 'Label 40x30 (1 Kol)' : s}</span>
                    <span className="text-[10px] font-mono opacity-70">{SIZES[s].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product List with Qty */}
            <div className="flex-1 space-y-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Daftar Barang & Jumlah</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {initialProducts.map(p => (
                  <div key={p.id} className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate">{p.name}</p>
                      <p className="text-[9px] font-mono text-muted-foreground">{p.barcode}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleQtyChange(p.id, -1)}
                        className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-xs hover:bg-red-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input 
                        type="number" 
                        value={productQtys[p.id] || 0}
                        onChange={(e) => setProductQtys(prev => ({ ...prev, [p.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-10 bg-transparent text-center font-black text-xs focus:outline-none"
                      />
                      <button 
                        onClick={() => handleQtyChange(p.id, 1)}
                        className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-xs hover:bg-green-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Total Label:</span>
                <span className="text-sm font-black text-primary">{totalLabels} Lembar</span>
              </div>
            </div>

            {/* Tampilkan Harga */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
              <div>
                <p className="font-black text-sm">Harga</p>
                <p className="text-[9px] text-muted-foreground">Tampilkan di label</p>
              </div>
              <button
                onClick={() => setShowPrice(p => !p)}
                className={`w-10 h-5 rounded-full transition-all relative ${showPrice ? 'bg-primary' : 'bg-muted border border-border'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow ${showPrice ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* RIGHT: Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
            <div className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0 flex items-center justify-between">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Preview Cetak
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground">Preview Kolom:</span>
                <select
                  value={labelsPerRow}
                  onChange={e => setLabelsPerRow(Number(e.target.value))}
                  className="bg-card border border-border rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-8 flex justify-center">
              {/* Hidden print source */}
              <div
                ref={printAreaRef}
                style={{ position: 'absolute', left: '-9999px', top: 0, width: '1000px' }}
              >
                {initialProducts.map(p => 
                  Array.from({ length: productQtys[p.id] || 0 }).map((_, i) => (
                    <SingleLabelPrint
                      key={`${p.id}-${i}`}
                      product={p}
                      size={size}
                      workshopName={workshopName}
                      showPrice={showPrice}
                    />
                  ))
                )}
              </div>

              {/* Visual preview grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${labelsPerRow}, max-content)`,
                  gap: '12px',
                  justifyContent: 'center',
                  alignContent: 'start'
                }}
              >
                {/* Only show first 20 in preview for performance */}
                {initialProducts.flatMap(p => 
                  Array.from({ length: productQtys[p.id] || 0 }).map((_, i) => ({ p, i }))
                ).slice(0, 24).map(({ p, i }) => (
                  <SingleLabel
                    key={`prev-${p.id}-${i}`}
                    product={p}
                    size={size}
                    workshopName={workshopName}
                    showPrice={showPrice}
                  />
                ))}
                {totalLabels > 24 && (
                  <div className="col-span-full py-6 text-center">
                    <p className="text-xs text-muted-foreground italic font-medium">+ {totalLabels - 24} label lainnya tidak ditampilkan di preview...</p>
                  </div>
                )}
                {totalLabels === 0 && (
                  <div className="col-span-full py-20 text-center opacity-30">
                    <Barcode className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest">Belum ada label terpilih</p>
                  </div>
                )}
              </div>
            </div>

            {/* Print Buttons */}
            <div className="p-5 border-t border-border/50 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleSilentPrint}
                disabled={isPrinting || totalLabels === 0}
                className="md:col-span-2 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                CETAK LANGSUNG (SILENT)
              </button>
              
              <button
                onClick={handlePrint}
                disabled={totalLabels === 0}
                className="py-4 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                Dialog Browser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Separate component for print-only rendering
const SingleLabelPrint: React.FC<{ product: Product; size: string; workshopName: string; showPrice: boolean }> = ({
  product, size, workshopName, showPrice
}) => {
  const cfg = SIZES[size] || SIZES.medium;
  const [imgData, setImgData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && product.barcode) {
      try {
        JsBarcode(canvasRef.current, product.barcode, {
          format: 'CODE128',
          width: cfg.barcodeW,
          height: cfg.barcodeH,
          displayValue: true,
          fontSize: cfg.fontSize + 2,
          textMargin: 2,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
        setImgData(canvasRef.current.toDataURL('image/png'));
      } catch (e) {
        console.error('Print barcode error:', e);
      }
    }
  }, [product.barcode, size, cfg]);

  return (
    <div
      className="label-item"
      style={{
        width: cfg.w,
        height: cfg.h,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1mm',
        background: '#fff',
        boxSizing: 'border-box',
        overflow: 'hidden',
        gap: '1px',
        border: '0.1mm solid #eee'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <p style={{ fontSize: `${cfg.fontSize - 1}px`, fontFamily: 'Arial, sans-serif', color: '#000', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>
        {workshopName}
      </p>
      <p style={{ fontSize: `${cfg.fontSize + 1}px`, fontFamily: 'Arial, sans-serif', color: '#000', fontWeight: '800', margin: 0, textAlign: 'center', lineHeight: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {product.name.length > 22 ? product.name.substring(0, 22) + '…' : product.name}
      </p>
      {imgData ? (
        <img src={imgData} style={{ maxWidth: '95%', height: 'auto', display: 'block' }} alt="barcode" />
      ) : (
        <div style={{ height: `${cfg.barcodeH}px` }} />
      )}
      {showPrice && (
        <p style={{ fontSize: `${cfg.fontSize + 1.5}px`, fontFamily: 'Arial, sans-serif', color: '#000', fontWeight: '900', margin: 0 }}>
          Rp {product.priceNormal.toLocaleString('id-ID')}
        </p>
      )}
    </div>
  );
};

export default BarcodeLabel;
