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
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Metric Cards */}
          {[
            { 
              title: 'Low Stock Items', 
              value: lowStockProducts.length, 
              icon: AlertTriangle, 
              color: { bg: 'bg-red-500/10', text: 'text-red-500', glow: 'bg-red-500' }, 
              gradient: 'bg-gradient-to-r from-red-500 to-pink-500' 
            },
            { 
              title: 'Outstanding Dues', 
              value: `₹${totalOutstanding.toLocaleString()}`, 
              icon: IndianRupee, 
              color: { bg: 'bg-blue-500/10', text: 'text-blue-500', glow: 'bg-blue-500' }, 
              gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500' 
            },
            { 
              title: 'Monthly Sales', 
              value: formatAmount(currentMonthSales), 
              icon: TrendingUp, 
              color: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'bg-emerald-500' }, 
              gradient: 'bg-gradient-to-r from-emerald-500 to-teal-500' 
            },
            { 
              title: 'Total Products', 
              value: products.length, 
              icon: Package, 
              color: { bg: 'bg-purple-500/10', text: 'text-purple-500', glow: 'bg-purple-500' }, 
              gradient: 'bg-gradient-to-r from-purple-500 to-indigo-500' 
            },
            { 
              title: "Today's Bills", 
              value: todayBills.length, 
              subValue: `₹${todaySales.toLocaleString()}`,
              icon: FileText, 
              color: { bg: 'bg-amber-500/10', text: 'text-amber-500', glow: 'bg-amber-500' }, 
              gradient: 'bg-gradient-to-r from-amber-500 to-orange-500' 
            }
          ].map((card, idx) => (
            <div key={idx} className="relative overflow-hidden bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 group cursor-default">
              {/* Background glow on hover */}
              <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${card.color.glow}`}></div>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className={`w-14 h-14 flex items-center justify-center rounded-xl ${card.color.bg} ${card.color.text} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 shadow-sm`}>
                  <card.icon size={26} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground font-medium mb-1 tracking-wide">{card.title}</p>
                  <h3 className="text-3xl font-extrabold tracking-tight text-foreground transition-transform duration-300 group-hover:translate-x-1">{card.value}</h3>
                  {card.subValue && <p className="text-xs text-muted-foreground mt-1.5 font-semibold bg-muted inline-block px-2 py-0.5 rounded-md w-max transition-transform duration-300 group-hover:translate-x-1">{card.subValue}</p>}
                </div>
              </div>
              
              {/* Animated bottom border accent */}
              <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 ease-out ${card.gradient}`}></div>
            </div>
          ))}
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
