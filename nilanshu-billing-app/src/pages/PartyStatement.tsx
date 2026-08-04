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
  const partyBills = bills.filter(b => b.partyId === selectedPartyId && (b.type === 'credit' || b.type === 'return'));
  
  // Sort ascending by date
  const sortedBills = [...partyBills].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const currentOutstanding = selectedParty ? selectedParty.outstandingBalance : 0;
  
  let running = currentOutstanding;
  const rawHistory: any[] = [];
  
  // Backtrack from current balance
  for (let i = sortedBills.length - 1; i >= 0; i--) {
    const bill = sortedBills[i];
    const isCredit = bill.type === 'credit';
    const isReturn = bill.type === 'return';
    
    if (isCredit) {
      const before = running - bill.total;
      rawHistory.unshift({
        date: new Date(bill.date),
        vNo: bill.billNumber,
        particulars: `Bill No. ${bill.billNumber}`,
        debit: bill.total,
        credit: 0,
        balance: running
      });
      running = before;
    } else if (isReturn) {
      const before = running + bill.total;
      rawHistory.unshift({
        date: new Date(bill.date),
        vNo: bill.billNumber,
        particulars: `Sales Return No. ${bill.billNumber}`,
        debit: 0,
        credit: bill.total,
        balance: running
      });
      running = before;
    }
  }
  
  const initialOpeningBalance = running;
  
  const start = new Date(fromDate).getTime();
  const end = new Date(toDate + 'T23:59:59').getTime();
  
  let balanceBeforePeriod = initialOpeningBalance;
  const filteredHistory: any[] = [];
  
  for (const entry of rawHistory) {
    const entryTime = entry.date.getTime();
    if (entryTime < start) {
      if (entry.debit) balanceBeforePeriod += entry.debit;
      if (entry.credit) balanceBeforePeriod -= entry.credit;
    } else if (entryTime <= end) {
      filteredHistory.push({
        ...entry,
        dateStr: entry.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      });
    }
  }
  
  const entries = [
    {
      date: new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      vNo: '',
      particulars: 'Opening Balance',
      debit: balanceBeforePeriod > 0 ? balanceBeforePeriod : 0,
      credit: balanceBeforePeriod < 0 ? -balanceBeforePeriod : 0,
      balance: balanceBeforePeriod
    },
    ...filteredHistory.map(h => ({
      date: h.dateStr,
      vNo: h.vNo,
      particulars: h.particulars,
      debit: h.debit,
      credit: h.credit,
      balance: h.balance
    }))
  ];
  
  const totalDebit = entries.slice(1).reduce((sum, e) => sum + e.debit, 0) + (balanceBeforePeriod > 0 ? balanceBeforePeriod : 0);
  const totalCredit = entries.slice(1).reduce((sum, e) => sum + e.credit, 0) + (balanceBeforePeriod < 0 ? -balanceBeforePeriod : 0);
  const finalBalance = balanceBeforePeriod + entries.slice(1).reduce((sum, e) => sum + e.debit - e.credit, 0);

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Party Statement / Ledger</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center justify-end flex-1">
          <div className="relative" ref={partyDropdownRef}>
            <div className="flex items-center border border-gray-300 bg-white rounded-lg px-2 text-sm w-48 shadow-sm">
              <input 
                type="text"
                value={partySearch} 
                onChange={e => { handlePartyLookup(e.target.value); setPartyDropdownOpen(true); }} 
                onFocus={() => setPartyDropdownOpen(true)}
                className="w-full py-2 outline-none"
                placeholder="Select Customer..." 
              />
              <svg onClick={() => setPartyDropdownOpen(!partyDropdownOpen)} className="w-4 h-4 cursor-pointer text-gray-500 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            
            {partyDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto no-print text-sm text-left">
                {parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).map(p => (
                  <div
                    key={p.id}
                    className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => {
                      handlePartyLookup(p.name);
                      setPartyDropdownOpen(false);
                    }}
                  >
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs opacity-90">{p.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" />
          <button onClick={handlePrint} className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm">
            Print Statement
          </button>
        </div>
      </div>

      {/* Ledger Canvas */}
      <div className="a4-page border border-black p-6 relative bg-white mx-auto font-mono text-sm">
        
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="text-xl font-bold tracking-wider text-center w-full uppercase">{settings.companyName}</div>
          <div className="text-center w-full mt-1">{settings.companyAddress}</div>
          <div className="text-center w-full">{settings.companyCity}</div>
          <div className="flex justify-center gap-4 w-full mt-1">
            <div className="flex gap-2 font-semibold"><span>IT PAN :</span><span className="font-normal">{settings.companyPan}</span></div>
            <div className="flex gap-2 font-semibold"><span>Phone :</span><span className="font-normal">{settings.companyContact}</span></div>
            <div className="flex gap-2 font-semibold"><span>E-Mail :</span><span className="font-normal">{settings.companyEmail}</span></div>
          </div>
        </div>

        {/* Ledger Info */}
        <div className="flex justify-between items-end mb-4 border-b border-black border-dashed pb-2">
          <div>
            <div className="flex gap-2">
              <span>Ledger Account :</span>
              <span className="font-bold">{selectedParty ? selectedParty.name : 'NO CUSTOMER SELECTED'}</span>
            </div>
            {selectedParty && <div className="text-xs text-muted-foreground mt-1">Address: {selectedParty.address} | Phone: {selectedParty.phone}</div>}
          </div>
          <div className="text-right">
            <div>{new Date(fromDate).toLocaleDateString('en-GB')} - {new Date(toDate).toLocaleDateString('en-GB')}</div>
            <div>Page No.: 1</div>
          </div>
        </div>

        {/* Period Summary */}
        {selectedPartyId && (
          <div className="flex justify-between border-b border-black border-dashed pb-4 mb-4">
            <div>
              <p className="font-bold underline mb-1">Period Summary</p>
              <p>Total Sales (Debit): <span className="font-bold">₹ {filteredHistory.reduce((sum, h) => sum + (h.debit || 0), 0).toFixed(2)}</span></p>
              <p>Total Business/Receipts (Credit): <span className="font-bold">₹ {filteredHistory.reduce((sum, h) => sum + (h.credit || 0), 0).toFixed(2)}</span></p>
            </div>
            <div className="text-right">
              <p className="font-bold underline mb-1">Balance Summary</p>
              <p>Opening Balance: <span className="font-bold">₹ {Math.abs(balanceBeforePeriod).toFixed(2)} {balanceBeforePeriod >= 0 ? 'Dr' : 'Cr'}</span></p>
              <p>Closing Balance: <span className="font-bold">₹ {Math.abs(finalBalance).toFixed(2)} {finalBalance >= 0 ? 'Dr' : 'Cr'}</span></p>
            </div>
          </div>
        )}

        {/* Table */}
        <table className="w-full text-left whitespace-pre">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="py-2 font-normal w-24">Date</th>
              <th className="py-2 font-normal w-16 text-center">V No.</th>
              <th className="py-2 font-normal">Particulars</th>
              <th className="py-2 font-normal text-right w-28">Debit</th>
              <th className="py-2 font-normal text-right w-28">Credit</th>
              <th className="py-2 font-normal text-right w-36">Balance</th>
            </tr>
          </thead>
          <tbody>
            {selectedPartyId ? (
              entries.map((entry, i) => (
                <tr key={i}>
                  <td className="py-1">{entry.date}</td>
                  <td className="py-1 text-center">{entry.vNo || '-'}</td>
                  <td className="py-1">{entry.particulars}</td>
                  <td className="py-1 text-right">{entry.debit ? entry.debit.toFixed(2) : ''}</td>
                  <td className="py-1 text-right">{entry.credit ? entry.credit.toFixed(2) : ''}</td>
                  <td className="py-1 text-right">{entry.balance !== undefined ? `${Math.abs(entry.balance).toFixed(2)} ${entry.balance >= 0 ? 'Dr' : 'Cr'}` : '0.00'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Please select a customer from the dropdown above to view their statement.
                </td>
              </tr>
            )}
          </tbody>
          {selectedPartyId && (
            <tfoot>
              <tr className="border-t border-b border-black border-dashed font-bold">
                <td className="py-2">Total</td>
                <td></td>
                <td></td>
                <td className="py-2 text-right">{totalDebit.toFixed(2)}</td>
                <td className="py-2 text-right">{totalCredit.toFixed(2)}</td>
                <td className="py-2 text-right">{Math.abs(finalBalance).toFixed(2)} {finalBalance >= 0 ? 'Dr' : 'Cr'}</td>
              </tr>
            </tfoot>
          )}
        </table>

      </div>
    </div>
  );
}
