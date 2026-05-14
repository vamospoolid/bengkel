import React from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users as UsersIcon, 
  BarChart3, LogOut, Wrench, History, Settings, 
  TrendingUp, TrendingDown, FileText, Activity, UserSquare, RefreshCw, Truck, PlusCircle, UserCheck, Camera
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  userRole?: 'admin' | 'cashier';
  setUserRole?: (role: 'admin' | 'cashier') => void;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, userRole = 'admin', setUserRole, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  }, [activePage]); // Recalculate on page change as a proxy for potential storage changes

  // Close user menu when pressing Escape or when page changes
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  React.useEffect(() => {
    setShowUserMenu(false);
  }, [activePage]);

  const menuItems = [
    { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir', icon: ShoppingCart },
    { id: 'transactions', label: 'Riwayat Transaksi', icon: FileText },
    { id: 'customers', label: 'Pelanggan', icon: UsersIcon },
    
    // Inventory & Suppliers
    { id: 'inventory', label: 'Data Barang', icon: Package },
    { id: 'mobile-scanner', label: 'Mobile Scanner', icon: Camera },
    { id: 'stock-logs', label: 'Kartu Stok', icon: Activity },
    { id: 'restock', label: 'Restok Cepat', icon: RefreshCw, adminOnly: true },
    { id: 'suppliers', label: 'Data Supplier', icon: Truck, adminOnly: true },
    { id: 'purchase-supplier', label: 'Input Pembelian', icon: PlusCircle, adminOnly: true },
    { id: 'purchase-list', label: 'Nota Pembelian', icon: FileText, adminOnly: true },
    
    // Workshop
    { id: 'service', label: 'Kontrol Bengkel', icon: Wrench },
    { id: 'attendance', label: 'Absensi Karyawan', icon: UserCheck, adminOnly: true },
    { id: 'vehicles', label: 'Riwayat Kendaraan', icon: History },
    { id: 'mechanics', label: 'Data Mekanik', icon: UserSquare, adminOnly: true },
    
    // Finance
    { id: 'income', label: 'Pemasukan', icon: TrendingUp, adminOnly: true },
    { id: 'expense', label: 'Pengeluaran', icon: TrendingDown, adminOnly: true },
    { id: 'reports', label: 'Laporan Finansial', icon: BarChart3, adminOnly: true },
    
    // System
    { id: 'settings', label: 'Pengaturan', icon: Settings, adminOnly: true },
    { id: 'users', label: 'Manajemen User', icon: UsersIcon, adminOnly: true },
  ].filter(item => !item.adminOnly || userRole === 'admin');

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-card border-r border-border flex flex-col">
        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 overflow-hidden bg-white/5 border border-white/10">
            <img src="./logo.png" alt="Jakarta Motor Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tighter leading-none italic uppercase text-white">Jakarta</h1>
            <p className="text-[10px] font-black text-primary tracking-[0.2em] leading-none uppercase mt-1">Motor</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activePage === item.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border/50">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/30 backdrop-blur-sm z-50">
          <div /> {/* Spacer */}
          
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-4 hover:bg-muted/50 p-2 rounded-2xl transition-all ${showUserMenu ? 'bg-muted/80 ring-2 ring-primary/20' : ''}`}
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-black tracking-tight">{user.name || 'Administrator'}</span>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mt-0.5">{userRole}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/10">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || userRole}`} alt="avatar" />
              </div>
            </button>

            {/* Backdrop for closing */}
            {showUserMenu && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)}
              />
            )}

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-3 w-64 bg-card border border-border rounded-[2rem] shadow-2xl p-2 animate-in zoom-in-95 duration-200 z-50">
                <div className="p-4 border-b border-border/50 mb-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Akses Cepat Admin</p>
                </div>
                
                <button 
                  onClick={() => { setActivePage('reports'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Laporan Finansial</span>
                </button>

                <button 
                  onClick={() => { setActivePage('settings'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Settings className="w-5 h-5" />
                  <span>Pengaturan Sistem</span>
                </button>

                <div className="my-2 border-t border-border/50" />

                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Keluar Aplikasi</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
