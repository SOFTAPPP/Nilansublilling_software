import React from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, IndianRupee, TrendingUp, Package, FileText } from 'lucide-react';

export default function Dashboard() {
  const { products, parties, bills } = useStore();

  const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold);
  const totalOutstanding = parties.reduce((sum, p) => sum + p.outstandingBalance, 0);
  const todayBills = bills.filter(b => {
    const today = new Date();
    const bd = new Date(b.date);
    return bd.toDateString() === today.toDateString();
  });
  const todaySales = todayBills.reduce((sum, b) => sum + Number(b.total || 0), 0);

  // Calculate dynamic sales data for the last 6 months
  const now = new Date();
  const salesData = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  let currentMonthSales = 0;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    
    const monthlyBills = bills.filter(b => {
      const bd = new Date(b.date);
      return bd.getMonth() === m && bd.getFullYear() === y;
    });
    
    const sales = monthlyBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    salesData.push({ name: monthNames[m], sales });
    
    if (i === 0) currentMonthSales = sales;
  }

  // Format big numbers
  const formatAmount = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Metric Cards */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Low Stock Items</p>
              <h3 className="text-2xl font-bold">{lowStockProducts.length}</h3>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Outstanding Dues</p>
              <h3 className="text-2xl font-bold">₹{totalOutstanding.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg dark:bg-green-900/30 dark:text-green-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Monthly Sales</p>
              <h3 className="text-2xl font-bold">{formatAmount(currentMonthSales)}</h3>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400">
              <Package size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Products</p>
              <h3 className="text-2xl font-bold">{products.length}</h3>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg dark:bg-orange-900/30 dark:text-orange-400">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Today's Bills</p>
              <h3 className="text-2xl font-bold">{todayBills.length}</h3>
              <p className="text-xs text-muted-foreground">₹{todaySales.toLocaleString()}</p>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Chart */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock List */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-red-500 flex items-center gap-2">
              <AlertTriangle size={20} /> Low Stock Alerts
            </h2>
            <div className="space-y-4 overflow-y-auto max-h-72 pr-2">
              {lowStockProducts.slice(0, 8).map(p => (
                <div key={p.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500">{p.stock} left</p>
                    <p className="text-xs text-muted-foreground">Min: {p.lowStockThreshold}</p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Stock levels are healthy.</p>
              )}
            </div>
          </div>

          {/* Customer Outstanding Dues */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-blue-500 flex items-center gap-2">
              <IndianRupee size={20} /> Customer Outstanding Dues (Credit Left)
            </h2>
            <div className="space-y-4 overflow-y-auto max-h-72 pr-2">
              {parties.filter(p => p.outstandingBalance > 0).sort((a, b) => b.outstandingBalance - a.outstandingBalance).slice(0, 8).map(p => (
                <div key={p.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500">₹{p.outstandingBalance.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {parties.filter(p => p.outstandingBalance > 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No outstanding customer dues.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
