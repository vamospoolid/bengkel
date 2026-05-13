import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Workshop from './pages/Workshop';
import Reports from './pages/Reports';
import Vehicles from './pages/Vehicles';
import Settings from './pages/Settings';
import Mechanics from './pages/Mechanics';
import Finance from './pages/Finance';
import Transactions from './pages/Transactions';
import StockLogs from './pages/StockLogs';
import Customers from './pages/Customers';
import Login from './pages/Login';
import MechanicControl from './pages/MechanicControl';
import Users from './pages/Users';
import Restock from './pages/Restock';
import Suppliers from './pages/Suppliers';
import PurchaseSupplier from './pages/PurchaseSupplier';
import PurchaseList from './pages/PurchaseList';
import CustomerDisplay from './pages/CustomerDisplay';
import Attendance from './pages/Attendance';


function App() {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activePage, setActivePage] = useState('pos');
  const [userRole, setUserRole] = useState<'admin' | 'kasir'>(user?.role?.toLowerCase() || 'kasir');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('accentColor') || '#ff4500';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  // Handle special standalone routes (e.g. for TV display)
  if (window.location.pathname === '/display') {
    return <CustomerDisplay />;
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => {
      setUser(u);
      setUserRole(u.role.toLowerCase());
    }} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POS />;
      case 'transactions':
        return <Transactions />;
      case 'stock-logs':
        return <StockLogs />;
      case 'customers':
        return <Customers />;
      case 'service':
        return <Workshop />;
      case 'reports':
        return <Reports />;
      case 'vehicles':
        return <Vehicles />;
      case 'mechanics':
        return <Mechanics />;
      case 'income':
        return <Finance activeTab="income" />;
      case 'expense':
        return <Finance activeTab="expense" />;
      case 'settings':
        return <Settings 
          theme={theme} 
          setTheme={setTheme} 
          accentColor={accentColor} 
          setAccentColor={setAccentColor} 
        />;
      case 'mechanic-control':
        return <MechanicControl />;
      case 'attendance':
        return <Attendance />;
      case 'users':
        return <Users />;
      case 'restock':
        return <Restock />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchase-supplier':
        return <PurchaseSupplier />;
      case 'purchase-list':
        return <PurchaseList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      userRole={userRole} 
      setUserRole={setUserRole}
      onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
