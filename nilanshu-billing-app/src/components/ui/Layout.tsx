import React, { useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Sun, Moon, Receipt, FileText, FileClock, RotateCcw, Truck, BookOpen, UserSquare2, LayoutDashboard, History, LogOut, ChevronLeft, ChevronRight, RefreshCw, Wallet, CreditCard } from 'lucide-react';

export const Layout = () => {
  const { theme, toggleTheme, showDialog, closeDialog, fetchProducts, fetchParties, fetchTransporters, fetchBills, fetchSettings } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    showDialog({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      type: 'confirm',
      onConfirm: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('admin');
        useStore.setState({ isAuthenticated: false, token: null });
        navigate('/login');
        closeDialog();
      }
    });
  };

  const [isExpanded, setIsExpanded] = useState(true);

  const handleRefresh = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await Promise.allSettled([
        fetchProducts(),
        fetchParties(),
        fetchTransporters(),
        fetchBills(),
        fetchSettings(),
      ]);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, fetchProducts, fetchParties, fetchTransporters, fetchBills, fetchSettings]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} className="text-blue-500" /> },
    { name: 'Cash Bill', path: '/cash-bill', icon: <Receipt size={20} className="text-green-500" /> },
    { name: 'Credit Bill', path: '/credit-bill', icon: <FileText size={20} className="text-purple-500" /> },
    { name: 'Quick Bill', path: '/quick-bill', icon: <FileClock size={20} className="text-orange-500" /> },
    { name: 'Return Bill', path: '/return-bill', icon: <RotateCcw size={20} className="text-red-500" /> },
    { name: 'Transport Bill', path: '/transport-bill', icon: <Truck size={20} className="text-amber-500" /> },
    { name: 'Customers', path: '/customers', icon: <UserSquare2 size={20} className="text-indigo-500" /> },
    { name: 'Transporters', path: '/transporters', icon: <Truck size={20} className="text-cyan-500" /> },
    { name: 'Party Statements', path: '/party-statements', icon: <FileText size={20} className="text-pink-500" /> },
    { name: 'Bill History', path: '/bill-history', icon: <History size={20} className="text-teal-500" /> },
    { name: 'Stock Management', path: '/stock', icon: <BookOpen size={20} className="text-emerald-500" /> },
    { name: 'Receipt Copy', path: '/receipt', icon: <Wallet size={20} className="text-lime-500" /> },
    { name: 'Voucher', path: '/voucher', icon: <CreditCard size={20} className="text-rose-500" /> },
  ];

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isExpanded ? 'w-64' : 'w-20'} bg-card border-r border-border flex flex-col no-print transition-all duration-300 ease-in-out flex-shrink-0 z-20`}>
        <div className={`p-6 flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col'} gap-4 min-h-[5rem]`}>
          <div className="flex items-center gap-3 overflow-hidden" style={{ display: isExpanded ? 'flex' : 'none' }}>
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-full bg-white p-0.5 flex-shrink-0" />
            <h1 className="text-xl font-bold tracking-tight text-primary truncate">NP-Billing</h1>
          </div>
          {!isExpanded && (
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-full bg-white p-0.5 flex-shrink-0" />
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground flex-shrink-0 bg-background border border-border shadow-sm"
          >
            {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        
        <nav className={`flex-1 ${isExpanded ? 'px-4' : 'px-3'} space-y-2 overflow-y-auto overflow-x-hidden transition-all duration-300`}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={!isExpanded ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center ${isExpanded ? 'justify-start gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {isExpanded && <span className="truncate whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`p-4 border-t border-border flex flex-col gap-2 ${!isExpanded && 'items-center px-2'}`}>
          <button
            onClick={toggleTheme}
            title={!isExpanded ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}
            className={`flex items-center ${isExpanded ? 'justify-start gap-3 px-3' : 'justify-center px-0 w-full'} py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors`}
          >
            <div className="flex-shrink-0">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-yellow-400" />}</div>
            {isExpanded && <span className="truncate whitespace-nowrap">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          <button
            onClick={handleRefresh}
            disabled={isSyncing}
            title={!isExpanded ? 'Refresh Data' : undefined}
            className={`flex items-center ${isExpanded ? 'justify-start gap-3 px-3' : 'justify-center px-0 w-full'} py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors`}
          >
            <div className="flex-shrink-0"><RefreshCw size={20} className={`text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} /></div>
            {isExpanded && <span className="truncate whitespace-nowrap">{isSyncing ? 'Syncing...' : 'Refresh'}</span>}
          </button>
          <button
            onClick={handleLogout}
            title={!isExpanded ? 'Logout' : undefined}
            className={`flex items-center ${isExpanded ? 'justify-start gap-3 px-3' : 'justify-center px-0 w-full'} py-2 rounded-md hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors`}
          >
            <div className="flex-shrink-0"><LogOut size={20} /></div>
            {isExpanded && <span className="truncate whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 no-print-padding">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
