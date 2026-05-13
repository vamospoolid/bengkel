import React from 'react';
import ReportLayout from './ReportLayout';

interface PLData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  details: {
    serviceRevenue: number;
    partRevenue: number;
    expenseDetails: { category: string; amount: number }[];
  };
}

interface ProfitLossReportProps {
  data: PLData;
  period: string;
  workshop: any;
}

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const SectionHeader: React.FC<{ roman: string; title: string; color?: string }> = ({ roman, title, color = '#222' }) => (
  <tr>
    <td colSpan={3} style={{ paddingTop: '20px', paddingBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
        <span style={{ fontSize: '9px', color: '#999', fontFamily: 'Arial, sans-serif', letterSpacing: '0.1em', minWidth: '20px' }}>{roman}</span>
        <span style={{ fontSize: '10px', fontWeight: '600', color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Arial, sans-serif' }}>{title}</span>
      </div>
    </td>
  </tr>
);

const Row: React.FC<{ label: string; amount: string; indent?: boolean; note?: string }> = ({ label, amount, indent, note }) => (
  <tr>
    <td style={{ padding: '5px 0 5px 12px', fontSize: '10px', color: '#444', fontFamily: 'Arial, sans-serif', paddingLeft: indent ? '28px' : '12px' }}>
      {label}
      {note && <span style={{ fontSize: '8px', color: '#bbb', marginLeft: '6px', fontStyle: 'italic' }}>{note}</span>}
    </td>
    <td style={{ width: '20px', textAlign: 'center', fontSize: '10px', color: '#bbb', fontFamily: 'Arial, sans-serif' }}>Rp</td>
    <td style={{ padding: '5px 0', fontSize: '10px', color: '#444', textAlign: 'right', fontFamily: 'Arial, sans-serif', minWidth: '130px' }}>
      {amount}
    </td>
  </tr>
);

const TotalRow: React.FC<{ label: string; amount: string; color?: string; large?: boolean }> = ({ label, amount, color = '#111', large }) => (
  <tr style={{ borderTop: '1px solid #ccc' }}>
    <td style={{ padding: '7px 0 7px 12px', fontSize: large ? '12px' : '10px', fontWeight: '600', color, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </td>
    <td />
    <td style={{ padding: '7px 0', fontSize: large ? '13px' : '11px', fontWeight: '700', color, textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
      {amount}
    </td>
  </tr>
);

const ProfitLossReport: React.FC<ProfitLossReportProps> = ({ data, period, workshop }) => {
  const marginPct = data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : '0.0';

  return (
    <ReportLayout title="Laporan Laba Rugi" subtitle="Profit & Loss Statement" period={period} workshop={workshop}>
      
      {/* Intro note */}
      <p style={{ fontSize: '9px', color: '#aaa', fontFamily: 'Arial, sans-serif', fontStyle: 'italic', marginBottom: '20px', lineHeight: '1.5' }}>
        Laporan ini menyajikan ringkasan pendapatan, beban, dan laba bersih usaha pada periode yang ditentukan,
        sesuai dengan prinsip akuntansi yang berlaku umum.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>

          {/* I. PENDAPATAN */}
          <SectionHeader roman="I." title="Pendapatan Operasional" color="#1a5276" />
          <Row label="Pendapatan Jasa Servis" amount={data.details.serviceRevenue.toLocaleString('id-ID')} indent />
          <Row label="Pendapatan Penjualan Suku Cadang" amount={data.details.partRevenue.toLocaleString('id-ID')} indent />
          <TotalRow label="Total Pendapatan" amount={rp(data.revenue)} color="#1a5276" />

          {/* Spacer */}
          <tr><td colSpan={3} style={{ height: '8px' }} /></tr>

          {/* II. HPP */}
          <SectionHeader roman="II." title="Harga Pokok Penjualan (HPP)" color="#922b21" />
          <Row label="Modal Suku Cadang Terjual" amount={`(${data.cogs.toLocaleString('id-ID')})`} indent />
          <TotalRow label="Laba Kotor (Gross Profit)" amount={rp(data.grossProfit)} color={data.grossProfit >= 0 ? '#1e8449' : '#922b21'} />

          {/* Spacer */}
          <tr><td colSpan={3} style={{ height: '8px' }} /></tr>

          {/* III. BEBAN */}
          <SectionHeader roman="III." title="Beban Operasional" color="#784212" />
          {data.details.expenseDetails.length > 0
            ? data.details.expenseDetails.map((exp, i) => (
                <Row key={i} label={exp.category} amount={`(${exp.amount.toLocaleString('id-ID')})`} indent />
              ))
            : <Row label="Tidak ada beban operasional tercatat" amount="—" indent />
          }
          <Row label="Biaya Umum & Administrasi" amount={`(${data.expenses.toLocaleString('id-ID')})`} indent />
          <TotalRow label="Total Beban Operasional" amount={`(${rp(data.expenses)})`} color="#922b21" />

        </tbody>
      </table>

      {/* === NET PROFIT FINAL BOX === */}
      <div style={{
        marginTop: '28px',
        border: '1.5px solid #1a5276',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f4f8fb'
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#1a5276', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Arial, sans-serif' }}>
            Laba Bersih (Net Profit)
          </p>
          <p style={{ fontSize: '8px', color: '#999', fontFamily: 'Arial, sans-serif', marginTop: '2px' }}>
            Setelah HPP dan seluruh beban operasional &bull; Margin: {marginPct}%
          </p>
        </div>
        <p style={{
          fontSize: '20px',
          fontWeight: '700',
          color: data.netProfit >= 0 ? '#1e8449' : '#922b21',
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '0.02em'
        }}>
          Rp {data.netProfit.toLocaleString('id-ID')}
        </p>
      </div>

      {/* Summary mini table */}
      <div style={{ marginTop: '20px', padding: '12px 16px', background: '#fafafa', border: '1px solid #eee' }}>
        <p style={{ fontSize: '8px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Arial, sans-serif', marginBottom: '8px' }}>Ringkasan Eksekutif</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Total Pendapatan', value: rp(data.revenue), color: '#1a5276' },
            { label: 'HPP', value: rp(data.cogs), color: '#922b21' },
            { label: 'Beban Ops.', value: rp(data.expenses), color: '#784212' },
            { label: 'Laba Bersih', value: rp(data.netProfit), color: data.netProfit >= 0 ? '#1e8449' : '#922b21' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '7px', color: '#bbb', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</p>
              <p style={{ fontSize: '10px', fontWeight: '600', color: item.color, fontFamily: 'Arial, sans-serif', marginTop: '2px' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

    </ReportLayout>
  );
};

export default ProfitLossReport;
