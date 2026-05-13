import React from 'react';

interface ReportLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  period?: string;
  workshop: {
    name: string;
    address: string;
    phone: string;
  };
}

const ReportLayout: React.FC<ReportLayoutProps> = ({ children, title, subtitle, period, workshop }) => {
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="report-container bg-white text-zinc-800 p-[1.5cm] min-h-[29.7cm] w-[21cm] mx-auto print:p-[1.2cm] print:shadow-none print:w-full" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
      
      {/* === KOP SURAT === */}
      <header className="mb-8">
        {/* Top accent line */}
        <div style={{ height: '3px', background: 'linear-gradient(to right, #1a1a1a 60%, #d4af37 100%)' }} className="mb-5" />
        
        <div className="flex items-start justify-between">
          {/* Left: Workshop Identity */}
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.1, color: '#111' }}>
              {workshop.name}
            </h1>
            <p style={{ fontSize: '9px', color: '#888', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '3px', fontFamily: 'Arial, sans-serif' }}>
              Bengkel &amp; Sparepart Specialist
            </p>
            <div style={{ marginTop: '8px', fontSize: '9px', color: '#555', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
              {workshop.address}<br />
              Telp / WA: {workshop.phone}
            </div>
          </div>

          {/* Right: Report Title */}
          <div className="text-right">
            <h2 style={{ fontSize: '15px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#111' }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '9px', color: '#888', fontFamily: 'Arial, sans-serif', marginTop: '2px', letterSpacing: '0.05em' }}>
                {subtitle}
              </p>
            )}
            {period && (
              <div style={{ marginTop: '8px', border: '1px solid #ddd', padding: '4px 10px', display: 'inline-block' }}>
                <p style={{ fontSize: '7px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Arial, sans-serif' }}>Periode Laporan</p>
                <p style={{ fontSize: '10px', fontWeight: '600', color: '#333', fontFamily: 'Arial, sans-serif' }}>{period}</p>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderBottom: '1px solid #ccc', marginTop: '16px' }} />

        {/* Metadata row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '8px', color: '#aaa', fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em' }}>
          <span>Dicetak oleh: Administrator</span>
          <span>Tanggal Cetak: {printDate}</span>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main style={{ minHeight: '18cm' }}>
        {children}
      </main>

      {/* === FOOTER / TANDA TANGAN === */}
      <footer style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {['Disiapkan oleh,', 'Diperiksa oleh,', 'Disetujui oleh,'].map((label) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '8px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial, sans-serif' }}>{label}</p>
              <div style={{ width: '120px', borderBottom: '1px solid #999', margin: '52px auto 6px' }} />
              <p style={{ fontSize: '8px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial, sans-serif' }}>
                {label.includes('Disiapkan') ? 'Administrator' : label.includes('Diperiksa') ? 'Kepala Kasir' : 'Pimpinan'}
              </p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '7px', color: '#ccc', fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em' }}>
          Dokumen ini dihasilkan secara otomatis oleh Sistem Manajemen {workshop.name} &bull; Halaman 1 dari 1
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
          .report-container { margin: 0 !important; width: 100% !important; padding: 1.2cm !important; }
        }
      `}} />
    </div>
  );
};

export default ReportLayout;
