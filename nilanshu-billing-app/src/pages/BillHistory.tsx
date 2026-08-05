import React, { useState, useEffect } from 'react';
import { useStore, Bill } from '../store/useStore';
import { getDb } from '../utils/api';
import { Search, Printer, Download, Trash2, X } from 'lucide-react';
import { numberToWords } from '../utils/numberToWords';
import { getLocalDateString } from '../utils/dateUtils';
import CashBill from './CashBill';
import CreditBill from './CreditBill';
import QuickBill from './QuickBill';
import TransportBill from './TransportBill';

interface BillLineItemFull {
  id: string;
  billId: string;
  productId: string;
  quantity: number;
  mrp: number;
  discountPercent: number;
  amount: number;
  rate: number | null;
  hsn: string | null;
  productName?: string;
}

interface BillFull {
  id: string;
  type: string;
  billNumber: string;
  date: string;
  partyId: string | null;
  transporterId: string | null;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  status: string;
  vehicleNo: string | null;
  destination: string | null;
  driverName: string | null;
  lrNo: string | null;
  partyName?: string;
  lineItems?: BillLineItemFull[];
}

export default function BillHistory() {
  const { parties, bills: storeBills, showDialog, deleteBill } = useStore();
  const bills = storeBills as unknown as BillFull[];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedBill, setSelectedBill] = useState<BillFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null);

  // No need to fetch on mount, it's already in the global store!
  const fetchAllBills = async () => {
    // Left for refresh button compatibility if needed, but UI is already optimistic
    useStore.getState().fetchBills();
  };

  const fetchBillDetails = async (bill: BillFull) => {
    if (loadingBillId) return; // Prevent multiple clicks
    try {
      setLoadingBillId(bill.id);
      const db = await getDb();
      const items = await db.select<any[]>(
        'SELECT bli.*, p.name as "productName" FROM "BillLineItem" bli LEFT JOIN "Product" p ON bli."productId" = p.id WHERE bli."billId" = $1',
        [bill.id]
      );
      const party = parties.find(p => p.id === bill.partyId);
      setSelectedBill({
        ...bill,
        partyName: party?.name || 'Walk-in Customer',
        lineItems: items as BillLineItemFull[]
      });
    } catch (err) {
      console.error('Failed to fetch bill details', err);
    } finally {
      setLoadingBillId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash Bill',
      credit: 'Credit/Chalan',
      quick: 'Quick Bill',
      return: 'Return Bill',
      transport: 'Transport Bill'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-700 border-green-300',
      credit: 'bg-blue-100 text-blue-700 border-blue-300',
      quick: 'bg-purple-100 text-purple-700 border-purple-300',
      return: 'bg-red-100 text-red-700 border-red-300',
      transport: 'bg-orange-100 text-orange-700 border-orange-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.partyId && parties.find(p => p.id === b.partyId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'ALL' || b.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDeleteBill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showDialog({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this bill? Stock and party balances will be automatically reverted.',
      type: 'confirm',
      onConfirm: async () => {
        await deleteBill(id);
        fetchAllBills();
      }
    });
  };

  const handlePrintBill = (bill: BillFull, e: React.MouseEvent) => {
    e.stopPropagation();
    fetchBillDetails(bill);
    // The print logic is handled in the underlying bill components when the user clicks their print button,
    // or the user can just use the print button in the opened view.
  };

  const handleExportCSV = () => {
    if (filteredBills.length === 0) return;
    const headers = ['Bill No', 'Date', 'Type', 'Customer', 'Subtotal', 'Discount', 'CGST', 'SGST', 'Total', 'Status'];
    const rows = filteredBills.map(b => {
      const partyName = parties.find(p => p.id === b.partyId)?.name || '-';
      return [
        b.billNumber,
        new Date(b.date).toLocaleDateString('en-GB'),
        getTypeLabel(b.type),
        partyName,
        b.subtotal.toFixed(2),
        b.discount.toFixed(2),
        (b.cgst || 0).toFixed(2),
        (b.sgst || 0).toFixed(2),
        b.total.toFixed(2),
        b.status
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bills_export_${getLocalDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalSales = filteredBills
    .filter(b => b.type !== 'return')
    .reduce((sum, b) => sum + Number(b.total || 0), 0);
  const totalReturns = filteredBills
    .filter(b => b.type === 'return')
    .reduce((sum, b) => sum + Number(b.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className={`flex justify-between items-center ${selectedBill ? 'print:hidden' : ''}`}>
        <h1 className="text-3xl font-bold tracking-tight">Bill History</h1>
        <div className="flex gap-2">
          <button onClick={fetchAllBills} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 flex items-center gap-2">
            Refresh
          </button>
          <button onClick={handleExportCSV} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2">
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${selectedBill ? 'print:hidden' : ''}`}>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground">Total Bills</p>
          <h3 className="text-2xl font-bold">{filteredBills.length}</h3>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <h3 className="text-2xl font-bold text-green-600">₹{totalSales.toLocaleString()}</h3>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground">Total Returns</p>
          <h3 className="text-2xl font-bold text-red-600">₹{totalReturns.toLocaleString()}</h3>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground">Net Revenue</p>
          <h3 className="text-2xl font-bold text-blue-600">₹{(totalSales - totalReturns).toLocaleString()}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm ${selectedBill ? 'print:hidden' : ''}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search by bill number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-background border border-border px-4 py-2 rounded-md outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All Types</option>
          <option value="cash">Cash Bills</option>
          <option value="credit">Credit/Chalan</option>
          <option value="quick">Quick Bills</option>
          <option value="return">Return Bills</option>
          <option value="transport">Transport Bills</option>
        </select>
      </div>

      {/* Bills Table */}
      {loading ? (
        <div className={`p-8 text-center text-muted-foreground ${selectedBill ? 'print:hidden' : ''}`}>Loading bills...</div>
      ) : (
        <div className={`bg-card border border-border rounded-lg shadow-sm overflow-x-auto ${selectedBill ? 'print:hidden' : ''}`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 font-semibold">Bill No</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Party</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBills.map(bill => {
                const party = parties.find(p => p.id === bill.partyId);
                return (
                  <tr key={bill.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fetchBillDetails(bill)}>
                    <td className="p-4 font-medium text-primary">{bill.billNumber}</td>
                    <td className="p-4 text-muted-foreground">{new Date(bill.date).toLocaleDateString('en-GB')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(bill.type)}`}>
                        {getTypeLabel(bill.type)}
                      </span>
                    </td>
                    <td className="p-4">{party?.name || 'Walk-in Customer'}</td>
                    <td className="p-4 text-right font-medium">₹{Number(bill.total).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs ${bill.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4 text-center no-print">
                      {loadingBillId === bill.id ? (
                        <span className="text-muted-foreground text-xs font-medium animate-pulse">Loading...</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => handlePrintBill(bill, e)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Print Bill"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteBill(bill.id, e)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Delete Bill"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No bills found. Create bills from the Cash Bill, Credit Bill, or other billing pages.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Detail View (Reuses Original Bill Layouts) */}
      {selectedBill && (
        <div className="fixed print:relative print:h-auto print:overflow-visible inset-0 pt-10 print:pt-0 bg-white z-50 overflow-y-auto w-full h-full">
          <button 
            onClick={() => setSelectedBill(null)} 
            className="fixed top-14 right-6 z-[60] bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 no-print transition-transform hover:scale-110"
            title="Close Preview"
          >
            <X size={24} />
          </button>
          
          <div className="w-full min-h-screen print:min-h-0">
            {selectedBill.type === 'cash' && <CashBill viewBill={selectedBill} />}
            {selectedBill.type === 'credit' && <CreditBill viewBill={selectedBill} />}
            {selectedBill.type === 'return' && <CreditBill type="return" viewBill={selectedBill} />}
            {selectedBill.type === 'quick' && <QuickBill viewBill={selectedBill} />}
            {selectedBill.type === 'transport' && <TransportBill viewBill={selectedBill} />}
          </div>
        </div>
      )}
    </div>
  );
}
