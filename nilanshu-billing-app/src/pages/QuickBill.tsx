import React, { useState, useEffect } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';

export default function QuickBill({ viewBill }: { viewBill?: any }) {
  const { settings, updateSettings, createBill, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (viewBill) {
      setBillNo(viewBill.billNumber || '');
      setBillDate(new Date(viewBill.date).toISOString().split('T')[0]);
      if (viewBill.lineItems) {
        setItems(viewBill.lineItems.map((li: any) => ({
          ...li,
          mrp: li.mrp || li.rate,
          amount: li.amount,
        })));
      }
    }
  }, [viewBill]);

  const handleSave = async () => {
    if (items.length === 0) {
      showDialog({ title: 'Validation Error', message: 'Please add at least one item.', type: 'alert' });
      return;
    }
    if (!billNo) {
      showDialog({ title: 'Validation Error', message: 'Please enter a Bill No.', type: 'alert' });
      return;
    }
    try {
      await createBill({
        type: 'quick',
        billNumber: billNo,
        subtotal: totalAmount,
        discount: 0,
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
      showDialog({ title: 'Success', message: 'Quick Bill saved successfully!', type: 'alert' });
      setItems([]);
      setBillNo('');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message;
      showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const roundOff = Math.round(totalAmount) - totalAmount;
  const grandTotal = Math.round(totalAmount);

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
        <h2 className="text-2xl font-bold">Quick Bill</h2>
        <div className="flex gap-4">
          {!viewBill && (
            <button 
              onClick={handleSave} 
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Save to Database
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Print Bill
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="half-a4-page border border-black p-6 relative flex flex-col">
        
        <div className="text-center mb-6 flex flex-col items-center">
          <input value={settings.companyName} onChange={e => updateSettings({companyName: e.target.value})} placeholder="Company Name" className="text-2xl font-bold font-serif uppercase tracking-widest w-full text-center outline-none bg-transparent" />
          <input value={settings.companyAddress} onChange={e => updateSettings({companyAddress: e.target.value})} placeholder="Address Line 1" className="text-sm w-full text-center outline-none bg-transparent" />
          <input value={settings.companyCity} onChange={e => updateSettings({companyCity: e.target.value})} placeholder="City & Pin" className="text-sm w-full text-center outline-none bg-transparent" />
          <div className="mt-2 font-bold border border-black inline-block px-4 py-1">
            QUICK BILL / CASH MEMO
          </div>
        </div>

        <div className="flex justify-between items-end border-b border-black pb-2 mb-4 text-sm">
          <div className="flex gap-2">
             <span className="font-semibold">Date:</span> 
             <input value={billDate} onChange={e => setBillDate(e.target.value)} className="outline-none bg-transparent w-24" placeholder="DD/MM/YYYY" />
          </div>
          <div className="flex gap-2">
             <span className="font-semibold">Bill NO:</span> 
             <input value={billNo} onChange={e => setBillNo(e.target.value)} className="outline-none bg-transparent w-32 text-right" placeholder="QB/..." />
          </div>
        </div>

        <div className="flex-1 flex flex-col border border-black border-b-0 relative z-10 overflow-hidden">
          <BillEngine 
            items={items} 
            onChange={setItems} 
            columns={['sno', 'name', 'qty', 'amount']}
            maxItems={5}
          />
        </div>

        <div className="flex justify-end border border-black bg-white z-10 relative">
          <div className="w-48 border-l border-black p-2">
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL</span>
              <span>{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-sm mt-4 italic text-center font-semibold">
          Amount in words: {numberToWords(grandTotal)}
        </div>
      </div>
    </div>
  );
}
