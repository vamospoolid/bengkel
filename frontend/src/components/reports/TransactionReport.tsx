import React from 'react';
import ReportLayout from './ReportLayout';

interface TransactionItem {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  paymentType: string;
  totalAmount: number;
  status: string;
}

interface TransactionReportProps {
  data: TransactionItem[];
  period: string;
  workshop: any;
}

const TransactionReport: React.FC<TransactionReportProps> = ({ data, period, workshop }) => {
  const totalOmzet = data.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalTunai = data.filter(d => d.paymentType?.toLowerCase().includes('tunai') || d.paymentType?.toLowerCase().includes('cash')).reduce((acc, d) => acc + d.totalAmount, 0);
  const totalTransfer = totalOmzet - totalTunai;

  const th: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '8px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#555',
    fontFamily: 'Arial, sans-serif',
    borderBottom: '1.5px solid #222',
    borderTop: '1.5px solid #222',
    whiteSpace: 'nowrap',
    background: '#fafafa',
  };

  const td: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: '9.5px',
    color: '#444',
    fontFamily: 'Arial, sans-serif',
    borderBottom: '1px solid #eee',
    verticalAlign: 'middle',
  };

  return (
    <ReportLayout
      title="Laporan Riwayat Transaksi"
      subtitle="Detailed Transaction History"
      period={period}
      workshop={workshop}
    >
      {/* Intro */}
      <p style={{ fontSize: '9px', color: '#aaa', fontFamily: 'Arial, sans-serif', fontStyle: 'italic', marginBottom: '16px', lineHeight: '1.6' }}>
        Laporan ini mencatat seluruh transaksi penjualan yang telah diselesaikan dalam periode yang dipilih,
        disusun secara kronologis untuk keperluan audit dan rekonsiliasi keuangan.
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Transaksi', value: `${data.length} transaksi`, color: '#333' },
          { label: 'Total Omzet', value: `Rp ${totalOmzet.toLocaleString('id-ID')}`, color: '#1a5276' },
          { label: 'Rata-rata / Transaksi', value: data.length > 0 ? `Rp ${Math.round(totalOmzet / data.length).toLocaleString('id-ID')}` : 'Rp 0', color: '#1e8449' },
        ].map(card => (
          <div key={card.label} style={{ border: '1px solid #e0e0e0', padding: '10px 14px', background: '#fafafa' }}>
            <p style={{ fontSize: '7px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Arial, sans-serif', marginBottom: '4px' }}>{card.label}</p>
            <p style={{ fontSize: '11px', fontWeight: '600', color: card.color, fontFamily: 'Arial, sans-serif' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'center', width: '28px' }}>No.</th>
            <th style={{ ...th }}>No. Invoice</th>
            <th style={{ ...th }}>Tanggal</th>
            <th style={{ ...th }}>Keterangan</th>
            <th style={{ ...th, textAlign: 'center' }}>Pembayaran</th>
            <th style={{ ...th, textAlign: 'center' }}>Status</th>
            <th style={{ ...th, textAlign: 'right' }}>Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#ccc', fontStyle: 'italic', padding: '32px' }}>
                Tidak ada transaksi pada periode ini.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...td, textAlign: 'center', color: '#bbb', fontSize: '8px' }}>{idx + 1}</td>
                <td style={{ ...td, fontFamily: 'Courier New, monospace', fontSize: '8.5px', color: '#333', whiteSpace: 'nowrap' }}>
                  {item.invoiceNo || '—'}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap', color: '#666', fontSize: '9px' }}>
                  {new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ ...td, color: '#444', maxWidth: '180px' }}>
                  {item.customerName || 'Pelanggan Umum'}
                </td>
                <td style={{ ...td, textAlign: 'center', fontSize: '8px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.paymentType || '—'}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 7px',
                    fontSize: '7.5px',
                    fontFamily: 'Arial, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: '600',
                    color: item.status === 'COMPLETED' ? '#1e8449' : '#922b21',
                    border: `1px solid ${item.status === 'COMPLETED' ? '#a9dfbf' : '#f1948a'}`,
                    background: item.status === 'COMPLETED' ? '#eafaf1' : '#fdedec',
                  }}>
                    {item.status === 'COMPLETED' ? 'Lunas' : item.status}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'Courier New, monospace', fontSize: '9.5px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>
                  {item.totalAmount.toLocaleString('id-ID')}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} style={{
              ...td,
              textAlign: 'right',
              fontFamily: 'Arial, sans-serif',
              fontSize: '9px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#333',
              borderTop: '1.5px solid #222',
              borderBottom: '1.5px solid #222',
              paddingTop: '10px',
              paddingBottom: '10px',
            }}>
              Total Akumulasi Omzet
            </td>
            <td style={{
              ...td,
              textAlign: 'right',
              fontFamily: 'Courier New, monospace',
              fontSize: '12px',
              fontWeight: '700',
              color: '#1a5276',
              borderTop: '1.5px solid #222',
              borderBottom: '1.5px solid #222',
              paddingTop: '10px',
              paddingBottom: '10px',
              whiteSpace: 'nowrap',
            }}>
              {totalOmzet.toLocaleString('id-ID')}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      <div style={{ marginTop: '20px', padding: '10px 14px', border: '1px solid #eee', background: '#fafafa' }}>
        <p style={{ fontSize: '8px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Arial, sans-serif', marginBottom: '6px' }}>Catatan</p>
        <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: '9px', color: '#888', fontFamily: 'Arial, sans-serif', lineHeight: '1.8' }}>
          <li>Seluruh jumlah transaksi dinyatakan dalam Rupiah (IDR).</li>
          <li>Laporan ini mencakup {data.length} transaksi dengan total nilai Rp {totalOmzet.toLocaleString('id-ID')}.</li>
          <li>Data bersumber dari sistem POS dan telah divalidasi secara otomatis.</li>
        </ul>
      </div>
    </ReportLayout>
  );
};

export default TransactionReport;
