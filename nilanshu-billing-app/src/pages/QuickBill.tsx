import React, { useState, useEffect, useRef } from 'react';
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
  const [defaultDiscount, setDefaultDiscount] = useState<number>(0);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

  const formStateStr = JSON.stringify({ items, billDate, billNo, settings, defaultDiscount });
  const lastSavedStateRef = useRef(formStateStr);

  useEffect(() => {
    if (!viewBill) {
      if (lastSavedStateRef.current !== formStateStr) {
        setHasUnsavedChanges(true);
      }
    }
  }, [formStateStr, viewBill]);

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
      if (viewBill.subtotal && viewBill.subtotal > 0) {
        const historicalDiscount = viewBill.discount || Math.max(0, viewBill.subtotal - viewBill.total);
        if (historicalDiscount > 0) {
          setDefaultDiscount(Number(((historicalDiscount / viewBill.subtotal) * 100).toFixed(2)));
        } else {
          setDefaultDiscount(0);
        }
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

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const discountTotal = (totalAmount * defaultDiscount) / 100;
  const subtotalBeforeRound = totalAmount - discountTotal;
  const roundOff = Math.round(subtotalBeforeRound) - subtotalBeforeRound;
  const grandTotal = Math.round(subtotalBeforeRound);

  const handleSave = async () => {
    if (!validate()) return;

    try {
      if (createdBillId) {
        await updateBill(createdBillId, 'quick', {
          billNumber: billNo,
          date: billDate,
          subtotal: totalAmount,
          discount: discountTotal,
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
          discount: discountTotal,
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
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = formStateStr;
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message;
      showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

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
                  setDefaultDiscount(0);
                  setHasUnsavedChanges(true);
                }}
                className="whitespace-nowrap bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-medium shadow-sm transition-colors text-sm"
              >
                New Bill
              </button>
              <button 
                onClick={handleSave} 
                disabled={!hasUnsavedChanges}
                className={`whitespace-nowrap ${createdBillId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {createdBillId ? 'Update' : 'Save'}
              </button>
            </>
          )}
          <button 
            onClick={handlePrint}
            disabled={!viewBill && (hasUnsavedChanges || !createdBillId)}
            className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            QUICK BILL
          </div>
        </div>

        <div className="flex justify-between items-end border-b border-black pb-2 mb-4 text-sm">
          <div className="flex gap-2">
             <span className="font-semibold">Date:</span> 
             <input value={billDate} onChange={e => setBillDate(e.target.value)} className="outline-none bg-transparent w-24" placeholder="DD/MM/YYYY" readOnly={!!viewBill} />
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
                 readOnly={!!viewBill}
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
            readOnly={!!viewBill}
          />
        </div>

        <div className="flex justify-end border border-black z-10 relative">
          <div className="w-64 border-l border-black flex flex-col">
            <div className="flex justify-between p-2 text-sm border-b border-black font-semibold">
              <span>SUBTOTAL</span>
              <span>{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 text-sm border-b border-black">
              <span className="flex items-center gap-2">
                <span>Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={defaultDiscount}
                  onChange={e => setDefaultDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-12 border border-gray-300 rounded text-center font-bold no-print py-0.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  readOnly={!!viewBill}
                />
                <span className="hidden print:inline font-bold pr-2">{defaultDiscount}%</span>
              </span>
              <span>{discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 text-sm border-b border-black">
              <span>Round Off</span>
              <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 font-bold text-lg">
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
