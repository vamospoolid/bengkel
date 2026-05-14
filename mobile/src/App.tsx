import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Wrench, Package, User, AlertCircle, Wifi, Settings as SettingsIcon, X, DollarSign, TrendingUp, TrendingDown, UserCheck, ArrowRight, Plus, RotateCcw, Loader2 } from 'lucide-react';
import api, { updateApiBaseUrl } from './api';
import { Servis } from './pages/Servis';
import { StokPage } from './pages/StokPage';
import { FinancePage } from './pages/FinancePage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { PurchasePage } from './pages/PurchasePage';
import { StockLogsPage } from './pages/StockLogsPage';
import { CatalogPage } from './pages/CatalogPage';
import { OpnamePage } from './pages/OpnamePage';

// ─── Bottom Nav ────────────────────────────────────────────────────────────────
const BottomNav = () => {
  const location = useLocation();
  const tabs = [
    { path: '/',       label: 'Beranda', icon: Home },
    { path: '/servis', label: 'Servis',  icon: Wrench },
    { path: '/catalog', label: 'Input',   icon: Plus, isAction: true },
    { path: '/finance', label: 'Finance', icon: DollarSign },
    { path: '/stok',    label: 'Gudang',  icon: Package },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/80 backdrop-blur-2xl border-t border-white/5 safe-area-bottom">
        <div className="flex justify-around items-end px-2 pb-2 pt-1">
          {tabs.map(tab => {
            const active = location.pathname === tab.path;
            const Icon = tab.icon;
            
            if (tab.isAction) {
              return (
                <Link key={tab.path} to={tab.path}
                  className="flex flex-col items-center -translate-y-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${active ? 'bg-primary rotate-90 scale-110' : 'orange-gradient'}`}>
                    <Icon className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest mt-1.5 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link key={tab.path} to={tab.path}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 transition-all duration-300 ${active ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-primary' : ''}`}>
                  {tab.label}
                </span>
                {active && <div className="w-1 h-1 rounded-full bg-primary absolute top-1" />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = ({ user }: { user: any }) => {
  const [stats, setStats] = useState({ queued: 0, progress: 0, done: 0, lowStock: 0 });
  const [finance, setFinance] = useState({ income: 0, expense: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [orders, products, financeRecs] = await Promise.all([
          api.get('/work-orders').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] })),
          api.get('/finance').catch(() => ({ data: [] })),
        ]);
        const o = orders.data as any[];
        const p = products.data as any[];
        const f = financeRecs.data as any[];
        
        const today = new Date().toISOString().split('T')[0];
        const incToday = f.filter(x => x.type === 'INCOME' && x.date.split('T')[0] === today).reduce((s, x) => s + x.amount, 0);
        const expToday = f.filter(x => x.type === 'EXPENSE' && x.date.split('T')[0] === today).reduce((s, x) => s + x.amount, 0);

        setFinance({ income: incToday, expense: expToday });
        setStats({
          queued: o.filter((x: any) => x.status === 'QUEUED').length,
          progress: o.filter((x: any) => x.status === 'PROGRESS' || x.status === 'TESTING').length,
          done: o.filter((x: any) => x.status === 'DONE').length,
          lowStock: p.filter((x: any) => x.stock <= x.minStock).length,
        });
      } catch {}
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam';

  return (
    <div className="px-5 pt-8 pb-32 space-y-8 mesh-bg min-h-screen">
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Halo, {greeting}</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gradient">
            {user?.name?.split(' ')[0] || 'User'}
          </h1>
        </div>
        <div className="w-14 h-14 glass-card rounded-[1.5rem] flex items-center justify-center border border-white/10 shadow-2xl relative">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} alt="avatar" className="w-10 h-10" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
        </div>
      </div>

      {/* Hero Financial Summary */}
      <div className="glass-card rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-all duration-700" />
        
        <div className="flex items-center justify-between relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Arus Kas Hari Ini</p>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="space-y-1 relative z-10">
          <p className="text-4xl font-black font-mono tracking-tighter text-gradient">
            Rp {(finance.income - finance.expense).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Operasional</p>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-xl text-green-500"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">In</p>
              <p className="text-xs font-black font-mono">Rp {finance.income.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-500"><TrendingDown className="w-4 h-4" /></div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Out</p>
              <p className="text-xs font-black font-mono">Rp {finance.expense.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Antrean', val: stats.queued, color: 'text-blue-400', bg: 'bg-blue-400/10', to: '/servis' },
          { label: 'Proses', val: stats.progress, color: 'text-orange-400', bg: 'bg-orange-400/10', to: '/servis' },
          { label: 'Selesai', val: stats.done, color: 'text-green-400', bg: 'bg-green-400/10', to: '/servis' },
          { label: 'Belanja', val: stats.lowStock, color: stats.lowStock > 0 ? 'text-red-400' : 'text-muted-foreground', bg: 'bg-muted/30', to: '/shopping-list', highlight: stats.lowStock > 0 }
        ].map((s, i) => (
          <Link key={i} to={s.to} className={`glass-card p-6 rounded-[2rem] space-y-1 transition-all active:scale-95 ${s.highlight ? 'ring-1 ring-red-500/50' : ''}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${s.color}`}>{s.label}</p>
            <p className={`text-4xl font-black font-mono ${s.color}`}>{s.val}</p>
          </Link>
        ))}
      </div>

      {/* Unified Quick Actions */}
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Aksi Cepat</p>
        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
          <Link to="/catalog" className="flex items-center justify-between p-6 active:bg-white/5 transition-all group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Pendataan Barang Baru</p>
                <p className="text-[10px] text-muted-foreground font-medium">Input katalog & generate QR</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all" />
          </Link>

          <Link to="/servis" className="flex items-center justify-between p-6 active:bg-white/5 transition-all group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-all">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Antrian Servis</p>
                <p className="text-[10px] text-muted-foreground font-medium">Kelola unit masuk & mekanik</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-all" />
          </Link>

          <Link to="/finance" className="flex items-center justify-between p-6 active:bg-white/5 transition-all group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-all">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Catat Keuangan</p>
                <p className="text-[10px] text-muted-foreground font-medium">Pengeluaran & pemasukan</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-green-500 transition-all" />
          </Link>

          <Link to="/purchase" className="flex items-center justify-between p-6 active:bg-white/5 transition-all group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-all">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Input Pembelian</p>
                <p className="text-[10px] text-muted-foreground font-medium">Tambah stok dari nota supplier</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 transition-all" />
          </Link>

          <Link to="/opname" className="flex items-center justify-between p-6 active:bg-white/5 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-all">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Stok Opname</p>
                <p className="text-[10px] text-muted-foreground font-medium">Audit fisik gudang (Scan & Count)</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
};

// ─── Akun ──────────────────────────────────────────────────────────────────────
const Akun = ({ user, onLogout }: { user: any; onLogout: () => void }) => (
  <div className="px-5 pt-10 pb-32 space-y-8 mesh-bg min-h-screen">
    <div className="flex flex-col items-center py-12 space-y-4">
      <div className="relative">
        <div className="w-32 h-32 glass-card rounded-[3rem] flex items-center justify-center border-2 border-primary/30 shadow-2xl overflow-hidden">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} alt="avatar" className="w-24 h-24" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30">
          <UserCheck className="w-6 h-6" />
        </div>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-gradient">{user?.name || 'Administrator'}</h1>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">{user?.role || 'Full Access'}</p>
      </div>
    </div>

    <div className="space-y-3">
      <div className="p-5 glass-card rounded-[2rem] flex items-center gap-4 border-white/5">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><User className="w-5 h-5" /></div>
        <div className="flex-1">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Username</p>
          <p className="font-black text-sm uppercase">{user?.username || '-'}</p>
        </div>
      </div>
      <div className="p-5 glass-card rounded-[2rem] flex items-center gap-4 border-white/5">
        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500"><Wifi className="w-5 h-5" /></div>
        <div className="flex-1">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Koneksi Server</p>
          <p className="font-black text-sm uppercase">Terhubung</p>
        </div>
      </div>
    </div>

    <button onClick={onLogout}
      className="w-full p-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-red-500/5">
      <AlertCircle className="w-6 h-6" /> Keluar Aplikasi
    </button>
  </div>
);

// ─── Login ─────────────────────────────────────────────────────────────────────
const Login = ({ onLogin }: { onLogin: (u: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempIp, setTempIp] = useState(localStorage.getItem('server_ip') || '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      onLogin(res.data.user);
    } catch {
      alert('Username atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 mesh-bg">
      <div className="w-full max-w-sm space-y-12">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 glass-card rounded-[2.5rem] mx-auto flex items-center justify-center border border-white/10 mb-8 shadow-2xl rotate-12 group transition-all">
            <div className="p-4 bg-primary/20 rounded-2xl group-hover:scale-110 transition-all duration-500">
              <TrendingUp className="w-12 h-12 text-primary -rotate-12" />
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gradient leading-none">Jakarta<br/><span className="text-primary">Motor</span></h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Mobile Portal V2</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2">Identitas User</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Username"
              className="w-full glass-card rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2">Kata Sandi</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full glass-card rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full orange-gradient text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all mt-6 disabled:opacity-60 text-sm">
            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Otorisasi Masuk'}
          </button>
        </form>

        <div className="pt-8 flex justify-center">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-6 py-3 glass-card rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-all border-white/5"
          >
            <SettingsIcon className="w-4 h-4" /> Konfigurasi Node
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-sm rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl p-10 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Server Bridge</h3>
                <button onClick={() => setShowSettings(false)} className="p-3 bg-muted rounded-full hover:bg-red-500/20 hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
              </div>
              <p className="text-xs text-muted-foreground mb-8 font-medium italic leading-relaxed">Masukkan Alamat IP Central Jakarta Motor untuk sinkronisasi data lokal.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2 block">Endpoint IP</label>
                  <input 
                    type="text" 
                    placeholder="173.212.243.240:3002"
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-6 py-4 font-mono font-bold text-lg focus:ring-2 focus:ring-primary/50 outline-none text-primary"
                    value={tempIp}
                    onChange={e => setTempIp(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => {
                    localStorage.setItem('server_ip', tempIp);
                    updateApiBaseUrl(tempIp);
                    setShowSettings(false);
                  }}
                  className="w-full orange-gradient text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-2xl shadow-primary/30"
                >
                  Simpan & Hubungkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const token = localStorage.getItem('token');
      if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return JSON.parse(saved);
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <main className="flex-1 pb-20">
          <Routes>
            <Route path="/"       element={<Dashboard user={user} />} />
            <Route path="/servis" element={<Servis />} />
            <Route path="/stok"   element={<StokPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/opname" element={<OpnamePage />} />
            <Route path="/stock-logs" element={<StockLogsPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/shopping-list" element={<ShoppingListPage />} />
            <Route path="/akun"   element={<Akun user={user} onLogout={handleLogout} />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
