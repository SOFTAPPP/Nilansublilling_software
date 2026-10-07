import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getLocalDateString } from '../utils/dateUtils';
import { getNextBillNumber } from '../utils/billNumber';
import { numberToWords } from '../utils/numberToWords';

export default function Voucher({ viewBill }: { viewBill?: any }) {
  const { parties, settings, updateSettings, createBill, showDialog } = useStore();
  const [voucherNo, setVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState(() => getLocalDateString());
  const [payTo, setPayTo] = useState('');
  const [address, setAddress] = useState('');
  const [debitors, setDebitors] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [chequeNo, setChequeNo] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Cheque'>('Cash');
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNextBillNumber('VCH-').then(setVoucherNo);
  }, []);

  useEffect(() => {
    if (viewBill) {
      setVoucherNo(viewBill.billNumber || '');
      setVoucherDate(getLocalDateString(viewBill.date));
      setAmount(viewBill.total || 0);
      if (viewBill.partyId) {
        setPartyId(viewBill.partyId);
        const p = parties.find(p => p.id === viewBill.partyId);
        if (p) {
          setPayTo(p.name);
          setAddress(p.address.split('|')[0].trim());
        }
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
    p.name.toLowerCase().includes(payTo.toLowerCase()) ||
    p.phone.includes(payTo)
  );

  const selectParty = (party: typeof parties[0]) => {
    setPayTo(party.name);
    setAddress(party.address.split('|')[0].trim());
    setPartyId(party.id);
    setPartyDropdownOpen(false);
  };

  const handleSave = () => {
    if (!payTo) {
      showDialog({ title: 'Validation', message: 'Please enter "Pay to" name.', type: 'alert' });
      return;
    }
    if (amount <= 0) {
      showDialog({ title: 'Validation', message: 'Please enter a valid amount.', type: 'alert' });
      return;
    }

    try {
      createBill({
        type: 'voucher',
        billNumber: voucherNo,
        partyId: partyId,
        subtotal: amount,
        discount: 0,
        cgst: 0,
        sgst: 0,
        total: amount,
        status: 'completed',
        date: voucherDate,
        lineItems: [],
      }).catch(err => {
        showDialog({ title: 'Error', message: err.message || 'Failed to save voucher', type: 'alert' });
      });

      showDialog({ title: 'Success', message: 'Voucher saved successfully!', type: 'alert' });

      // Removed automatic reset so user can print after saving.
    } catch (err: any) {
      showDialog({ title: 'Error', message: err.message || 'Failed to save voucher', type: 'alert' });
    }
  };

  const handleNew = () => {
    setPayTo('');
    setAddress('');
    setPartyId(null);
    setDebitors('');
    setAmount(0);
    setChequeNo('');
    getNextBillNumber('VCH-').then(setVoucherNo);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Voucher</h2>
        <div className="flex gap-3">
          <button onClick={handleNew} className="bg-gray-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-600 transition-colors">New Voucher</button>
          <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm">Save Voucher</button>
          <button onClick={handlePrint} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-bold text-sm">Print Voucher</button>
        </div>
      </div>

      <div className="print:block" style={{ pageBreakInside: 'avoid' }}>
        <div className="w-[210mm] print:w-[190mm] print:my-4 mx-auto bg-card text-foreground print:bg-white print:text-black p-8 border-2 border-foreground print:border-gray-800" style={{ fontFamily: 'serif' }}>
          {/* Top Company Header */}
          <div className="text-center flex flex-col items-center relative p-2 border-b-2 border-black print:border-black dark:border-white">
            <img src="/logo.png" alt="Logo" className="absolute left-2 top-2 w-20 h-20 object-contain" />
            <input 
              value={settings.companyName || 'NILANSU PUBLICATION'} 
              onChange={e => updateSettings({ companyName: e.target.value })} 
              className="text-4xl font-bold uppercase tracking-wide text-center w-full bg-transparent outline-none border-none hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5 transition-colors print:hover:bg-transparent text-foreground print:text-black" 
            />
            <div className="text-base mt-1 text-center w-full text-foreground print:text-black">{settings.companyAddress}</div>
            <div className="text-base text-center w-full text-foreground print:text-black">{settings.companyCity}</div>
            <div className="flex gap-2 text-base justify-center w-full items-center mt-1 text-foreground print:text-black">
              <span className="flex items-center whitespace-nowrap font-semibold">IT PAN: <span className="ml-1 uppercase font-normal">{settings.companyPan}</span></span>
              <span className="text-gray-400">|</span>
              <span className="flex items-center whitespace-nowrap font-semibold">Phone: <span className="ml-1 font-normal">{settings.companyContact}</span></span>
              <span className="text-gray-400">|</span>
              <span className="flex items-center whitespace-nowrap font-semibold">Email: <span className="ml-1 font-normal">{settings.companyEmail}</span></span>
            </div>
          </div>

          <div className="flex justify-between items-center my-4 px-2">
            <div className="flex-1"></div>
            <div className="text-2xl font-bold tracking-[0.3em] uppercase text-gray-800 text-center flex-1">
              VOUCHER
            </div>
            <div className="text-right text-base flex justify-end items-center gap-2 flex-1">
              <span className="font-bold text-lg">Date: </span>
              <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} className="border-b border-foreground print:border-gray-800 px-2 bg-transparent outline-none w-36 font-bold text-lg print:appearance-none text-foreground print:text-black cursor-pointer" />
            </div>
          </div>

          <div className="space-y-4 text-[14px] mt-8">
            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">No.</span>
              <span className="border-b border-dotted border-foreground print:border-transparent flex-1 px-2 font-bold flex">
                <input type="text" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} className="bg-transparent outline-none w-full font-bold p-0 border-none h-6 text-lg print:text-lg text-foreground print:text-black print:appearance-none" />
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">Debitors</span>
              <span className="border-b border-dotted border-foreground print:border-transparent flex-1 px-2 flex">
                <input type="text" value={debitors} onChange={e => setDebitors(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-6 text-lg font-bold print:font-bold print:text-lg text-foreground print:text-black print:appearance-none" />
              </span>
            </div>

            <div className="flex items-baseline gap-3 relative" ref={partyDropdownRef}>
              <span className="whitespace-nowrap font-bold">Pay to</span>
              <span className="border-b border-dotted border-foreground print:border-transparent flex-1 px-2 relative flex">
                <input type="text" placeholder="Search by name..." value={payTo} onChange={e => { setPayTo(e.target.value); setPartyDropdownOpen(true); setPartyId(null); }} onFocus={() => setPartyDropdownOpen(true)} className="bg-transparent outline-none w-full p-0 border-none h-6 text-lg font-bold print:font-bold print:text-lg text-foreground print:text-black print:appearance-none placeholder:text-muted-foreground/50" />
                {partyDropdownOpen && filteredParties.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full md:w-[400px] bg-card border border-border shadow-xl rounded-lg z-50 max-h-48 overflow-y-auto no-print">
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

            <div className="flex items-start gap-3">
              <span className="whitespace-nowrap font-bold mt-0.5">Address</span>
              <div className="flex-1 min-w-0">
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={(address.length > 55 || address.includes('\n')) ? 2 : 1} className="bg-transparent outline-none w-full p-0 border-b border-dotted border-foreground print:border-transparent h-auto text-lg font-bold text-foreground resize-none overflow-y-auto leading-tight print:hidden" />
                <div className="hidden print:block w-full text-black font-bold text-lg leading-tight whitespace-pre-wrap break-words">{address}</div>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">Rupees in words :</span>
              <span className="border-b border-dotted border-foreground print:border-transparent flex-1 px-2 text-lg font-bold print:font-bold print:text-lg">
                {amount > 0 ? `${numberToWords(amount)} only` : ''}
              </span>
            </div>

            <div className="flex items-baseline gap-3 relative" ref={paymentDropdownRef}>
              <span className="whitespace-nowrap font-bold">by</span>
              <div className="relative inline-block border-b border-dotted border-foreground print:border-transparent text-foreground print:text-black font-bold text-lg print:font-bold print:text-lg cursor-pointer" onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}>
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
              {paymentMode === 'Cheque' ? (
                <>
                  <span className="whitespace-nowrap font-bold">/ Cheque No. :</span>
                  <span className="border-b border-dotted border-foreground print:border-transparent flex-1 px-2 flex">
                    <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-6 text-lg font-bold print:font-bold print:text-lg text-foreground print:text-black print:appearance-none" />
                  </span>
                </>
              ) : (
                <span className="border-b border-dotted border-foreground print:border-transparent flex-1 px-2 flex"></span>
              )}
            </div>
          </div>

          {/* Amount Box */}
          <div className="flex items-center gap-4 mt-8">
            <div className="border-2 border-foreground print:border-gray-800 px-6 py-3">
              <span className="text-3xl font-black">Rs.</span>
            </div>
            <div className="border-2 border-foreground print:border-gray-800 px-6 py-3 flex-1 flex items-center justify-center relative">
               <span className="text-2xl font-black absolute left-6 text-foreground print:text-black">₹</span>
               <input type="number" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} className="text-2xl font-black bg-transparent outline-none w-48 text-center text-foreground print:text-black border-none p-0 print:appearance-none" placeholder="0" />
               <span className="text-2xl font-black absolute right-6 text-foreground print:text-black">/-</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end mt-12 pt-4">
            <div className="text-center">
              <p className="border-t border-foreground print:border-gray-800 pt-2 text-sm font-semibold px-8">Payment Received</p>
            </div>
            <div className="text-center">
              <p className="border-t border-foreground print:border-gray-800 pt-2 text-sm font-semibold px-8">Seal with Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
