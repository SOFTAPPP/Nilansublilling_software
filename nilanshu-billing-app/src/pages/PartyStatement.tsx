import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getDb } from '../utils/api';
import { Download, Printer } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

export default function PartyStatement() {
  const { parties, bills, settings, updateSettings, fetchParties, fetchBills, showDialog } = useStore();
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const [lineItemCache, setLineItemCache] = useState<Record<string, string>>({});
  const fetchedIds = useRef(new Set<string>());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return getLocalDateString(d);
  });
  const [toDate, setToDate] = useState(() => getLocalDateString());

  const [itemSummary, setItemSummary] = useState<{productName: string, total: number}[]>([]);

  useEffect(() => {
    if (!selectedPartyId) {
      setItemSummary([]);
      return;
    }
    
    const fetchSummary = async () => {
      try {
        const db = await getDb();
        const relevantBills = bills.filter(b => b.partyId === selectedPartyId && b.type === 'credit');
        
        if (relevantBills.length === 0) {
          setItemSummary([]);
          return;
        }
        
        // SQLite has a limit on the number of variables (usually 999 or 32766). 
        // We will batch if necessary, or just use string interpolation for UUIDs since they are safe.
        // To be absolutely safe and standard, we use parameterized queries.
        const placeholders = relevantBills.map((_, i) => `$${i + 1}`).join(',');
        const query = `
          SELECT "productName", SUM(quantity) as total 
          FROM "BillLineItem" 
          WHERE "billId" IN (${placeholders}) 
          GROUP BY "productName"
          ORDER BY "productName" ASC
        `;
        
        const ids = relevantBills.map(b => b.id);
        const results = await db.select(query, ids);
        setItemSummary(results as any[]);
        
      } catch (err) {
        console.error('Failed to fetch item summary', err);
      }
    };
    fetchSummary();
  }, [selectedPartyId, bills]);

  useEffect(() => {
    fetchParties();
    fetchBills();
  }, [fetchParties, fetchBills]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Print Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  const handlePartyLookup = (val: string) => {
    setPartySearch(val);
    const found = parties.find(p => p.name.toLowerCase() === val.toLowerCase() || p.phone === val);
    if (found) {
      setSelectedPartyId(found.id);
    } else {
      setSelectedPartyId(null);
    }
  };

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  // Compute Ledger
  const partyBills = bills.filter(b => b.partyId === selectedPartyId && (b.type === 'credit' || b.type === 'return' || b.type === 'receipt' || b.type === 'cash'));
  
  // Sort ascending chronological order
  const sortedBillsByDate = [...partyBills].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0; // Forward calculating ledger always starts at 0 internally
  const rawHistory: any[] = [];
  
  for (const bill of sortedBillsByDate) {
    const isCredit = bill.type === 'credit';
    const isReturn = bill.type === 'return';
    const isReceipt = bill.type === 'receipt';
    const isCash = bill.type === 'cash';
    
    const billDate = new Date(bill.date);
    const timeStr = billDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (isCredit) {
      running += bill.total;
      
      let statusBadge = '';
      if (bill.paymentAmount && bill.paymentAmount >= bill.total) {
        statusBadge = `<br/><span class="inline-block mt-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-green-600 print:bg-transparent print:text-black">✅ FULLY PAID</span>`;
      } else if (bill.paymentAmount && bill.paymentAmount > 0) {
        statusBadge = `<br/><span class="inline-block mt-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-blue-600 print:bg-transparent print:text-black">🔵 PARTIALLY PAID</span>`;
      } else {
        statusBadge = `<br/><span class="inline-block mt-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-slate-600 print:bg-transparent print:text-black">🔵 OUTSTANDING</span>`;
      }

      rawHistory.push({
        billId: bill.id,
        date: billDate,
        time: timeStr,
        type: 'INV',
        vNo: bill.billNumber,
        particulars: `Credit Purchase ${statusBadge}`,
        debit: bill.total,
        credit: null,
        balance: running
      });
      
      if (bill.paymentAmount && bill.paymentAmount > 0) {
        running -= bill.paymentAmount;
        rawHistory.push({
          billId: bill.id + '-pay',
          date: billDate,
          time: timeStr,
          type: 'RCT',
          vNo: bill.billNumber,
          particulars: `Advance Payment Received <br/><span class="inline-block mt-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-green-600 print:bg-transparent print:text-black">✅ RECEIVED</span>`,
          debit: null,
          credit: bill.paymentAmount,
          balance: running
        });
      }
    } else if (isCash) {
      rawHistory.push({
        billId: bill.id,
        date: billDate,
        time: timeStr,
        type: 'CSH',
        vNo: bill.billNumber,
        particulars: `Cash Purchase <br/><span class="inline-block mt-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-green-600 print:bg-transparent print:text-black">✅ PAID IN CASH</span>`,
        debit: bill.total,
        credit: bill.total,
        balance: running
      });
      
      const extraPayment = bill.paymentAmount || 0;
      
      if (extraPayment > 0) {
        running -= extraPayment;
        rawHistory.push({
          billId: bill.id + '-pay',
          date: billDate,
          time: timeStr,
          type: 'RCT',
          vNo: bill.billNumber,
          particulars: `Payment Received (Previous Dues) <br/><span class="inline-block mt-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-green-600 print:bg-transparent print:text-black">✅ RECEIVED</span>`,
          debit: null,
          credit: extraPayment,
          balance: running
        });
      }
    } else if (isReturn) {
      running -= bill.total;
      rawHistory.push({
        billId: bill.id,
        date: billDate,
        time: timeStr,
        type: 'RET',
        vNo: bill.billNumber,
        particulars: `Sales Return <br/><span class="inline-block mt-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-orange-600 print:bg-transparent print:text-black">↩️ RETURNED</span>`,
        debit: null,
        credit: bill.total,
        balance: running
      });
    } else if (isReceipt) {
      running -= bill.total;
      rawHistory.push({
        billId: bill.id,
        date: billDate,
        time: timeStr,
        type: 'RCT',
        vNo: bill.billNumber,
        particulars: `Payment Received <br/><span class="inline-block mt-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider print:border print:border-green-600 print:bg-transparent print:text-black">✅ RECEIVED</span>`,
        debit: null,
        credit: bill.total,
        balance: running
      });
    }
  }
  
  const start = new Date(fromDate).getTime();
  const end = new Date(toDate + 'T23:59:59').getTime();
  
  let openingBalance = 0;
  const periodHistory: any[] = [];
  
  for (const entry of rawHistory) {
    const entryTime = entry.date.getTime();
    if (entryTime < start) {
      openingBalance = entry.balance;
    } else if (entryTime <= end) {
      periodHistory.push({
        ...entry,
        dateStr: entry.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      });
    }
  }
  
  const dailyGroups: Record<string, {
    date: string;
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    entries: any[];
  }> = {};

  let currentRunning = openingBalance;
  
  periodHistory.forEach((entry) => {
    if (!dailyGroups[entry.dateStr]) {
      dailyGroups[entry.dateStr] = {
        date: entry.dateStr,
        openingBalance: currentRunning,
        closingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        entries: []
      };
    }
    
    dailyGroups[entry.dateStr].entries.push(entry);
    
    if (entry.debit) dailyGroups[entry.dateStr].totalDebit += entry.debit;
    if (entry.credit) dailyGroups[entry.dateStr].totalCredit += entry.credit;
    
    currentRunning = entry.balance;
    dailyGroups[entry.dateStr].closingBalance = currentRunning;
  });

  const groupedEntriesList = Object.values(dailyGroups);
  
  const filteredBillIds = Array.from(new Set(periodHistory.map(h => h.billId.replace('-pay', '')).filter(Boolean))).join(',');

  useEffect(() => {
    async function fetchMissingItems() {
      if (!filteredBillIds) return;
      const ids = filteredBillIds.split(',');
      const missingIds = ids.filter(id => !fetchedIds.current.has(id));
      if (missingIds.length === 0) return;
      
      missingIds.forEach(id => fetchedIds.current.add(id));
      
      try {
        const db = await getDb();
        const newEntries: Record<string, string> = {};
        
        for (const id of missingIds) {
          try {
            const items = await db.select<any[]>('SELECT bli.quantity, p.name FROM "BillLineItem" bli LEFT JOIN "Product" p ON bli."productId" = p.id WHERE bli."billId" = $1', [id]);
            if (items && items.length > 0) {
              newEntries[id] = items.map(i => `${i.name || 'Unknown'} (x${i.quantity})`).join(', ');
            } else {
              newEntries[id] = '';
            }
          } catch(e) {
            newEntries[id] = '';
          }
        }
        
        setLineItemCache(prev => ({ ...prev, ...newEntries }));
      } catch (e) {
        console.error("Failed to fetch bill items for statement", e);
      }
    }
    fetchMissingItems();
  }, [filteredBillIds]);
  
  const periodCashSales = periodHistory.filter(h => h.type === 'CSH').reduce((sum, h) => sum + (h.debit || 0), 0);
  const periodCreditSales = periodHistory.filter(h => h.type === 'INV').reduce((sum, h) => sum + (h.debit || 0), 0);
  const periodTotalSales = periodCashSales + periodCreditSales;

  const periodReturns = periodHistory.filter(h => h.type === 'RET').reduce((sum, h) => sum + (h.credit || 0), 0);
  const periodPayments = periodHistory.filter(h => h.type === 'RCT').reduce((sum, h) => sum + (h.credit || 0), 0);
  const periodCashCollected = periodHistory.filter(h => h.type === 'CSH').reduce((sum, h) => sum + (h.credit || 0), 0);

  const balanceBeforePeriod = openingBalance;
  const totalDebit = periodHistory.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = periodHistory.reduce((sum, e) => sum + (e.credit || 0), 0);
  const finalBalance = currentRunning;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50 flex flex-col items-center overflow-x-auto w-full font-sans">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Ledger Statement</h2>
        <div className="flex flex-wrap gap-3 items-center justify-end flex-1">
          <div className="relative" ref={partyDropdownRef}>
            <div className="flex items-center border border-slate-200 bg-white rounded-xl px-3 py-1 text-sm w-56 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <input 
                type="text"
                value={partySearch} 
                onChange={e => { handlePartyLookup(e.target.value); setPartyDropdownOpen(true); }} 
                onFocus={() => setPartyDropdownOpen(true)}
                className="w-full py-1.5 outline-none bg-transparent text-slate-700 font-medium"
                placeholder="Search Customer..." 
              />
              <svg onClick={() => setPartyDropdownOpen(!partyDropdownOpen)} className="w-4 h-4 cursor-pointer text-slate-400 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            
            {partyDropdownOpen && parties.filter(p => {
              const isSelectedMatch = selectedPartyId && parties.find(x => x.id === selectedPartyId)?.name === partySearch;
              if (isSelectedMatch) return true;
              return p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch);
            }).length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 shadow-xl rounded-xl z-50 max-h-60 overflow-y-auto no-print text-sm text-left ring-1 ring-black/5">
                {parties.filter(p => {
                  const isSelectedMatch = selectedPartyId && parties.find(x => x.id === selectedPartyId)?.name === partySearch;
                  if (isSelectedMatch) return true;
                  return p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch);
                }).map(p => (
                  <div
                    key={p.id}
                    className="px-4 py-3 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                    onClick={() => {
                      handlePartyLookup(p.name);
                      setPartyDropdownOpen(false);
                    }}
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm px-2 overflow-hidden">
             <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="p-2 text-sm outline-none text-slate-600 bg-transparent font-medium" />
             <span className="text-slate-300 px-1">-</span>
             <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="p-2 text-sm outline-none text-slate-600 bg-transparent font-medium" />
          </div>
          <button onClick={handlePrint} className="whitespace-nowrap bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 text-sm flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Ledger Canvas */}
      <div className="w-[210mm] min-h-[297mm] bg-[#fdfbf7] p-10 pl-16 relative mx-auto text-slate-800 font-serif shadow-2xl border border-amber-200/60 print:shadow-none print:border-none print:p-0 print:rounded-none before:content-[''] before:absolute before:left-12 before:top-0 before:bottom-0 before:w-[2px] before:bg-red-400/50">
        
        {/* Header */}
        <div className="flex flex-col items-center border-b border-slate-200 pb-8 mb-8">
          <input 
            value={settings.companyName} 
            onChange={e => updateSettings({ companyName: e.target.value })} 
            className="text-4xl font-black tracking-tight text-center w-full uppercase text-slate-900 bg-transparent outline-none mb-1" 
          />
          <div className="text-center w-full text-slate-600 font-medium">{settings.companyAddress}, {settings.companyCity}</div>
          <div className="flex justify-center gap-4 w-full mt-3 text-xs text-slate-500">
            {settings.companyPan && <div className="flex gap-1 bg-slate-50 px-3 py-1 rounded-full"><span className="font-semibold text-slate-700">PAN:</span><span>{settings.companyPan}</span></div>}
            {settings.companyContact && <div className="flex gap-1 bg-slate-50 px-3 py-1 rounded-full"><span className="font-semibold text-slate-700">Phone:</span><span>{settings.companyContact}</span></div>}
            {settings.companyEmail && <div className="flex gap-1 bg-slate-50 px-3 py-1 rounded-full"><span className="font-semibold text-slate-700">Email:</span><span>{settings.companyEmail}</span></div>}
          </div>
        </div>

        {/* Ledger Info */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ledger Account</div>
            <div className="text-2xl font-extrabold text-slate-900 uppercase">
              {selectedParty ? selectedParty.name : <span className="text-slate-300">NO CUSTOMER SELECTED</span>}
            </div>
            {selectedParty && <div className="text-sm text-slate-500 mt-1 font-medium">{selectedParty.address} &bull; {selectedParty.phone}</div>}
          </div>
          <div className="text-right">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Statement Period</div>
             <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               {new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})} &mdash; {new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}
             </div>
          </div>
        </div>

        {/* Period Summary */}
        {selectedPartyId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50/50 rounded-lg p-6 mb-8 border border-amber-100 print:bg-transparent print:p-0 print:border-none print:border-y print:border-slate-300 print:py-4 print:rounded-none">
            
            {/* Sales Summary */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Sales Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cash Sales</span>
                  <span className="font-semibold text-slate-800">₹ {periodCashSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Credit Sales</span>
                  <span className="font-semibold text-slate-800">₹ {periodCreditSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Total Sales</span>
                  <span className="font-bold text-slate-900">₹ {periodTotalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Collection & Dues */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Collection & Dues</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Due</span>
                  <span className="font-semibold text-slate-800">₹ {balanceBeforePeriod.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payments Against Due</span>
                  <span className="font-semibold text-slate-800">₹ {periodPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {periodReturns > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sales Returns (Credit)</span>
                    <span className="font-semibold text-slate-800">₹ {periodReturns.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-xs mt-1">
                  <span>(Cash Collected from Cash Sales)</span>
                  <span>₹ {periodCashCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-blue-600 uppercase">Closing Due</span>
                  <span className="font-black text-blue-700 text-base">₹ {finalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Table */}
        <table className="w-full text-left border-collapse text-[13px] relative z-10">
          <thead>
            <tr className="border-y-2 border-blue-300 text-blue-900 bg-blue-50/30">
              <th className="py-2 px-2 font-bold uppercase tracking-wider w-20 border-r border-blue-200/50">Date</th>
              <th className="py-2 px-1 font-bold uppercase tracking-wider w-12 text-center border-r border-blue-200/50">Type</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider w-16 text-center border-r border-blue-200/50">Ref No.</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider border-r border-blue-200/50">Particulars</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right w-24 border-r border-blue-200/50">Invoice (₹)</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right w-24 border-r border-blue-200/50">Paid (₹)</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right w-24">Running Due (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-200/60 print:divide-slate-300">
            {selectedPartyId ? (
              groupedEntriesList.length > 0 ? (
                groupedEntriesList.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    <tr className="bg-amber-100/30 print:bg-transparent text-slate-600">
                      <td colSpan={6} className="py-1 px-2 font-bold text-xs uppercase tracking-wider border-r border-blue-200/50">
                        Opening Due ({group.date})
                      </td>
                      <td className="py-1 px-2 text-right font-semibold text-slate-600">
                        {group.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    {group.entries.map((entry, i) => {
                      let parts = entry.particulars;
                      const baseId = entry.billId.replace('-pay', '');
                      if (baseId && lineItemCache[baseId] && !entry.billId.endsWith('-pay') && entry.type !== 'RCT' && entry.type !== 'RET') {
                        parts += ` - <span class="text-slate-400 font-medium">${lineItemCache[baseId]}</span>`;
                      }
                      return (
                        <tr key={`${gIdx}-${i}`} className="hover:bg-amber-50 transition-colors group text-blue-900/90 font-medium leading-tight">
                          <td className="py-1 px-2 whitespace-nowrap align-top border-r border-blue-200/50">
                            <span className="font-bold">{entry.dateStr}</span><br/><span className="text-[11px] text-blue-900/60 font-medium">{entry.time}</span>
                          </td>
                          <td className="py-1 px-1 text-center align-top border-r border-blue-200/50">
                             <span className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider print:bg-transparent print:border print:border-slate-300">{entry.type}</span>
                          </td>
                          <td className="py-1 px-2 text-center font-bold text-blue-900/70 align-top border-r border-blue-200/50">{entry.vNo || '-'}</td>
                          <td className="py-1 px-2 break-words whitespace-normal align-top leading-tight border-r border-blue-200/50" dangerouslySetInnerHTML={{ __html: parts }}></td>
                          <td className="py-1 px-2 text-right align-top border-r border-blue-200/50 text-red-700 font-semibold">{entry.debit ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                          <td className="py-1 px-2 text-right align-top border-r border-blue-200/50 text-green-700 font-semibold">{entry.credit ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900 align-top">{entry.balance !== undefined ? entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-amber-100/50 print:bg-transparent font-bold border-b-2 border-blue-300 print:border-slate-400 text-blue-900">
                      <td colSpan={4} className="py-1.5 px-2 text-right text-blue-900/60 text-xs uppercase tracking-wider border-r border-blue-200/50">Daily Summary</td>
                      <td className="py-1.5 px-2 text-right border-r border-blue-200/50">
                         <div className="text-[10px] text-red-700/70 uppercase">Invoices Raised</div>
                         <div className="text-red-700">{group.totalDebit > 0 ? group.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</div>
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-blue-200/50">
                         <div className="text-[10px] text-green-700/70 uppercase">Payments Rcvd</div>
                         <div className="text-green-700">{group.totalCredit > 0 ? group.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</div>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                         <div className="text-[10px] text-slate-500 uppercase">Closing Due</div>
                         <div className="text-slate-900">{group.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-2">
                       <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       No transactions found for the selected period.
                    </div>
                  </td>
                </tr>
              )
            ) : (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                   <div className="flex flex-col items-center gap-2">
                       <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                       Please select a customer to view their statement.
                    </div>
                </td>
              </tr>
            )}
          </tbody>
          {selectedPartyId && (
            <tfoot>
              <tr className="bg-blue-900 text-amber-50 print:bg-transparent print:text-black print:border-y-2 print:border-black">
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-widest text-xs font-bold opacity-90 print:opacity-100 border-r border-blue-800/50">Period Total</td>
                <td className="py-2.5 px-2 text-right font-bold border-r border-blue-800/50">{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-2 text-right font-bold border-r border-blue-800/50">{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right font-black text-sm">{finalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Item Summary */}
        {selectedPartyId && itemSummary.length > 0 && (
          <div className="mt-12 bg-slate-50 rounded-2xl p-6 border border-slate-100 print:border-t-2 print:border-slate-800 print:mt-8 print:pt-4 print:p-0 print:bg-transparent print:rounded-none">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 print:text-black">Book Purchase Summary (All Time)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
              {itemSummary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200/50 print:border-slate-300">
                  <span className="text-slate-700 font-medium">{item.productName}</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md shadow-sm text-xs print:shadow-none print:bg-transparent">{item.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
