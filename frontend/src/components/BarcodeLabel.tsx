import React, { useState } from 'react';
import Barcode from 'react-barcode';
import { X, Printer, LayoutGrid, List } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode: string;
  priceNormal: number;
}

interface Props {
  product?: Product;
  products?: Product[];
  onClose: () => void;
}

const BarcodeLabel: React.FC<Props> = ({ product, products = [], onClose }) => {
  const [cols, setCols] = useState<2 | 3>(parseInt(localStorage.getItem('label_columns') || '2') as 2 | 3);
  const [qty, setQty] = useState(1);
  
  const displayProducts = product ? Array(qty).fill(product) : products;

  const handlePrint = async () => {
    const printContent = document.getElementById('barcode-print-area')?.innerHTML;
    if (!printContent) return;
    
    // Kirim ke Electron untuk print presisi
    if ((window as any).electron) {
      const labelPrinterName = localStorage.getItem('label_printer') || '';
      try {
        await (window as any).electron.printSilent({ 
          deviceName: labelPrinterName, // Gunakan printer label dari setting
          pageSize: cols === 3 ? { width: 105000, height: 15000 } : { width: 70000, height: 15000 }
      }, `
        <html>
          <style>
            body { margin: 0; padding: 0; background: white; }
            .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 1mm; width: 100%; }
            .label { 
              width: 33mm; height: 15mm; border: 0.1mm solid #eee; 
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              font-family: Arial, sans-serif; overflow: hidden; padding: 1mm;
            }
          </style>
          <body>
            <div class="grid">${printContent}</div>
          </body>
        </html>
      `);
      } catch (err) {
        console.error('Label print failed', err);
        alert('Gagal mencetak label. Pastikan printer menyala.');
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col border border-border/50">
        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-orange-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20"><Printer className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Cetak Label Barcode</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Format Presisi 33x15 mm</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Layout Kolom</p>
              <div className="flex bg-muted p-1 rounded-2xl border border-border/50">
                <button 
                  onClick={() => setCols(2)}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all ${cols === 2 ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
                >
                  <List className="w-4 h-4" /> 2 LINE
                </button>
                <button 
                  onClick={() => setCols(3)}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all ${cols === 3 ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> 3 LINE
                </button>
              </div>
            </div>
            
            {product && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Jumlah Label</p>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-muted border border-border/50 rounded-2xl px-5 py-3 font-black text-center focus:outline-none focus:border-primary transition-all"
                />
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preview (Skala Nyata)</p>
            <div className="bg-white p-6 rounded-[2rem] border border-border/50 flex justify-center overflow-x-auto min-h-[200px] items-center">
              <div 
                id="barcode-print-area"
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {displayProducts.map((p, idx) => (
                  <div key={idx} className="label border border-gray-100 flex flex-col items-center justify-center p-1 bg-white text-black" style={{ width: '33mm', height: '15mm' }}>
                    <div className="text-[7px] font-bold text-center leading-none mb-0.5 truncate w-full uppercase">{p.name}</div>
                    <Barcode 
                      value={p.barcode} 
                      width={1} 
                      height={18} 
                      fontSize={6}
                      margin={0}
                      background="transparent"
                    />
                    <div className="text-[8px] font-black mt-0.5">Rp {p.priceNormal.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-border/50 bg-muted/30">
          <button 
            onClick={handlePrint}
            className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
          >
            <Printer className="w-6 h-6" /> KONFIRMASI CETAK SEKARANG
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeLabel;
