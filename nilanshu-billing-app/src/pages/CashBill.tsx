import React, { useState } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';

export default function CashBill() {
  const { settings, updateSettings, createBill, parties, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState('');
  const [memoNo, setMemoNo] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toLocaleDateString('en-GB'));
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  const handlePartyLookup = (val: string) => {
    setPartyName(val);
    const foundParty = parties.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (foundParty) {
      setPartyName(foundParty.name);
      setPartyId(foundParty.id);
    } else {
      setPartyId(null);
    }
  };

  // Calculate totals
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
  const discountTotal = items.reduce((sum, item) => sum + ((item.mrp * item.quantity) - item.amount), 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const roundOff = Math.round(totalAmount) - totalAmount;
  const grandTotal = Math.round(totalAmount);

  const handleSave = async () => {
    if (items.length === 0) {
      showDialog({ title: 'Validation Error', message: 'Please add at least one item.', type: 'alert' });
      return;
    }
    if (!memoNo) {
      showDialog({ title: 'Validation Error', message: 'Please enter a Memo No.', type: 'alert' });
      return;
    }
    
    try {
      await createBill({
        type: 'cash',
        billNumber: memoNo,
        partyId: partyId,
        subtotal: mrpTotal,
        discount: discountTotal,
        total: grandTotal,
        lineItems: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          mrp: i.mrp,
          discountPercent: i.discountPercent,
          amount: i.amount,
        }))
      });
      showDialog({ title: 'Success', message: 'Bill saved successfully!', type: 'alert' });
      setItems([]);
      setMemoNo('');
    } catch (err) {
      showDialog({ title: 'Save Failed', message: 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Cash Memo</h2>
        <div className="flex gap-4">
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Save to Database</button>
          <button onClick={() => setShowPaidStamp(!showPaidStamp)} className="border border-red-500 text-red-500 px-4 py-2 rounded hover:bg-red-50">Toggle Stamp</button>
          <button onClick={() => window.print()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">Print Bill</button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="a4-page relative flex flex-col p-8 pt-10 bg-white">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <input value={settings.companyName} onChange={e => updateSettings({companyName: e.target.value})} placeholder="Company Name" className="text-3xl font-bold uppercase tracking-wide text-center w-full outline-none bg-transparent" />
          <input value={settings.companyAddress} onChange={e => updateSettings({companyAddress: e.target.value})} placeholder="Address Line 1" className="text-sm mt-1 text-center w-full outline-none bg-transparent" />
          <input value={settings.companyCity} onChange={e => updateSettings({companyCity: e.target.value})} placeholder="City & Pin" className="text-sm text-center w-full outline-none bg-transparent" />
          <div className="flex gap-2 text-sm justify-center w-full">
             <span className="flex items-center justify-end w-1/2 pr-1">Phone: <input value={settings.companyContact} onChange={e => updateSettings({companyContact: e.target.value})} className="outline-none bg-transparent w-[90px] ml-1" placeholder="Phone" /></span>
             <span>|</span>
             <span className="flex items-center justify-start w-1/2 pl-4">Email: <input value={settings.companyEmail} onChange={e => updateSettings({companyEmail: e.target.value})} className="outline-none bg-transparent w-48 ml-1" placeholder="Email" /></span>
          </div>
        </div>

        {/* Thick Divider */}
        <div className="h-1 bg-black w-full my-4"></div>

        {/* Bill Meta */}
        <div className="flex justify-between items-start mb-4 text-sm">
          <div className="flex items-center gap-2 mt-2">
            <span className="font-semibold whitespace-nowrap">Party Name :</span>
            <input 
              list="party-names"
              type="text" 
              value={partyName} 
              onChange={e => handlePartyLookup(e.target.value)} 
              className="outline-none w-64 bg-transparent font-bold uppercase"
              placeholder="CASH CUSTOMER"
            />
            <datalist id="party-names">
              {parties.map(p => <option key={p.id} value={p.name}>{p.phone}</option>)}
            </datalist>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="font-bold border border-black px-6 py-1 text-lg mb-1">
              CASH MEMO
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase text-xs">CASH MEMO NO:</span>
              <input value={memoNo} onChange={e => setMemoNo(e.target.value)} className="outline-none w-48 bg-transparent text-right text-xs" placeholder="CSH-178..." />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Date :</span>
              <input value={billDate} onChange={e => setBillDate(e.target.value)} className="outline-none w-24 bg-transparent text-right font-bold text-xs" placeholder="7/8/2026" />
            </div>
          </div>
        </div>

        {/* Line Items Table wrapper */}
        <div className="flex-1 border border-black border-b-0 relative z-10 flex flex-col mt-2">
          <BillEngine 
            items={items} 
            onChange={setItems} 
            columns={['sno', 'qty', 'name', 'mrp', 'discount', 'amount']}
          />
        </div>

        {/* Bottom Section */}
        <div className="flex border border-black text-sm z-10 bg-white relative">
          {/* Left Half */}
          <div className="w-[60%] border-r border-black p-3 flex flex-col justify-between">
            <div>
              <p className="font-bold underline mb-1 text-xs">Bank Details:</p>
              <div className="flex items-center gap-2 text-xs mb-1"><span className="font-semibold whitespace-nowrap flex-shrink-0">Bank Name:</span><input value={settings.bankName} onChange={e => updateSettings({bankName: e.target.value})} className="outline-none bg-transparent w-full" placeholder="Bank Name" /></div>
              <div className="flex items-center gap-2 text-xs"><span className="font-semibold whitespace-nowrap flex-shrink-0">A/c No:</span><input value={settings.bankAccountNo} onChange={e => updateSettings({bankAccountNo: e.target.value})} className="outline-none bg-transparent w-full" placeholder="A/c No" /> <span className="font-semibold whitespace-nowrap flex-shrink-0">IFSC Code:</span><input value={settings.bankIfsc} onChange={e => updateSettings({bankIfsc: e.target.value})} className="outline-none bg-transparent w-full" placeholder="IFSC Code" /></div>
            </div>
            
            <div className="mt-8">
              <p className="font-bold text-xs">**THANKING YOU VISIT AGAIN**</p>
              <p className="italic text-xs mt-2">*Rupees {numberToWords(grandTotal)} Only*</p>
            </div>
          </div>
          
          {/* Right Half */}
          <div className="w-[40%] flex flex-col relative">
            {showPaidStamp && (
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -rotate-12 text-red-500 border-4 border-red-500 rounded-full w-32 h-32 flex items-center justify-center opacity-30 pointer-events-none z-50">
                <span className="text-3xl font-bold uppercase tracking-widest">PAID</span>
              </div>
            )}
            <div className="flex justify-between border-b border-black p-2 font-bold text-xs">
              <span>MRP TOTAL</span>
              <span>{mrpTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-xs">
              <span>Discount</span>
              <span>{discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-xs">
              <span>Round Off</span>
              <span>{roundOff.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 font-bold text-lg">
              <span>GRAND TOTAL</span>
              <span>{grandTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex-1 p-2 flex flex-col items-end justify-between min-h-[80px]">
              <div className="flex gap-1 text-xs justify-end w-full"><span>For</span><input value={settings.companyName} readOnly className="font-bold outline-none bg-transparent flex-1 text-right" /></div>
              <div className="text-xs">Authorised Signatory</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
