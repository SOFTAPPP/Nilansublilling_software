import React, { useState, useEffect } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';
import { getLocalDateString } from '../utils/dateUtils';
import { getNextBillNumber } from '../utils/billNumber';

export default function QuickBill({ viewBill }: { viewBill?: any }) {
  const { settings, updateSettings, createBill, updateBill, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [billNo, setBillNo] = useState('');

  // Auto-fill next bill number
  useEffect(() => {
    if (!viewBill) {
      getNextBillNumber('QB-').then(setBillNo);
    }
  }, [viewBill]);
  const [billDate, setBillDate] = useState(() => getLocalDateString());
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  useEffect(() => {
    if (viewBill) {
      setBillNo(viewBill.billNumber || '');
      setBillDate(getLocalDateString(viewBill.date));
      if (viewBill.lineItems) {
        setItems(viewBill.lineItems.map((li: any) => ({
          ...li,
          mrp: li.mrp || li.rate,
          amount: li.amount,
        })));
      }
    }
  }, [viewBill]);

  const validate = () => {
    if (items.length === 0) {
      showDialog({ title: 'Item Missing', message: 'Please add at least one item.', type: 'alert' });
      return false;
    }
    if (!billNo) {
      showDialog({ title: 'Bill Number Missing', message: 'Please enter a Bill No.', type: 'alert' });
      return false;
    }
    return true;
  };

  const [createdBillId, setCreatedBillId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!validate()) return;

    try {
      if (createdBillId) {
        await updateBill(createdBillId, 'quick', {
          billNumber: billNo,
          date: billDate,
          subtotal: totalAmount,
          discount: 0,
          cgst: 0,
          sgst: 0,
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
        showDialog({ title: 'Success', message: 'Quick Bill updated successfully!', type: 'alert' });
      } else {
        const id = await createBill({
          type: 'quick',
          billNumber: billNo,
          date: billDate,
          subtotal: totalAmount,
          discount: 0,
          cgst: 0,
          sgst: 0,
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
        setCreatedBillId(id);
        showDialog({ title: 'Success', message: 'Quick Bill saved successfully!', type: 'alert' });
      }
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
    if (!validate()) return;
    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Print Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Quick Bill</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <>
              <button 
                onClick={() => {
                  setItems([]);
                  setCreatedBillId(null);
                  getNextBillNumber('QB-').then(setBillNo);
                }}
                className="whitespace-nowrap bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-medium shadow-sm transition-colors text-sm"
              >
                New Bill
              </button>
              <button 
                onClick={handleSave} 
                className={`whitespace-nowrap ${createdBillId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm`}
              >
                {createdBillId ? 'Update' : 'Save'}
              </button>
            </>
          )}
          <button 
            onClick={handlePrint}
            className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm"
          >
            Print Bill
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="half-a4-page border border-border p-6 relative flex flex-col">
        
        <div className="text-center mb-6 flex flex-col items-center">
          <input 
            value={settings.companyName} 
            onChange={e => updateSettings({ companyName: e.target.value })} 
            className="text-2xl font-bold font-serif uppercase tracking-widest w-full text-center bg-transparent outline-none" 
          />
          <div className="text-sm w-full text-center mt-1">{settings.companyAddress}</div>
          <div className="text-sm w-full text-center">{settings.companyCity}</div>
          <div className="mt-2 font-bold border border-black inline-block px-4 py-1">
            QUICK BILL / CASH MEMO
          </div>
        </div>

        <div className="flex justify-between items-end border-b border-black pb-2 mb-4 text-sm">
          <div className="flex gap-2">
             <span className="font-semibold">Date:</span> 
             <input value={billDate} onChange={e => setBillDate(e.target.value)} className="outline-none bg-transparent w-24" placeholder="DD/MM/YYYY" />
          </div>
          <div className="flex gap-2 items-center">
             <span className="font-semibold">Bill NO:</span> 
             <div className="flex items-center">
               <span className="font-bold">QB/</span>
               <input 
                 value={billNo.replace(/^QB-/, '')} 
                 onChange={e => {
                   const val = e.target.value.replace(/^QB-/, '');
                   setBillNo(val ? `QB-${val}` : '');
                 }} 
                 className="outline-none bg-transparent w-24 pl-1 font-bold" 
                 placeholder="123" 
               />
             </div>
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

        <div className="flex justify-end border border-black z-10 relative">
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
