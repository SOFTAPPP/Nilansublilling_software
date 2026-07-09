import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Sun, Moon, Receipt, FileText, FileClock, RotateCcw, Truck, BookOpen, UserSquare2, LayoutDashboard } from 'lucide-react';

export const Layout = () => {
  const { theme, toggleTheme } = useStore();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Cash Bill', path: '/cash-bill', icon: <Receipt size={20} /> },
    { name: 'Credit Bill', path: '/credit-bill', icon: <FileText size={20} /> },
    { name: 'Quick Bill', path: '/quick-bill', icon: <FileClock size={20} /> },
    { name: 'Return Bill', path: '/return-bill', icon: <RotateCcw size={20} /> },
    { name: 'Transport Bill', path: '/transport-bill', icon: <Truck size={20} /> },
    { name: 'Customers', path: '/customers', icon: <UserSquare2 size={20} /> },
    { name: 'Party Statements', path: '/party-statements', icon: <FileText size={20} /> },
    { name: 'Stock Management', path: '/stock', icon: <BookOpen size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col no-print">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-primary">Nilanshu Billing</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
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
