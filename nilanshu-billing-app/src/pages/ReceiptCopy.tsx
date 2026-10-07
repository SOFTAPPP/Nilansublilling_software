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
  const [buyerMob, setBuyerMob] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
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
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target as Node)) {
        setPaymentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(customerName.toLowerCase()) ||
    p.phone.includes(customerName)
  );

  const selectedParty = partyId ? parties.find(p => p.id === partyId) : null;
  const partyOutstanding = selectedParty?.outstandingBalance || 0;

  const selectParty = (party: typeof parties[0]) => {
    setCustomerName(party.name);
    setPartyId(party.id);
    
    let parsedAddress = party.address || '';
    let parsedDistrict = '';
    let parsedPlace = parsedAddress.split('|')[0].trim();
    if (parsedPlace.endsWith(',')) {
      parsedPlace = parsedPlace.slice(0, -1).trim();
    }
    
    const distMatch = parsedAddress.match(/ \| Dist: (.*)(?= \| PIN:| \| State:|$)/);
    // Alternatively, simpler regex:
    const distMatch2 = parsedAddress.match(/ \| Dist: (.*?)(?= \| PIN:| \| State:|$)/);
    if (distMatch2) {
      parsedDistrict = distMatch2[1].trim();
    } else {
       const distMatch3 = parsedAddress.match(/ \| Dist: (.*)$/);
       if (distMatch3) parsedDistrict = distMatch3[1].trim();
    }
    
    setDistrict(parsedDistrict);
    setPlace(parsedPlace);
    setBuyerMob(party.phone || '');
    setPartyDropdownOpen(false);
  };

  const doSaveReceipt = () => {
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
    } catch (err: any) {
      showDialog({ title: 'Error', message: err.message || 'Failed to save receipt', type: 'alert' });
    }
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

    // Guard: warn if receipt amount exceeds what the customer actually owes
    if (partyId && amount > partyOutstanding) {
      const advanceAmount = amount - Math.max(partyOutstanding, 0);
      if (partyOutstanding <= 0) {
        // Customer owes nothing or already has advance
        showDialog({
          title: '⚠️ Warning: No Outstanding Dues',
          message: `${customerName} has NO outstanding dues (current balance: ₹${partyOutstanding.toFixed(2)}).\n\nThis receipt of ₹${amount.toLocaleString()} will create an ADVANCE of ₹${(Math.abs(partyOutstanding) + amount).toLocaleString()}.\n\nAre you sure?`,
          type: 'confirm',
          confirmText: 'Yes, Save Anyway',
          cancelText: 'Cancel',
          onConfirm: doSaveReceipt
        });
      } else {
        // Customer owes something but receipt is more than that
        showDialog({
          title: '⚠️ Warning: Receipt Exceeds Outstanding',
          message: `${customerName} only owes ₹${partyOutstanding.toLocaleString()}, but you are creating a receipt for ₹${amount.toLocaleString()}.\n\nThis will create an ADVANCE of ₹${advanceAmount.toLocaleString()}.\n\nAre you sure?`,
          type: 'confirm',
          confirmText: 'Yes, Save Anyway',
          cancelText: 'Cancel',
          onConfirm: doSaveReceipt
        });
      }
      return;
    }

    doSaveReceipt();
  };

  const handleNew = () => {
    setCustomerName('');
    setPartyId(null);
    setAmount(0);
    setChequeNo('');
    setPlace('');
    setDistrict('');
    setBuyerMob('');
    setPaymentMode('Cash');
    getNextBillNumber('RCP-').then(setReceiptNo);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendSMS = async () => {
    if (!buyerMob) {
      showDialog({ title: 'Missing Info', message: "Please enter customer's mobile number first.", type: 'alert' });
      return;
    }
    if (amount <= 0) {
      showDialog({ title: 'Missing Info', message: "Please enter a valid amount.", type: 'alert' });
      return;
    }
    try {
      const cleanPhone = buyerMob.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) throw new Error('Invalid phone number format');

      const { formatReceiptMessage } = await import('../utils/smsFormatter');
      const smsData = {
        companyName: settings.companyName || 'NILANSU PUBLICATION',
        receiptNo: receiptNo,
        buyerName: customerName,
        amount: amount,
        paymentMode: paymentMode + (paymentMode === 'Cheque' && chequeNo ? ` (${chequeNo})` : ''),
        date: receiptDate,
      };
      const message = formatReceiptMessage(smsData);

      const baseUrl = import.meta.env.VITE_API_URL || 'http://72.61.231.155:5004/api';
      const response = await fetch(`${baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message })
      });
      
      if (response.ok) {
        showDialog({ title: 'SMS Sent', message: `SMS sent to ${customerName} at +91 ${cleanPhone} successfully!`, type: 'alert' });
      } else {
        const errorData = await response.json();
        const serverMsg = errorData.details?.message || errorData.error || 'Failed to send SMS';
        throw new Error(serverMsg);
      }
    } catch (err: any) {
      console.error(err);
      showDialog({ title: 'SMS Failed', message: err.message, type: 'alert' });
    }
  };

  const receiptContent = (copyLabel: string) => (
    <div className="border-2 border-blue-500 print:border-blue-800 p-6 bg-card text-foreground print:bg-white print:text-black" style={{ width: '100%', fontFamily: 'serif' }}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          <span className="text-base text-blue-500 print:text-blue-800 font-bold italic">{copyLabel}</span>
        </div>
        <div className="text-right text-lg flex items-center gap-2">
          <span className="font-bold">No. </span>
          <span className="border-b border-blue-500 print:border-blue-800 font-bold text-blue-500 print:text-blue-800 flex">
             <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} className="bg-transparent outline-none w-24 p-0 border-none h-6 text-blue-500 print:text-blue-800 print:appearance-none text-right font-bold" />
          </span>
        </div>
      </div>

      <div className="text-center mb-3">
        <input 
          value={settings.companyName || 'NILANSU PUBLICATION'}
          onChange={e => updateSettings({ companyName: e.target.value })}
          className="text-2xl font-black text-blue-500 print:text-blue-900 tracking-wide bg-transparent outline-none text-center w-full" 
          style={{ fontFamily: 'serif' }}
        />
        <p className="text-sm font-medium text-blue-500 print:text-blue-800">34, BENIATOLA LANE, KOLKATA-700009</p>
        <p className="text-sm font-medium text-blue-500 print:text-blue-800">Mob. : {settings.companyContact}</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-baseline gap-2 relative" ref={partyDropdownRef}>
          <span className="whitespace-nowrap font-semibold">Received with thanks from</span>
          <span className="flex-1 border-b border-dotted border-blue-500 print:border-blue-800 text-blue-500 print:text-blue-900 font-bold px-1 relative flex">
             <input type="text" placeholder="Search by name..." value={customerName} onChange={e => { setCustomerName(e.target.value); setPartyDropdownOpen(true); setPartyId(null); }} onFocus={() => setPartyDropdownOpen(true)} className="bg-transparent outline-none w-full p-0 border-none h-6 text-blue-500 print:text-blue-900 print:appearance-none font-bold text-lg print:font-bold print:text-lg placeholder:text-blue-500/50" />
             {partyDropdownOpen && filteredParties.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full md:w-[400px] bg-card border border-border shadow-xl rounded-lg z-50 max-h-48 overflow-y-auto no-print font-normal text-foreground">
                  {filteredParties.map(p => (
                    <button key={p.id} onClick={() => selectParty(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-primary/10 transition-colors">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
          </span>
        </div>

        {/* Show selected party's outstanding balance as a helper */}
        {partyId && selectedParty && (
          <div className={`text-xs mt-1 font-semibold no-print ${partyOutstanding > 0 ? 'text-red-500' : partyOutstanding < 0 ? 'text-orange-500' : 'text-green-500'}`}>
            {partyOutstanding > 0
              ? `⚠ Outstanding dues: ₹${partyOutstanding.toLocaleString()}`
              : partyOutstanding < 0
                ? `⚠ Already has advance: ₹${Math.abs(partyOutstanding).toLocaleString()}`
                : `✓ No outstanding dues`}
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-semibold">Rs.</span>
          <span className="flex-1 border-b border-dotted border-blue-500 print:border-blue-800 text-blue-500 print:text-blue-900 font-bold px-1 flex items-center">
             ₹
             <input type="number" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} className="bg-transparent outline-none w-32 p-0 border-none h-6 mx-2 text-blue-500 print:text-blue-900 print:appearance-none font-bold text-lg print:font-bold print:text-lg" placeholder="0" />
             /- ({amount > 0 ? `${numberToWords(amount)} only` : ''})
          </span>
        </div>

        <div className="flex items-baseline gap-2 relative" ref={paymentDropdownRef}>
          <span className="whitespace-nowrap font-semibold">by</span>
          <div className="relative inline-block border-b border-dotted border-blue-500 print:border-blue-800 text-blue-500 print:text-blue-900 font-bold cursor-pointer" onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}>
            {paymentMode}
            {paymentDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-card border shadow-xl z-50 rounded-lg overflow-hidden text-sm no-print font-normal text-foreground">
                {['Cash', 'Cheque'].map((mode) => (
                  <div key={mode} className="px-4 py-2 hover:bg-muted cursor-pointer transition-colors" onClick={() => { setPaymentMode(mode as 'Cash' | 'Cheque'); setPaymentDropdownOpen(false); }}>
                    {mode}
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="whitespace-nowrap font-semibold">/ Cheque No.</span>
          <span className="flex-1 border-b border-dotted border-blue-500 print:border-blue-800 text-blue-500 print:text-blue-900 font-bold px-1 flex">
            <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-5 text-blue-500 print:text-blue-900 print:appearance-none font-bold" />
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-bold w-32 shrink-0">Place</span>
          <span className="border-b border-dashed border-blue-500 print:border-blue-800 flex-1 flex">
             <input type="text" value={place} onChange={e => setPlace(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-6 text-blue-500 print:text-blue-800 print:appearance-none font-bold text-lg print:font-bold print:text-lg" />
          </span>
          <span className="font-bold w-12 shrink-0">Dist.</span>
          <span className="border-b border-dashed border-blue-500 print:border-blue-800 flex-1 flex">
             <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-6 text-blue-500 print:text-blue-800 print:appearance-none font-bold text-lg print:font-bold print:text-lg" />
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-bold w-32 shrink-0">on the date</span>
          <span className="border-b border-dashed border-blue-500 print:border-blue-800 flex-1 font-medium text-blue-500 print:text-blue-800 flex">
             <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="bg-transparent outline-none w-40 p-0 border-none h-6 text-blue-500 print:text-blue-800 print:appearance-none font-bold text-lg print:font-bold print:text-lg" />
          </span>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-end">
        <div className="text-xs font-bold text-blue-500 print:text-blue-800">NILANSU PUBLICATION</div>
        <div className="w-48 text-center text-xs font-bold border-t border-blue-500 print:border-blue-800 pt-1">
          Prop. Signature with SEAL
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Payment Receipt</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="text" 
            placeholder="Mobile for SMS" 
            value={buyerMob} 
            onChange={e => setBuyerMob(e.target.value)} 
            className="border border-border px-3 py-2 rounded-lg text-sm bg-background w-32"
          />
          <button onClick={handleSendSMS} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors">Send SMS</button>
          <button onClick={handleNew} className="bg-gray-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-600 transition-colors">New</button>
          <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm">Save</button>
          <button onClick={handlePrint} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-bold text-sm">Print</button>
        </div>
      </div>

      {/* Printable Receipt - Single copy */}
      <div className="print:block" style={{ pageBreakInside: 'avoid' }}>
        <div className="w-[210mm] print:w-[190mm] print:my-4 mx-auto space-y-6 print:space-y-4">
          {receiptContent('')}
        </div>
      </div>
    </div>
  );
}
