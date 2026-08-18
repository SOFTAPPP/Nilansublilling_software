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

  let originalBalance = selectedParty?.outstandingBalance || 0;
  for (const bill of partyBills) {
    if (bill.type === 'credit') {
       originalBalance -= (bill.total - (bill.paymentAmount || 0));
    } else if (bill.type === 'return' || bill.type === 'receipt') {
       originalBalance += bill.total;
    } else if (bill.type === 'cash') {
       originalBalance += (bill.paymentAmount || 0);
    }
  }

  let running = originalBalance;
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
  
  let openingBalance = originalBalance;
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
    <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-background flex flex-col items-center overflow-x-auto w-full font-sans pb-20 print:p-0 print:bg-white">
      <div className="w-[210mm] flex justify-between items-end mb-6 no-print">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-foreground print:text-black tracking-tight pb-2">Ledger Statement</h2>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap gap-3 items-center justify-end">
            <div className="relative" ref={partyDropdownRef}>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-card rounded-xl px-3 py-1.5 text-sm w-64 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <input 
                  type="text"
                  value={partySearch} 
                  onChange={e => { handlePartyLookup(e.target.value); setPartyDropdownOpen(true); }} 
                  onFocus={() => setPartyDropdownOpen(true)}
                  className="w-full py-1 outline-none bg-transparent text-slate-700 dark:text-foreground font-medium"
                  placeholder="Search Customer..." 
                />
              </div>
              
              {partyDropdownOpen && parties.filter(p => {
                const isSelectedMatch = selectedPartyId && parties.find(x => x.id === selectedPartyId)?.name === partySearch;
                if (isSelectedMatch) return true;
                return p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch);
              }).length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-card border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl z-50 max-h-60 overflow-y-auto no-print text-sm text-left ring-1 ring-black/5">
                  {parties.filter(p => {
                    const isSelectedMatch = selectedPartyId && parties.find(x => x.id === selectedPartyId)?.name === partySearch;
                    if (isSelectedMatch) return true;
                    return p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch);
                  }).map(p => (
                    <div
                      key={p.id}
                      className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
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
            
            <div className="flex items-center bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-3 py-1.5 overflow-hidden">
               <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="p-1 text-sm outline-none text-slate-600 dark:text-foreground bg-transparent font-medium [color-scheme:light] dark:[color-scheme:dark]" />
               <span className="text-slate-300 dark:text-slate-500 px-2">-</span>
               <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="p-1 text-sm outline-none text-slate-600 dark:text-foreground bg-transparent font-medium [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-card px-8 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-10">
            <button onClick={handlePrint} className="flex flex-col items-center gap-1.5 text-blue-800 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
              <FileText className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Report</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 text-blue-800 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
              <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Reminder</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 text-blue-800 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
              <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">SMS</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-[210mm] bg-white dark:bg-card p-10 relative mx-auto text-slate-800 dark:text-foreground shadow-xl border border-slate-200 dark:border-slate-700 print:shadow-none print:border-none print:pt-12 print:px-0 print:pb-0">

        {/* Header */}
        <div className="flex flex-col items-center border-b border-slate-200 dark:border-slate-700 print:border-slate-200 pb-8 mb-8">
          <input 
            value={settings.companyName} 
            onChange={e => updateSettings({ companyName: e.target.value })} 
            className="text-4xl font-black tracking-tight text-center w-full uppercase text-slate-900 dark:text-foreground print:text-black bg-transparent outline-none mb-1" 
          />
          <div className="text-center w-full text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">{settings.companyAddress}, {settings.companyCity}</div>
          <div className="flex justify-center gap-4 w-full mt-4 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            {settings.companyPan && <div className="flex gap-1.5 bg-slate-50 dark:bg-transparent print:bg-transparent px-4 py-1.5 rounded-full border border-slate-100 dark:border-transparent print:border-slate-100"><span className="font-semibold text-slate-800 dark:text-foreground print:text-black">PAN:</span><span>{settings.companyPan}</span></div>}
            {settings.companyContact && <div className="flex gap-1.5 bg-slate-50 dark:bg-transparent print:bg-transparent px-4 py-1.5 rounded-full border border-slate-100 dark:border-transparent print:border-slate-100"><span className="font-semibold text-slate-800 dark:text-foreground print:text-black">Phone:</span><span>{settings.companyContact}</span></div>}
            {settings.companyEmail && <div className="flex gap-1.5 bg-slate-50 dark:bg-transparent print:bg-transparent px-4 py-1.5 rounded-full border border-slate-100 dark:border-transparent print:border-slate-100"><span className="font-semibold text-slate-800 dark:text-foreground print:text-black">Email:</span><span>{settings.companyEmail}</span></div>}
          </div>
        </div>

        {selectedPartyId && (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="text-2xl font-black text-slate-800 dark:text-foreground print:text-black uppercase tracking-wide">{selectedParty?.name}</div>
              {selectedParty?.address && (
                <div className="text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1 max-w-xl text-center leading-relaxed">
                  {selectedParty.address.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                </div>
              )}
              
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-700 dark:text-slate-300 print:text-slate-700">
                {selectedParty?.phone && <div><span className="font-semibold">Phone:</span> {selectedParty.phone}</div>}
                {selectedParty?.email && <div><span className="font-semibold">Email:</span> {selectedParty.email}</div>}
                {selectedParty?.aadharNumber && <div><span className="font-semibold">Aadhar:</span> {selectedParty.aadharNumber}</div>}
              </div>

              {(selectedParty?.bankName || selectedParty?.bankAccountNo || selectedParty?.bankIfsc) && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-700 dark:text-slate-300 print:text-slate-700 bg-slate-50 dark:bg-transparent print:bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-200 dark:border-transparent print:border-slate-200">
                  {selectedParty.bankName && <div><span className="font-semibold">Bank:</span> {selectedParty.bankName}</div>}
                  {selectedParty.bankAccountNo && <div><span className="font-semibold">A/C:</span> {selectedParty.bankAccountNo}</div>}
                  {selectedParty.bankIfsc && <div><span className="font-semibold">IFSC:</span> {selectedParty.bankIfsc}</div>}
                </div>
              )}

              <div className="text-sm mt-3 font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 bg-slate-100 dark:bg-transparent print:bg-slate-100 px-3 py-1 rounded-full border border-transparent">
                Statement Period: {new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})} - {new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}
              </div>
            </div>

            {/* Header Summary Box (Screenshot 1) */}
            <div className="grid grid-cols-4 gap-4 bg-white dark:bg-card print:bg-white border border-gray-300 dark:border-slate-700 print:border-gray-300 rounded-md p-6 mb-6 text-center shadow-sm">
              <div className="border-r border-gray-300 dark:border-slate-700 print:border-gray-300">
                <div className="text-gray-700 dark:text-slate-300 print:text-gray-700 font-semibold mb-2">Opening Balance</div>
                <div className="font-bold text-lg mb-1">₹{formatMoney(Math.abs(openingBalance))}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 print:text-gray-500">(on {new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})})</div>
              </div>
              <div className="border-r border-gray-300 dark:border-slate-700 print:border-gray-300">
                <div className="text-gray-700 dark:text-slate-300 print:text-gray-700 font-semibold mb-2">Total Debit (+)</div>
                <div className="font-bold text-lg">₹{formatMoney(totalDebit)}</div>
              </div>
              <div className="border-r border-gray-300 dark:border-slate-700 print:border-gray-300">
                <div className="text-gray-700 dark:text-slate-300 print:text-gray-700 font-semibold mb-2">Total Credit (-)</div>
                <div className="font-bold text-lg">₹{formatMoney(totalCredit)}</div>
              </div>
              <div>
                <div className="text-gray-700 dark:text-slate-300 print:text-gray-700 font-semibold mb-2">Net Balance</div>
                <div className={`font-bold text-lg mb-1 ${getBalanceColor(finalBalance)}`}>
                  ₹{formatBalance(finalBalance)} {getBalanceSuffix(finalBalance)}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 print:text-gray-500">(Now will get)</div>
              </div>
            </div>

            <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300 print:text-gray-700">No. of Entries: {periodHistory.length} (All)</div>

            {/* Table */}
            <div className="border-t border-x border-gray-400 dark:border-slate-600 print:border-gray-400">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800 print:bg-gray-50 border-b border-gray-400 dark:border-slate-600 print:border-gray-400">
                    <th className="py-2 px-3 font-bold border-r border-gray-400 dark:border-slate-600 print:border-gray-400 w-28">Date</th>
                    <th className="py-2 px-3 font-bold border-r border-gray-400 dark:border-slate-600 print:border-gray-400">Details</th>
                    <th className="py-2 px-3 font-bold text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 w-32">Debit (+)</th>
                    <th className="py-2 px-3 font-bold text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 w-32">Credit (-)</th>
                    <th className="py-2 px-3 font-bold text-right w-36">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="border-b border-gray-400 dark:border-slate-600 print:border-gray-400">
                    <td className="py-2 px-3 font-bold border-r border-gray-400 dark:border-slate-600 print:border-gray-400">{new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric'})}</td>
                    <td className="py-2 px-3 border-r border-gray-400 dark:border-slate-600 print:border-gray-400"></td>
                    <td className="py-2 px-3 border-r border-gray-400 dark:border-slate-600 print:border-gray-400"></td>
                    <td colSpan={2} className="py-2 px-3 text-right text-gray-500 dark:text-slate-400 print:text-gray-500 bg-gray-50 dark:bg-slate-800 print:bg-gray-50">
                      (Opening Balance: {formatMoney(Math.abs(openingBalance))})
                    </td>
                  </tr>

                  {groupedEntriesList.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      <tr className="border-b border-gray-400 dark:border-slate-600 print:border-gray-400">
                        <td colSpan={5} className="py-2 px-3 font-bold text-sm bg-white dark:bg-card print:bg-white">
                          {group.monthYearStr}
                        </td>
                      </tr>
                      {group.entries.map((entry, i) => (
                        <tr key={`${gIdx}-${i}`} className="border-b border-gray-400 dark:border-slate-600 print:border-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent">
                          <td className="py-2 px-3 font-semibold border-r border-gray-400 dark:border-slate-600 print:border-gray-400">{entry.dateStr}</td>
                          <td className="py-2 px-3 border-r border-gray-400 dark:border-slate-600 print:border-gray-400 text-gray-600 dark:text-slate-300 print:text-gray-600">{entry.particulars}</td>
                          <td className={`py-2 px-3 text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 ${entry.debit ? 'bg-[#f4ebeb] dark:bg-red-900/20 print:bg-[#f4ebeb]' : ''}`}>
                            {entry.debit ? formatMoney(entry.debit) : ''}
                          </td>
                          <td className={`py-2 px-3 text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 ${entry.credit ? 'bg-[#e6f2e8] dark:bg-green-900/20 print:bg-[#e6f2e8]' : ''}`}>
                            {entry.credit ? formatMoney(entry.credit) : ''}
                          </td>
                          <td className={`py-2 px-3 text-right font-medium ${getBalanceColor(entry.balance)}`}>
                            {formatBalance(entry.balance)} {getBalanceSuffix(entry.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b border-gray-400 dark:border-slate-600 print:border-gray-400">
                        <td colSpan={2} className="py-2 px-3 font-bold border-r border-gray-400 dark:border-slate-600 print:border-gray-400 bg-gray-50 dark:bg-slate-800 print:bg-gray-50 text-gray-700 dark:text-slate-200 print:text-gray-700">
                          {group.monthYearStr.split(' ')[0]} Total
                        </td>
                        <td className="py-2 px-3 text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 font-medium bg-[#f4ebeb] dark:bg-red-900/20 print:bg-[#f4ebeb]">
                          {group.totalDebit > 0 ? formatMoney(group.totalDebit) : '0.00'}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 font-medium bg-[#e6f2e8] dark:bg-green-900/20 print:bg-[#e6f2e8]">
                          {group.totalCredit > 0 ? formatMoney(group.totalCredit) : '0.00'}
                        </td>
                        <td className="py-2 px-3 bg-gray-50 dark:bg-slate-800 print:bg-gray-50 border-gray-400 dark:border-slate-600 print:border-gray-400"></td>
                      </tr>
                    </React.Fragment>
                  ))}
                  
                  {/* Grand Total Row */}
                  <tr className="border-b border-gray-400 dark:border-slate-600 print:border-gray-400">
                    <td colSpan={2} className="py-3 px-3 font-bold border-r border-gray-400 dark:border-slate-600 print:border-gray-400 bg-gray-50 dark:bg-slate-800 print:bg-gray-50">Grand Total</td>
                    <td className="py-3 px-3 text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 font-bold bg-white dark:bg-card print:bg-white">
                      {formatMoney(totalDebit)}
                    </td>
                    <td className="py-3 px-3 text-right border-r border-gray-400 dark:border-slate-600 print:border-gray-400 font-bold bg-white dark:bg-card print:bg-white">
                      {formatMoney(totalCredit)}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold bg-gray-50 dark:bg-slate-800 print:bg-gray-50 ${getBalanceColor(finalBalance)}`}>
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
