import { useState, useEffect } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';
import { getLocalDateString } from '../utils/dateUtils';

export default function CashBill({ viewBill }: { viewBill?: any }) {
  const { settings, updateSettings, createBill, parties, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState('');
  const [memoNo, setMemoNo] = useState('CSH-');
  const [billDate, setBillDate] = useState(() => getLocalDateString());
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  useEffect(() => {
    if (viewBill) {
      setMemoNo(viewBill.billNumber || '');
      setBillDate(getLocalDateString(viewBill.date));
      if (viewBill.partyId) {
        setPartyId(viewBill.partyId);
        const p = parties.find(p => p.id === viewBill.partyId);
        setPartyName(p ? p.name : '');
      } else {
        setPartyName('Walk-in Customer');
      }
      if (viewBill.lineItems) {
        setItems(viewBill.lineItems.map((li: any) => ({
          ...li,
          mrp: li.mrp || li.rate,
          amount: li.amount,
          discountPercent: li.discountPercent || 0,
        })));
      }
    }
  }, [viewBill, parties]);

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
        date: billDate,
        subtotal: mrpTotal,
        discount: discountTotal,
        total: grandTotal,
        lineItems: items.map(i => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          mrp: i.mrp,
          discountPercent: i.discountPercent,
          amount: i.amount,
          rate: i.rate,
          hsn: i.hsn,
        }))
      });
      showDialog({ title: 'Success', message: 'Bill saved successfully!', type: 'alert' });
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message;
      showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Print Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Cash Memo</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <button onClick={handleSave} className="whitespace-nowrap bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors text-sm">
              Save to Database
            </button>
          )}
          <button onClick={() => setShowPaidStamp(!showPaidStamp)} className="whitespace-nowrap border border-green-600 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium shadow-sm transition-colors text-sm bg-white">
            Toggle Stamp
          </button>
          <button onClick={handlePrint} className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm">
            Print Bill
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="a4-page relative flex flex-col p-4 print:p-2 bg-white">
        
        {/* Stamps overlay */}
        {showPaidStamp && (
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-green-600 border-4 border-green-600 rounded-full w-48 h-48 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <span className="text-5xl font-bold uppercase tracking-widest">PAID</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <div className="text-3xl font-bold uppercase tracking-wide text-center w-full">{settings.companyName}</div>
          <div className="text-sm mt-1 text-center w-full">{settings.companyAddress}</div>
          <div className="text-sm text-center w-full">{settings.companyCity}</div>
          <div className="flex gap-2 text-sm justify-center w-full items-center mt-1">
            <span className="flex items-center whitespace-nowrap font-semibold">IT PAN: <span className="ml-1 uppercase font-normal">{settings.companyPan}</span></span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center whitespace-nowrap font-semibold">Phone: <span className="ml-1 font-normal">{settings.companyContact}</span></span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center whitespace-nowrap font-semibold">Email: <span className="ml-1 font-normal">{settings.companyEmail}</span></span>
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
            <div className="flex items-center gap-1 justify-end w-48">
              <span className="font-semibold uppercase text-xs mr-2">CASH MEMO NO:</span>
              <span className="text-xs">CSH-</span>
              <input value={memoNo.replace(/^CSH-/, '')} onChange={e => setMemoNo('CSH-' + e.target.value.replace(/^CSH-/, ''))} className="outline-none w-16 bg-transparent text-left font-bold text-xs" placeholder="178..." />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Date :</span>
              <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="outline-none w-24 bg-transparent text-right font-bold text-xs" />
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
              <div className="flex items-center gap-2 text-xs mb-1"><span className="font-semibold whitespace-nowrap flex-shrink-0">Bank Name:</span><input value={settings.bankName} onChange={e => updateSettings({ bankName: e.target.value })} className="outline-none bg-transparent w-full" placeholder="Bank Name" /></div>
              <div className="flex items-center gap-2 text-xs"><span className="font-semibold whitespace-nowrap flex-shrink-0">A/c No:</span><input value={settings.bankAccountNo} onChange={e => updateSettings({ bankAccountNo: e.target.value })} className="outline-none bg-transparent w-full" placeholder="A/c No" /> <span className="font-semibold whitespace-nowrap flex-shrink-0">IFSC Code:</span><input value={settings.bankIfsc} onChange={e => updateSettings({ bankIfsc: e.target.value })} className="outline-none bg-transparent w-full" placeholder="IFSC Code" /></div>
            </div>

            <div className="mt-8">
              <p className="font-bold text-xs">**THANKING YOU VISIT AGAIN**</p>
              <p className="italic text-xs mt-2">*Rupees {numberToWords(grandTotal)} Only*</p>
            </div>
          </div>

          {/* Right Half */}
          <div className="w-[40%] flex flex-col relative">
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
              <div className="flex gap-1 text-xs justify-end w-full"><span>For</span><div className="font-bold flex-1 text-right truncate">{settings.companyName}</div></div>
              <div className="text-xs">Authorised Signatory</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
