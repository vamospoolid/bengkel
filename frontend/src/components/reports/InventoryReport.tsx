import React from 'react';
import ReportLayout from './ReportLayout';

interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  purchasePrice: number;
  priceNormal: number;
}

interface InventoryReportProps {
  data: InventoryItem[];
  workshop: any;
}

const InventoryReport: React.FC<InventoryReportProps> = ({ data, workshop }) => {
  const totalAssetValue = data.reduce((acc, curr) => acc + (curr.purchasePrice * curr.stock), 0);
  const totalPotentialRevenue = data.reduce((acc, curr) => acc + (curr.priceNormal * curr.stock), 0);
  const potentialProfit = totalPotentialRevenue - totalAssetValue;
  const lowStockItems = data.filter(d => d.stock <= 5);

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
    padding: '6px 10px',
    fontSize: '9px',
    color: '#444',
    fontFamily: 'Arial, sans-serif',
    borderBottom: '1px solid #eee',
    verticalAlign: 'middle',
  };

  return (
    <ReportLayout
      title="Laporan Inventaris Barang"
      subtitle="Stock Inventory & Asset Valuation"
      workshop={workshop}
    >
      {/* Intro */}
      <p style={{ fontSize: '9px', color: '#aaa', fontFamily: 'Arial, sans-serif', fontStyle: 'italic', marginBottom: '16px', lineHeight: '1.6' }}>
        Laporan ini menyajikan posisi persediaan barang dagangan per tanggal cetak, beserta valuasi aset
        berdasarkan harga perolehan dan potensi pendapatan dari penjualan seluruh stok yang tersedia.
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Total Item', value: `${data.length} SKU`, color: '#333' },
          { label: 'Nilai Aset (HPP)', value: `Rp ${totalAssetValue.toLocaleString('id-ID')}`, color: '#1a5276' },
          { label: 'Potensi Omzet', value: `Rp ${totalPotentialRevenue.toLocaleString('id-ID')}`, color: '#1e8449' },
          { label: 'Stok Kritis (≤5)', value: `${lowStockItems.length} item`, color: lowStockItems.length > 0 ? '#922b21' : '#1e8449' },
        ].map(card => (
          <div key={card.label} style={{ border: '1px solid #e0e0e0', padding: '10px 12px', background: '#fafafa' }}>
            <p style={{ fontSize: '7px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Arial, sans-serif', marginBottom: '4px' }}>{card.label}</p>
            <p style={{ fontSize: '10px', fontWeight: '600', color: card.color, fontFamily: 'Arial, sans-serif' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'center', width: '24px' }}>No.</th>
            <th style={{ ...th }}>Nama Barang</th>
            <th style={{ ...th }}>Merk</th>
            <th style={{ ...th }}>Kategori</th>
            <th style={{ ...th, textAlign: 'center' }}>Stok</th>
            <th style={{ ...th, textAlign: 'right' }}>Harga Beli</th>
            <th style={{ ...th, textAlign: 'right' }}>Harga Jual</th>
            <th style={{ ...th, textAlign: 'right' }}>Subtotal Aset</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ ...td, textAlign: 'center', color: '#ccc', fontStyle: 'italic', padding: '32px' }}>
                Tidak ada data inventaris.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => {
              const isLowStock = item.stock <= 5;
              return (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, textAlign: 'center', color: '#bbb', fontSize: '8px' }}>{idx + 1}</td>
                  <td style={{ ...td, fontWeight: '500', color: '#333', maxWidth: '160px' }}>
                    {item.name}
                  </td>
                  <td style={{ ...td, color: '#888', fontSize: '8.5px' }}>{item.brand || '—'}</td>
                  <td style={{ ...td, fontSize: '8.5px' }}>
                    <span style={{ padding: '1px 6px', border: '1px solid #ddd', fontSize: '7.5px', color: '#666', fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{
                    ...td,
                    textAlign: 'center',
                    fontWeight: '600',
                    color: isLowStock ? '#922b21' : '#1e8449',
                    background: isLowStock ? '#fdedec' : 'transparent',
                  }}>
                    {item.stock}
                    {isLowStock && <span style={{ fontSize: '7px', display: 'block', color: '#e74c3c', fontWeight: '400' }}>kritis</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'Courier New, monospace', color: '#666', fontSize: '8.5px' }}>
                    {item.purchasePrice.toLocaleString('id-ID')}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'Courier New, monospace', color: '#1a5276', fontSize: '8.5px', fontWeight: '500' }}>
                    {item.priceNormal.toLocaleString('id-ID')}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'Courier New, monospace', color: '#333', fontSize: '9px', fontWeight: '600' }}>
                    {(item.purchasePrice * item.stock).toLocaleString('id-ID')}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7} style={{
              ...td,
              textAlign: 'right',
              fontSize: '9px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#333',
              borderTop: '1.5px solid #222',
              borderBottom: '1.5px solid #222',
              paddingTop: '10px', paddingBottom: '10px',
            }}>
              Total Nilai Aset Persediaan (HPP)
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
              paddingTop: '10px', paddingBottom: '10px',
              whiteSpace: 'nowrap',
            }}>
              {totalAssetValue.toLocaleString('id-ID')}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Valuation Summary */}
      <div style={{ marginTop: '20px', border: '1px solid #e0e0e0', padding: '14px 18px', background: '#fafafa' }}>
        <p style={{ fontSize: '8px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Arial, sans-serif', marginBottom: '10px' }}>Valuasi Potensi Usaha</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Nilai Aset (HPP)', value: `Rp ${totalAssetValue.toLocaleString('id-ID')}`, color: '#1a5276' },
            { label: 'Potensi Omzet Penuh', value: `Rp ${totalPotentialRevenue.toLocaleString('id-ID')}`, color: '#1e8449' },
            { label: 'Potensi Laba Kotor', value: `Rp ${potentialProfit.toLocaleString('id-ID')}`, color: potentialProfit >= 0 ? '#1e8449' : '#922b21' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: '8px', border: '1px solid #eee', background: '#fff' }}>
              <p style={{ fontSize: '7px', color: '#ccc', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</p>
              <p style={{ fontSize: '10px', fontWeight: '600', color: item.color, fontFamily: 'Arial, sans-serif', marginTop: '4px' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginTop: '14px', padding: '10px 14px', border: '1px solid #eee' }}>
        <p style={{ fontSize: '8px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Arial, sans-serif', marginBottom: '5px' }}>Catatan</p>
        <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: '9px', color: '#888', fontFamily: 'Arial, sans-serif', lineHeight: '1.8' }}>
          <li>Valuasi aset dihitung berdasarkan harga beli (HPP) dikalikan jumlah stok tersedia.</li>
          <li>Item dengan stok ≤ 5 unit ditandai sebagai stok kritis dan memerlukan restok segera.</li>
          <li>Potensi omzet dihitung berdasarkan harga jual normal seluruh stok yang tersedia.</li>
        </ul>
      </div>

    </ReportLayout>
  );
};

export default InventoryReport;
