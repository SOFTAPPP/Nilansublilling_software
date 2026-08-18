import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getLocalDateString } from '../utils/dateUtils';
import { getNextBillNumber } from '../utils/billNumber';
import { numberToWords } from '../utils/numberToWords';

export default function ReceiptCopy({ viewBill }: { viewBill?: any }) {
  const { parties, settings, updateSettings, createBill, showDialog } = useStore();
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => getLocalDateString());
  const [customerName, setCustomerName] = useState('');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Cheque'>('Cash');
  const [chequeNo, setChequeNo] = useState('');
  const [place, setPlace] = useState('');
  const [district, setDistrict] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNextBillNumber('RCP-').then(setReceiptNo);
  }, []);

  useEffect(() => {
    if (viewBill) {
      setReceiptNo(viewBill.billNumber || '');
      setReceiptDate(getLocalDateString(viewBill.date));
      setAmount(viewBill.total || 0);
      if (viewBill.partyId) {
        setPartyId(viewBill.partyId);
        const p = parties.find(p => p.id === viewBill.partyId);
        if (p) setCustomerName(p.name);
      }
    }
  }, [viewBill, parties]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(customerName.toLowerCase()) ||
    p.phone.includes(customerName)
  );

  const selectParty = (party: typeof parties[0]) => {
    setCustomerName(party.name);
    setPartyId(party.id);
    setPartyDropdownOpen(false);
  };

  const handleSave = () => {
    if (!customerName) {
      showDialog({ title: 'Validation', message: 'Please enter customer name.', type: 'alert' });
      return;
    }
    if (amount <= 0) {
      showDialog({ title: 'Validation', message: 'Please enter a valid amount.', type: 'alert' });
      return;
    }

    try {
      createBill({
        type: 'receipt',
        billNumber: receiptNo,
        partyId: partyId,
        subtotal: amount,
        discount: 0,
        cgst: 0,
        sgst: 0,
        total: amount,
        status: 'completed',
        date: receiptDate,
        lineItems: [],
      }).catch(err => {
        showDialog({ title: 'Error', message: err.message || 'Failed to save receipt', type: 'alert' });
      });

      showDialog({ title: 'Success', message: 'Receipt saved successfully!', type: 'alert' });

      // Reset
      setCustomerName('');
      setPartyId(null);
      setAmount(0);
      setChequeNo('');
      setPlace('');
      setDistrict('');
      setPaymentMode('Cash');
      getNextBillNumber('RCP-').then(setReceiptNo);
    } catch (err: any) {
      showDialog({ title: 'Error', message: err.message || 'Failed to save receipt', type: 'alert' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const receiptContent = (copyLabel: string) => (
    <div className="border-2 border-blue-800 p-6 bg-white text-black" style={{ width: '100%', fontFamily: 'serif' }}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-[10px] text-blue-800 font-bold italic">{copyLabel}</span>
        </div>
        <div className="text-right text-[11px]">
          <span className="font-bold">No. </span>
          <span className="border-b border-blue-800 px-2 font-bold text-blue-800">{receiptNo}</span>
        </div>
      </div>

      <div className="text-center mb-3">
        <input 
          value={settings.companyName || 'NILANSU PUBLICATION'}
          onChange={e => updateSettings({ companyName: e.target.value })}
          className="text-2xl font-black text-blue-900 tracking-wide bg-transparent outline-none text-center w-full" 
          style={{ fontFamily: 'serif' }}
        />
        <p className="text-[11px] text-blue-800">34, BENIATOLA LANE, KOLKATA-700009</p>
        <p className="text-[11px] text-blue-800">Mob. : {settings.companyContact}</p>
      </div>

      <div className="space-y-3 text-[13px]">
        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-semibold">Received with thanks from</span>
          <span className="flex-1 border-b border-dotted border-blue-800 text-blue-900 font-bold px-1">{customerName || ''}</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-semibold">Rs.</span>
          <span className="flex-1 border-b border-dotted border-blue-800 text-blue-900 font-bold px-1">
            {amount > 0 ? `₹ ${amount.toLocaleString('en-IN')} /- (${numberToWords(amount)} only)` : ''}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-semibold">by {paymentMode} / Cheque No.</span>
          <span className="flex-1 border-b border-dotted border-blue-800 text-blue-900 font-bold px-1">{chequeNo || ''}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap font-semibold">Place</span>
            <span className="flex-1 border-b border-dotted border-blue-800 text-blue-900 font-bold px-1">{place || ''}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap font-semibold">Dist.</span>
            <span className="flex-1 border-b border-dotted border-blue-800 text-blue-900 font-bold px-1">{district || ''}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-semibold">on the date</span>
          <span className="flex-1 border-b border-dotted border-blue-800 text-blue-900 font-bold px-1">{receiptDate}</span>
        </div>
      </div>

      <div className="flex justify-between items-end mt-6 pt-4">
        <div className="text-center">
          <p className="text-xs text-blue-800 font-bold">{settings.companyName || 'NILANSU PUBLICATION'}</p>
        </div>
        <div className="text-center">
          <p className="border-t border-blue-800 pt-1 text-[11px] font-semibold px-6">Prop. Signature with Date</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Input Form - no-print */}
      <div className="no-print space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Payment Receipt</h1>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Receipt No.</label>
              <input
                type="text"
                value={receiptNo}
                onChange={e => setReceiptNo(e.target.value)}
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date</label>
              <input
                type="date"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm"
              />
            </div>
            <div className="relative" ref={partyDropdownRef}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Received From (Customer)</label>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={customerName}
                onChange={e => { setCustomerName(e.target.value); setPartyDropdownOpen(true); setPartyId(null); }}
                onFocus={() => setPartyDropdownOpen(true)}
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm"
              />
              {partyDropdownOpen && filteredParties.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border shadow-xl rounded-lg z-50 max-h-48 overflow-y-auto">
                  {filteredParties.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectParty(p)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-primary/10 transition-colors"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as 'Cash' | 'Cheque')}
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            {paymentMode === 'Cheque' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Cheque No.</label>
                <input
                  type="text"
                  value={chequeNo}
                  onChange={e => setChequeNo(e.target.value)}
                  className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Place</label>
              <input
                type="text"
                value={place}
                onChange={e => setPlace(e.target.value)}
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="w-full border border-border p-2.5 rounded-lg bg-muted/50 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold text-sm">
              Save Receipt
            </button>
            <button onClick={handlePrint} className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 font-bold text-sm">
              Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt - Single copy */}
      <div className="print:block" style={{ pageBreakInside: 'avoid' }}>
        <div className="w-[210mm] mx-auto space-y-6 print:space-y-4">
          {receiptContent('')}
        </div>
      </div>
    </div>
  );
}
