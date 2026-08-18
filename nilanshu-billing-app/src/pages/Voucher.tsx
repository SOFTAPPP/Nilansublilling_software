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
  const [debitors, setDebitors] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [chequeNo, setChequeNo] = useState('');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

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
        if (p) setPayTo(p.name);
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
    p.name.toLowerCase().includes(payTo.toLowerCase()) ||
    p.phone.includes(payTo)
  );

  const selectParty = (party: typeof parties[0]) => {
    setPayTo(party.name);
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

      // Reset
      setPayTo('');
      setPartyId(null);
      setDebitors('');
      setAmount(0);
      setChequeNo('');
      getNextBillNumber('VCH-').then(setVoucherNo);
    } catch (err: any) {
      showDialog({ title: 'Error', message: err.message || 'Failed to save voucher', type: 'alert' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Voucher</h2>
        <div className="flex gap-3">
          <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm">Save Voucher</button>
          <button onClick={handlePrint} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-bold text-sm">Print Voucher</button>
        </div>
      </div>

      <div className="print:block" style={{ pageBreakInside: 'avoid' }}>
        <div className="w-[210mm] print:w-[190mm] print:my-4 mx-auto bg-card text-foreground print:bg-white print:text-black p-8 border-2 border-foreground print:border-gray-800" style={{ fontFamily: 'serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-1">
            <div className="text-base font-medium">
              <p>34, Beniatola Lane, Kol - 9</p>
              <p>Cont - {settings.companyContact}</p>
            </div>
            <div className="text-right text-base flex items-center gap-2">
              <span className="font-bold">Date: </span>
              <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} className="border-b border-foreground print:border-gray-800 px-2 bg-transparent outline-none w-32 print:appearance-none text-foreground print:text-black" />
            </div>
          </div>

          <div className="text-center my-4">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-600 mb-1">VOUCHER</p>
            <input 
              value={settings.companyName || 'NILANSU PUBLICATION'}
              onChange={e => updateSettings({ companyName: e.target.value })}
              className="text-3xl font-black tracking-wide bg-transparent outline-none text-center w-full text-foreground print:text-black" 
              style={{ fontFamily: 'serif' }}
            />
            <p className="text-sm mt-1">34, BENIATOLA LANE, KOLKATA</p>
          </div>

          <div className="space-y-4 text-[14px] mt-8">
            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">No.</span>
              <span className="border-b border-dotted border-foreground print:border-gray-800 flex-1 px-2 font-bold flex">
                <input type="text" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} className="bg-transparent outline-none w-full font-bold p-0 border-none h-5 text-foreground print:text-black print:appearance-none" />
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">Debitors</span>
              <span className="border-b border-dotted border-foreground print:border-gray-800 flex-1 px-2 flex">
                <input type="text" value={debitors} onChange={e => setDebitors(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-5 text-foreground print:text-black print:appearance-none" />
              </span>
            </div>

            <div className="flex items-baseline gap-3 relative" ref={partyDropdownRef}>
              <span className="whitespace-nowrap font-bold">Pay to</span>
              <span className="border-b border-dotted border-foreground print:border-gray-800 flex-1 px-2 relative flex">
                <input type="text" placeholder="Search by name..." value={payTo} onChange={e => { setPayTo(e.target.value); setPartyDropdownOpen(true); setPartyId(null); }} onFocus={() => setPartyDropdownOpen(true)} className="bg-transparent outline-none w-full p-0 border-none h-5 text-foreground print:text-black print:appearance-none placeholder:text-muted-foreground/50" />
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

            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">Rupees in words :</span>
              <span className="border-b border-dotted border-foreground print:border-gray-800 flex-1 px-2">
                {amount > 0 ? `${numberToWords(amount)} only` : ''}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="whitespace-nowrap font-bold">Cheque No. :</span>
              <span className="border-b border-dotted border-foreground print:border-gray-800 flex-1 px-2 flex">
                <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)} className="bg-transparent outline-none w-full p-0 border-none h-5 text-foreground print:text-black print:appearance-none" />
              </span>
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
