import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface ReceiptProps {
  workshop: {
    name: string;
    address: string;
    phone: string;
    taxRate?: number;
    footerMessage?: string;
    logo?: string;
    qrisImage?: string;
    bankAccount?: string;
  };
  transaction: {
    invoiceNo: string;
    createdAt: string;
    paymentType: string;
    totalAmount: number;
    discount: number;
    tax: number;
    items: any[];
    customer?: any;
    vehicle?: any;
    cashReceived?: number;
    reprintCount?: number;
  };
}

const Receipt: React.FC<ReceiptProps> = ({ workshop, transaction }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && transaction.invoiceNo) {
      try {
        JsBarcode(barcodeRef.current, transaction.invoiceNo, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: false,
          margin: 0,
          background: "transparent"
        });
      } catch (e) {
        console.error("Barcode generation failed", e);
      }
    }
  }, [transaction.invoiceNo]);

  const subtotal = transaction.totalAmount - transaction.tax + transaction.discount;
  const change = transaction.cashReceived ? Math.max(0, transaction.cashReceived - transaction.totalAmount) : 0;

  return (
    <div 
      id="receipt-print" 
      className="bg-white text-black p-2 font-mono text-[10px] w-[75mm] mx-auto print:m-0 print:w-[75mm]"
      style={{ lineSizing: 'tight' }}
    >
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-sm font-black uppercase tracking-tight leading-none mb-1">{workshop.name || 'JAKARTA MOTOR'}</h2>
        <p className="text-[9px] leading-tight">{workshop.address}</p>
        <p className="text-[9px]">Telp: {workshop.phone}</p>
      </div>

      {transaction.reprintCount && transaction.reprintCount > 1 && (
        <div className="border border-black p-1 text-center mb-2">
           <h3 className="text-[11px] font-black uppercase">*** SALINAN {transaction.reprintCount} ***</h3>
        </div>
      )}

      <div className="border-t border-black border-dashed my-2"></div>

      {/* Transaction Info */}
      <div className="space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span>NO: {transaction.invoiceNo}</span>
          <span>{new Date(transaction.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <div className="flex justify-between">
          <span>KSR: ADMIN</span>
          <span className="uppercase font-bold">{transaction.paymentType}</span>
        </div>
        
        {transaction.vehicle && (
          <div className="border-t border-black border-dotted mt-1 pt-1">
            <div className="flex justify-between">
              <span className="font-bold">UNIT:</span>
              <span className="uppercase font-bold">{transaction.vehicle.plateNumber} {transaction.vehicle.model ? `(${transaction.vehicle.model})` : ''}</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>PLG:</span>
          <span className="uppercase font-bold truncate">{transaction.customer?.name || 'UMUM'}</span>
        </div>
      </div>

      <div className="border-t border-black my-2"></div>

      {/* Items Table */}
      {/* Items Table */}
      <div className="space-y-1 mb-2">
        {transaction.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="uppercase font-bold leading-tight">{item.name}</div>
            <div className="flex justify-between">
              <span>{item.quantity} x {(item.price || 0).toLocaleString()}</span>
              <span className="font-bold">{((item.price || 0) * item.quantity).toLocaleString()}</span>
            </div>
            {item.isMechanicFault && <div className="text-[8px] font-bold italic">[KESALAHAN MEKANIK - RP 0]</div>}
          </div>
        ))}
      </div>

      <div className="border-t border-black border-dashed my-2"></div>

      {/* Totals Section */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>SUBTOTAL</span>
          <span>{(subtotal || 0).toLocaleString()}</span>
        </div>
        
        {transaction.tax > 0 && (
          <div className="flex justify-between">
            <span>PAJAK</span>
            <span>{(transaction.tax || 0).toLocaleString()}</span>
          </div>
        )}

        {transaction.discount > 0 && (
          <div className="flex justify-between">
            <span>DISKON</span>
            <span>-{(transaction.discount || 0).toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-black py-1">
          <span>TOTAL</span>
          <span>Rp {(transaction.totalAmount || 0).toLocaleString()}</span>
        </div>

        {transaction.paymentType === 'TUNAI' && transaction.cashReceived !== undefined && (
          <div className="space-y-0.5 pt-1 border-t border-black border-dotted">
            <div className="flex justify-between">
              <span>BAYAR</span>
              <span>{(transaction.cashReceived || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>KEMBALI</span>
              <span>{(change || 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-black border-dashed my-4"></div>

      {/* Footer & Barcode */}
      <div className="text-center space-y-2">
        <p className="text-[9px] leading-tight italic uppercase font-bold">{workshop.footerMessage || 'Terima kasih atas kunjungan Anda'}</p>

        <div className="pt-1 flex flex-col items-center justify-center">
          <svg ref={barcodeRef} className="max-w-[150px] h-auto"></svg>
          <p className="text-[8px] font-bold mt-0.5 tracking-widest">{transaction.invoiceNo}</p>
        </div>

        <div className="pt-1">
          <p className="text-[7px] opacity-70 italic">Nota Valid - {workshop.name || 'JAKARTA MOTOR'}</p>
        </div>
      </div>
    </div>
  );
};

export default Receipt;

