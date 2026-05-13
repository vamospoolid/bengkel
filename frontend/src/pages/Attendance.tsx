import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, UserCheck, UserX, AlertCircle, 
  Calendar, Search, Filter, Download, 
  ArrowRight, CheckCircle2, Loader2, Fingerprint 
} from 'lucide-react';
import api from '../api';

interface AttendanceLog {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: 'PRESENT' | 'LATE' | 'OVERTIME' | 'ABSENT';
  notes: string | null;
  user: {
    name: string;
    role: string;
  };
}

const Attendance: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  
  // Report filters
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportLogs, setReportLogs] = useState<AttendanceLog[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDailyLogs();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch(e) {
      console.error('Failed to fetch users', e);
    }
  };

  const fetchDailyLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/attendance/today');
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch attendance', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setIsLoadingReport(true);
      const res = await api.get(`/attendance/report?month=${reportMonth}&year=${reportYear}`);
      setReportLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleManualScan = async () => {
    if (!selectedUserId) return alert('Pilih karyawan terlebih dahulu');
    setIsSubmitting(true);
    try {
      const res = await api.post('/attendance/log', { userId: selectedUserId });
      alert(res.data.message);
      setSelectedUserId('');
      fetchDailyLogs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal melakukan absensi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    present: logs.length,
    late: logs.filter(l => l.status === 'LATE').length,
    onTime: logs.filter(l => l.status === 'PRESENT').length,
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Absensi Karyawan</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Monitor kehadiran tim Jakarta Motor secara real-time.</p>
        </div>

        <div className="flex bg-muted p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            Monitor Hari Ini
          </button>
          <button 
            onClick={() => { setActiveTab('report'); fetchReport(); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            Laporan Bulanan
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          {/* Daily Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-[2rem] border border-border/50 flex items-center gap-5">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Hadir</p>
                <h4 className="text-2xl font-black">{stats.present} <span className="text-sm text-muted-foreground font-medium">Orang</span></h4>
              </div>
            </div>
            <div className="glass-card p-6 rounded-[2rem] border border-border/50 flex items-center gap-5">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tepat Waktu</p>
                <h4 className="text-2xl font-black">{stats.onTime}</h4>
              </div>
            </div>
            <div className="glass-card p-6 rounded-[2rem] border border-border/50 flex items-center gap-5">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Terlambat</p>
                <h4 className="text-2xl font-black text-orange-500">{stats.late}</h4>
              </div>
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="glass-card p-6 rounded-[2rem] border border-border/50 flex flex-col md:flex-row items-center gap-4 bg-primary/5">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-3 bg-primary text-white rounded-xl shadow-lg"><Fingerprint className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Absensi Manual</p>
                <p className="text-xs text-muted-foreground font-medium">Pilih nama untuk masuk/pulang</p>
              </div>
            </div>
            <select 
              className="flex-1 w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Pilih Karyawan --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <button 
              onClick={handleManualScan}
              disabled={!selectedUserId || isSubmitting}
              className="w-full md:w-auto px-8 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'REKAM ABSEN'}
            </button>
          </div>

          <div className="flex-1 glass-card rounded-[2.5rem] border border-border/50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Cari Karyawan..." 
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={fetchDailyLogs} className="p-2.5 hover:bg-muted rounded-xl transition-all">
                <RefreshCw className={`w-5 h-5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                  <Fingerprint className="w-16 h-16 opacity-20 mb-4" />
                  <p className="font-bold">Belum ada aktivitas absensi hari ini.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                    <tr className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="px-8 py-5">Karyawan</th>
                      <th className="px-8 py-5">Jabatan</th>
                      <th className="px-8 py-5 text-center">Jam Masuk</th>
                      <th className="px-8 py-5 text-center">Jam Pulang</th>
                      <th className="px-8 py-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-sm group-hover:text-primary transition-colors">{log.user.name}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black px-2 py-1 bg-muted rounded border border-border/50 uppercase">{log.user.role}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <p className="font-mono font-black text-sm">{new Date(log.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          {log.clockOut ? (
                            <p className="font-mono font-black text-sm text-green-500">{new Date(log.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400 italic">Bekerja...</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${
                            log.status === 'LATE' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 glass-card rounded-[2.5rem] border border-border/50 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select 
                  value={reportMonth} 
                  onChange={(e) => setReportMonth(parseInt(e.target.value))}
                  className="bg-background border border-border rounded-xl pl-12 pr-10 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <input 
                type="number" 
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="w-24 bg-background border border-border rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button 
                onClick={fetchReport}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Filter className="w-4 h-4" /> TERAPKAN
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-6 py-3 bg-muted border border-border rounded-xl text-xs font-black hover:bg-muted/70 transition-all">
              <Download className="w-4 h-4" /> EKSPOR PDF
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {isLoadingReport ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            ) : reportLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                <Calendar className="w-16 h-16 opacity-20 mb-4" />
                <p className="font-bold">Tidak ada data untuk periode ini.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <th className="px-8 py-5">Tanggal</th>
                    <th className="px-8 py-5">Karyawan</th>
                    <th className="px-8 py-5 text-center">Jam</th>
                    <th className="px-8 py-5 text-center">Durasi Kerja</th>
                    <th className="px-8 py-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportLogs.map((log) => {
                    const duration = log.clockOut 
                      ? Math.round((new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60))
                      : null;
                    
                    return (
                      <tr key={log.id} className="hover:bg-primary/[0.01] transition-colors">
                        <td className="px-8 py-5 font-bold text-sm">
                          {new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-sm">{log.user.name}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-black">{log.user.role}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black">{new Date(log.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            <ArrowRight className="w-3 h-3 my-1 opacity-30" />
                            <span className="text-xs font-black">{log.clockOut ? new Date(log.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          {duration !== null ? (
                            <span className="text-xs font-bold">{duration} Jam</span>
                          ) : '-'}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`text-[9px] font-black px-2 py-1 rounded border ${
                            log.status === 'LATE' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M16 21v-5h5"/></svg>
);

export default Attendance;
