import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Printer, FileText, MessageCircle, MessageSquare } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

export default function PartyStatement() {
  const { parties, bills, settings, updateSettings, fetchParties, fetchBills, showDialog } = useStore();
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  
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

  useEffect(() => {
    fetchParties();
    fetchBills();
  }, [fetchParties, fetchBills]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Print Error', message: 'Printer issue.', type: 'alert' });
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
  const sortedBillsByDate = [...partyBills].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  const rawHistory: any[] = [];
  
  for (const bill of sortedBillsByDate) {
    const isCredit = bill.type === 'credit';
    const isReturn = bill.type === 'return';
    const isReceipt = bill.type === 'receipt';
    const isCash = bill.type === 'cash';
    
    const billDate = new Date(bill.date);
    const timeStr = billDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    let particularsText = '';
    if (isCredit) {
      const items = (bill as any).lineItems || [];
      if (items.length > 0) {
         particularsText = `${bill.billNumber}`;
      } else {
         particularsText = `${bill.billNumber}`;
      }
      running += bill.total;
      rawHistory.push({
        billId: bill.id,
        date: billDate,
        time: timeStr,
        vNo: bill.billNumber,
        particulars: particularsText,
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
          vNo: bill.billNumber,
          particulars: 'Advance Payment',
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
        vNo: bill.billNumber,
        particulars: `Cash Bill: ${bill.billNumber}`,
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
          vNo: bill.billNumber,
          particulars: 'Payment Received',
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
        vNo: bill.billNumber,
        particulars: `Return: ${bill.billNumber}`,
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
        vNo: bill.billNumber,
        particulars: `Receipt: ${bill.billNumber}`,
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
        dateStr: entry.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        monthYearStr: entry.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        monthSortKey: entry.date.getFullYear() + '-' + String(entry.date.getMonth() + 1).padStart(2, '0')
      });
    }
  }
  
  const monthlyGroups: Record<string, {
    monthYearStr: string;
    monthSortKey: string;
    totalDebit: number;
    totalCredit: number;
    entries: any[];
  }> = {};

  periodHistory.forEach((entry) => {
    if (!monthlyGroups[entry.monthSortKey]) {
      monthlyGroups[entry.monthSortKey] = {
        monthYearStr: entry.monthYearStr,
        monthSortKey: entry.monthSortKey,
        totalDebit: 0,
        totalCredit: 0,
        entries: []
      };
    }
    monthlyGroups[entry.monthSortKey].entries.push(entry);
    if (entry.debit) monthlyGroups[entry.monthSortKey].totalDebit += entry.debit;
    if (entry.credit) monthlyGroups[entry.monthSortKey].totalCredit += entry.credit;
  });

  const groupedEntriesList = Object.values(monthlyGroups).sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey));
  
  const totalDebit = periodHistory.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = periodHistory.reduce((sum, e) => sum + (e.credit || 0), 0);
  const finalBalance = openingBalance + totalDebit - totalCredit;

  const formatMoney = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatBalance = (val: number) => {
    return Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const getBalanceSuffix = (val: number) => {
    if (val > 0) return 'Dr';
    if (val < 0) return 'Cr';
    return '';
  };
  
  const getBalanceColor = (val: number) => {
    if (val > 0) return 'text-red-600';
    if (val < 0) return 'text-green-600';
    return 'text-slate-800';
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50 flex flex-col items-center overflow-x-auto w-full font-sans pb-20">
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
        </div>
      </div>

      <div className="w-[210mm] bg-white p-10 relative mx-auto text-slate-800 shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0">
        
        {/* Top Action Buttons (Screenshot 3) */}
        <div className="flex justify-end gap-6 mb-8 no-print border-b border-slate-100 pb-4">
          <button onClick={handlePrint} className="flex flex-col items-center gap-1 text-blue-800 hover:text-blue-600 transition-colors">
            <FileText className="w-8 h-8" strokeWidth={1.5} />
            <span className="text-sm font-medium">Report</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-blue-800 hover:text-blue-600 transition-colors">
            <MessageCircle className="w-8 h-8" strokeWidth={1.5} />
            <span className="text-sm font-medium">Reminder</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-blue-800 hover:text-blue-600 transition-colors">
            <MessageSquare className="w-8 h-8" strokeWidth={1.5} />
            <span className="text-sm font-medium">SMS</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center border-b border-slate-200 pb-8 mb-8">
          <input 
            value={settings.companyName} 
            onChange={e => updateSettings({ companyName: e.target.value })} 
            className="text-4xl font-black tracking-tight text-center w-full uppercase text-slate-900 bg-transparent outline-none mb-1" 
          />
          <div className="text-center w-full text-slate-600 font-medium">{settings.companyAddress}, {settings.companyCity}</div>
          <div className="flex justify-center gap-4 w-full mt-4 text-sm text-slate-600">
            {settings.companyPan && <div className="flex gap-1.5 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100"><span className="font-semibold text-slate-800">PAN:</span><span>{settings.companyPan}</span></div>}
            {settings.companyContact && <div className="flex gap-1.5 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100"><span className="font-semibold text-slate-800">Phone:</span><span>{settings.companyContact}</span></div>}
            {settings.companyEmail && <div className="flex gap-1.5 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100"><span className="font-semibold text-slate-800">Email:</span><span>{settings.companyEmail}</span></div>}
          </div>
        </div>

        {selectedPartyId && (
          <>
            <div className="mb-4 text-center">
              <div className="text-xl font-bold">{selectedParty?.name}</div>
              {selectedParty?.phone && <div className="text-sm">Phone Number: {selectedParty.phone}</div>}
              <div className="text-sm mt-1">({new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})} - {new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})})</div>
            </div>

            {/* Header Summary Box (Screenshot 1) */}
            <div className="grid grid-cols-4 gap-4 bg-white border border-gray-300 rounded-md p-6 mb-6 text-center shadow-sm">
              <div className="border-r border-gray-300">
                <div className="text-gray-700 font-semibold mb-2">Opening Balance</div>
                <div className="font-bold text-lg mb-1">₹{formatMoney(Math.abs(openingBalance))}</div>
                <div className="text-xs text-gray-500">(on {new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})})</div>
              </div>
              <div className="border-r border-gray-300">
                <div className="text-gray-700 font-semibold mb-2">Total Debit(-)</div>
                <div className="font-bold text-lg">₹{formatMoney(totalDebit)}</div>
              </div>
              <div className="border-r border-gray-300">
                <div className="text-gray-700 font-semibold mb-2">Total Credit(+)</div>
                <div className="font-bold text-lg">₹{formatMoney(totalCredit)}</div>
              </div>
              <div>
                <div className="text-gray-700 font-semibold mb-2">Net Balance</div>
                <div className={`font-bold text-lg mb-1 ${getBalanceColor(finalBalance)}`}>
                  ₹{formatBalance(finalBalance)} {getBalanceSuffix(finalBalance)}
                </div>
                <div className="text-xs text-gray-500">(New will get)</div>
              </div>
            </div>

            <div className="mb-2 text-sm font-semibold text-gray-700">No. of Entries: {periodHistory.length} (All)</div>

            {/* Table */}
            <div className="border-t border-x border-gray-400">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-400">
                    <th className="py-2 px-3 font-bold border-r border-gray-400 w-28">Date</th>
                    <th className="py-2 px-3 font-bold border-r border-gray-400">Details</th>
                    <th className="py-2 px-3 font-bold text-right border-r border-gray-400 w-32">Debit(-)</th>
                    <th className="py-2 px-3 font-bold text-right border-r border-gray-400 w-32">Credit(+)</th>
                    <th className="py-2 px-3 font-bold text-right w-36">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="border-b border-gray-400">
                    <td className="py-2 px-3 font-bold border-r border-gray-400">{new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric'})}</td>
                    <td className="py-2 px-3 border-r border-gray-400"></td>
                    <td className="py-2 px-3 border-r border-gray-400"></td>
                    <td colSpan={2} className="py-2 px-3 text-right text-gray-500 bg-gray-50">
                      (Opening Balance: {formatMoney(Math.abs(openingBalance))})
                    </td>
                  </tr>

                  {groupedEntriesList.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      <tr className="border-b border-gray-400">
                        <td colSpan={5} className="py-2 px-3 font-bold text-sm bg-white">
                          {group.monthYearStr}
                        </td>
                      </tr>
                      {group.entries.map((entry, i) => (
                        <tr key={`${gIdx}-${i}`} className="border-b border-gray-400">
                          <td className="py-2 px-3 font-semibold border-r border-gray-400">{entry.dateStr}</td>
                          <td className="py-2 px-3 border-r border-gray-400 text-gray-600">{entry.particulars}</td>
                          <td className={`py-2 px-3 text-right border-r border-gray-400 ${entry.debit ? 'bg-[#f4ebeb]' : ''}`}>
                            {entry.debit ? formatMoney(entry.debit) : ''}
                          </td>
                          <td className={`py-2 px-3 text-right border-r border-gray-400 ${entry.credit ? 'bg-[#e6f2e8]' : ''}`}>
                            {entry.credit ? formatMoney(entry.credit) : ''}
                          </td>
                          <td className={`py-2 px-3 text-right font-medium ${getBalanceColor(entry.balance)}`}>
                            {formatBalance(entry.balance)} {getBalanceSuffix(entry.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b border-gray-400">
                        <td colSpan={2} className="py-2 px-3 font-bold border-r border-gray-400 bg-gray-50 text-gray-700">
                          {group.monthYearStr.split(' ')[0]} Total
                        </td>
                        <td className="py-2 px-3 text-right border-r border-gray-400 font-medium bg-[#f4ebeb]">
                          {group.totalDebit > 0 ? formatMoney(group.totalDebit) : '0.00'}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-gray-400 font-medium bg-[#e6f2e8]">
                          {group.totalCredit > 0 ? formatMoney(group.totalCredit) : '0.00'}
                        </td>
                        <td className="py-2 px-3 bg-gray-50 border-gray-400"></td>
                      </tr>
                    </React.Fragment>
                  ))}
                  
                  {/* Grand Total Row */}
                  <tr className="border-b border-gray-400">
                    <td colSpan={2} className="py-3 px-3 font-bold border-r border-gray-400 bg-gray-50">Grand Total</td>
                    <td className="py-3 px-3 text-right border-r border-gray-400 font-bold bg-white">
                      {formatMoney(totalDebit)}
                    </td>
                    <td className="py-3 px-3 text-right border-r border-gray-400 font-bold bg-white">
                      {formatMoney(totalCredit)}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold bg-gray-50 ${getBalanceColor(finalBalance)}`}>
                      {formatBalance(finalBalance)} {getBalanceSuffix(finalBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              Report Generated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit'})} | {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
