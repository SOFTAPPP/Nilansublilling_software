import React, { useState, useEffect } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';

export default function CreditBill({ type = 'credit', viewBill }: { type?: 'credit' | 'return', viewBill?: any }) {
  const { parties, settings, updateSettings, createBill, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  
  // Consignee Details
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeState, setConsigneeState] = useState('');

  // Invoice Meta
  const [invoiceMeta, setInvoiceMeta] = useState({
    deliveryNote: '', termsOfPayment: '', refNo: '', otherRef: '', dispatchDocNo: '', deliveryNoteDate: '', dispatchedThrough: '', destination: '', termsOfDelivery: ''
  });
  
  // Buyer Details
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [partyDiscount, setPartyDiscount] = useState(0);
  const [partyId, setPartyId] = useState<string | null>(null);

  useEffect(() => {
    if (viewBill) {
      setInvoiceNo(viewBill.billNumber || '');
      setBillDate(new Date(viewBill.date).toISOString().split('T')[0]);
      if (viewBill.partyId) {
        setPartyId(viewBill.partyId);
        const p = parties.find(p => p.id === viewBill.partyId);
        if (p) {
          setBuyerName(p.name);
          setBuyerPhone(p.phone);
          setBuyerAddress(p.address);
          setPartyDiscount(p.discountPercentage || 0);
        }
      }
      if (viewBill.lineItems) {
        setItems(viewBill.lineItems.map((li: any) => ({
          ...li,
          mrp: li.mrp || li.rate,
          amount: li.amount,
          discountPercent: li.discountPercent || 0,
        })));
      }
      setInvoiceMeta({
        deliveryNote: viewBill.lrNo || '',
        destination: viewBill.destination || '',
        dispatchedThrough: viewBill.driverName || '',
        termsOfPayment: '', refNo: '', otherRef: '', dispatchDocNo: '', deliveryNoteDate: '', termsOfDelivery: ''
      });
    }
  }, [viewBill, parties]);

  // Search Party by Phone or Name
  const handlePartyLookup = (val: string, field: 'phone' | 'name') => {
    if (field === 'phone') setBuyerPhone(val);
    if (field === 'name') setBuyerName(val);

    const foundParty = parties.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (foundParty) {
      setBuyerName(foundParty.name);
      setBuyerPhone(foundParty.phone);
      setBuyerAddress(foundParty.address);
      setPartyDiscount(foundParty.discountPercentage);
      setPartyId(foundParty.id);
      
      // Auto-fill consignee details
      setConsigneeName(foundParty.name);
      setConsigneeAddress(foundParty.address);
      setConsigneeState(foundParty.gstin ? foundParty.gstin.substring(0, 2) : '19'); // Default WB state code 19
      setBuyerState(foundParty.gstin ? foundParty.gstin.substring(0, 2) : '19');
    } else {
      setPartyId(null);
    }
  };
  
  // Paid and Cancelled stamps
  const [showPaidStamp, setShowPaidStamp] = useState(false);
  const [showCancelStamp, setShowCancelStamp] = useState(false);

  // Calculates
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
  const discountTotal = mrpTotal - totalAmount;
  const cgstRate = 9;
  const sgstRate = 9;
  const cgstAmount = (totalAmount * cgstRate) / 100;
  const sgstAmount = (totalAmount * sgstRate) / 100;
  const grandTotal = totalAmount + cgstAmount + sgstAmount;

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Print Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      showDialog({ title: 'Validation Error', message: 'Please add at least one item.', type: 'alert' });
      return;
    }
    if (!invoiceNo) {
      showDialog({ title: 'Validation Error', message: 'Please enter an Invoice No.', type: 'alert' });
      return;
    }
    if (!partyId) {
      showDialog({ title: 'Validation Error', message: 'Please select a valid customer.', type: 'alert' });
      return;
    }
    
    try {
      await createBill({
        type: type,
        billNumber: invoiceNo,
        partyId: partyId,
        date: billDate,
        subtotal: totalAmount,
        discount: discountTotal,
        cgst: cgstAmount,
        sgst: sgstAmount,
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
      showDialog({ title: 'Success', message: `${type === 'return' ? 'Return' : 'Credit'} Bill saved successfully!`, type: 'alert' });
      
      if (buyerPhone) {
        await handleSendSMS();
      }
      
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message;
      showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

  const handleSendSMS = async () => {
    if (!buyerPhone) {
      showDialog({ title: 'Missing Info', message: "Please enter customer's phone number first.", type: 'alert' });
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: buyerPhone,
          message: `Dear ${buyerName || 'Customer'}, thank you for your transaction. Total: Rs. ${grandTotal.toFixed(2)}. ${type === 'return' ? 'Return' : 'Invoice'} No: ${invoiceNo || 'N/A'}.`
        })
      });
      if (response.ok) {
        showDialog({ title: 'SMS Sent', message: `SMS sent to ${buyerName} at ${buyerPhone} successfully!`, type: 'alert' });
      } else {
        throw new Error('Failed to send SMS');
      }
    } catch (err) {
      console.error(err);
      showDialog({ title: 'SMS Failed', message: `Could not send SMS to ${buyerPhone}. Ensure server is running.`, type: 'alert' });
    }
  };

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      {/* Header Controls (No Print) */}
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">{type === 'return' ? 'Sales Return Bill' : 'Chalan / Credit Bill (Tax Invoice)'}</h2>
        <div className="flex gap-4">
          {!viewBill && (
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
              Save to Database
            </button>
          )}
          <button 
            onClick={() => setShowPaidStamp(!showPaidStamp)}
            className="border border-green-600 text-green-600 px-4 py-2 rounded-md hover:bg-green-50"
          >
            Toggle PAID Stamp
          </button>
          <button 
            onClick={() => setShowCancelStamp(!showCancelStamp)}
            className="border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50"
          >
            Toggle DELETE Stamp
          </button>
          {!viewBill && (
            <button onClick={handleSendSMS} className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">
              Send SMS
            </button>
          )}
          <button onClick={handlePrint} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
            Print Invoice
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="a4-page border-2 border-black relative flex flex-col bg-white">
        
        {/* Stamps overlay */}
        {showPaidStamp && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-green-600 border-4 border-green-600 rounded-full w-64 h-64 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <span className="text-6xl font-bold uppercase tracking-widest">PAID</span>
          </div>
        )}
        {showCancelStamp && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 text-red-600 border-4 border-red-600 rounded-full w-64 h-64 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <span className="text-5xl font-bold uppercase tracking-widest text-center">CANCELLED</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center py-2 font-bold text-lg border-b-2 border-black tracking-wide">
          {type === 'return' ? 'RETURN CUM CHALLAN' : 'INVOICE CUM CHALLAN'}
        </div>

        {/* Top Details Grid */}
        <div className="grid grid-cols-2 text-sm border-b-2 border-black min-h-[220px]">
          {/* Left Column (Seller & Buyer) */}
          <div className="border-r-2 border-black flex flex-col">
            {/* Seller Details */}
            <div className="p-2 border-b-2 border-black flex flex-col justify-center min-h-[140px]">
              <input value={settings.companyName} onChange={e => updateSettings({companyName: e.target.value})} placeholder="Company Name" className="font-bold text-2xl uppercase w-full outline-none bg-transparent" />
              <input value="Publishers and Book Sellers" readOnly className="font-bold text-sm w-full outline-none bg-transparent" />
              <input value={settings.companyAddress} onChange={e => updateSettings({companyAddress: e.target.value})} placeholder="Address" className="w-full text-sm outline-none bg-transparent" />
              <input value={settings.companyCity} onChange={e => updateSettings({companyCity: e.target.value})} placeholder="City & Pin" className="w-full text-sm outline-none bg-transparent" />
              <div className="flex gap-2 text-sm"><span className="whitespace-nowrap">IT PAN -</span><input value={settings.companyPan} onChange={e => updateSettings({companyPan: e.target.value})} className="w-full outline-none bg-transparent uppercase" /></div>
              <div className="flex gap-2 text-sm"><span className="whitespace-nowrap">Phone No.-</span><input value={settings.companyContact} onChange={e => updateSettings({companyContact: e.target.value})} className="w-full outline-none bg-transparent" /></div>
            </div>
            
            {/* Buyer Details */}
            <div className="p-2 flex flex-col flex-1">
              <div className="flex items-start gap-1">
                <span className="text-sm">Buyer:-</span>
                <div className="flex-1 flex flex-col">
                  {/* Hidden lookups for UI convenience (won't print border) */}
                  <div className="flex items-center gap-1 no-print mb-1">
                     <input list="party-phones" value={buyerPhone} onChange={e => handlePartyLookup(e.target.value, 'phone')} placeholder="Lookup Phone" className="w-1/2 text-xs border p-1" />
                     <input list="party-names" value={buyerName} onChange={e => handlePartyLookup(e.target.value, 'name')} placeholder="Lookup Name" className="w-1/2 text-xs border p-1" />
                     <datalist id="party-phones">{parties.map(p => <option key={p.id} value={p.phone}>{p.name}</option>)}</datalist>
                     <datalist id="party-names">{parties.map(p => <option key={p.id} value={p.name}>{p.phone}</option>)}</datalist>
                  </div>
                  <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Buyer Name" className="font-bold w-full outline-none bg-transparent" />
                  <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="Buyer Address" className="w-full outline-none bg-transparent" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column (Invoice Meta) */}
          <div className="flex flex-col text-[13px]">
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Invoice No.</span>
                <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="font-bold w-full outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Date:-</span>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="font-bold w-full outline-none bg-transparent" />
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Delivery at</span>
                <input value={invoiceMeta.destination} onChange={e => setInvoiceMeta({...invoiceMeta, destination: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Transport no:</span>
                <input value={invoiceMeta.dispatchedThrough} onChange={e => setInvoiceMeta({...invoiceMeta, dispatchedThrough: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Suppliers Ref</span>
                <input value={invoiceMeta.refNo} onChange={e => setInvoiceMeta({...invoiceMeta, refNo: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-1 flex flex-col">
                <div className="flex"><span className="text-[11px] text-gray-600 w-16">CITY:</span><input value={buyerState} onChange={e => setBuyerState(e.target.value)} className="font-bold w-full outline-none bg-transparent" /></div>
                <div className="flex"><span className="text-[11px] text-gray-600 w-16">DISTRICT:</span><input className="font-bold w-full outline-none bg-transparent" /></div>
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Buyer's Order</span>
                <input value={invoiceMeta.deliveryNote} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNote: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Date:-</span>
                <input type="text" value={invoiceMeta.deliveryNoteDate} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNoteDate: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Despatch Document No.</span>
                <input value={invoiceMeta.dispatchDocNo} onChange={e => setInvoiceMeta({...invoiceMeta, dispatchDocNo: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Delivery Note Date</span>
                <input type="date" value={invoiceMeta.deliveryNoteDate} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNoteDate: e.target.value})} className="font-bold w-full outline-none bg-transparent text-[11px]" />
              </div>
            </div>
            <div className="flex flex-1">
              <div className="w-1/2 border-r border-black p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Despatched through</span>
                <input value="ROAD" readOnly className="font-bold w-full outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-1 flex flex-col">
                <span className="text-[11px] text-gray-600">Destination</span>
                <input value={invoiceMeta.destination} onChange={e => setInvoiceMeta({...invoiceMeta, destination: e.target.value})} className="font-bold w-full outline-none bg-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="flex-1 flex flex-col border-b-2 border-black min-h-[350px]">
          <div className="flex-1">
            <BillEngine 
              items={items} 
              onChange={setItems} 
              columns={['sno', 'name', 'hsn', 'qty', 'rate', 'per', 'amount']}
              globalDiscount={partyDiscount}
              maxItems={10}
            />
          </div>
          
           {/* Discount and Total Rows */}
           <div className="flex border-t border-black text-sm border-r-0">
             <div className="w-[85%] text-right pr-4 py-1 border-r border-black flex justify-end items-center gap-2">
               <span className="no-print text-xs text-muted-foreground">Party Discount:</span>
               <input type="number" value={partyDiscount} onChange={e => setPartyDiscount(parseFloat(e.target.value) || 0)} className="w-16 border text-right no-print" />
               Less: Discount
             </div>
             <div className="w-[15%] text-right pr-2 py-1">
               {discountTotal.toFixed(2)}
             </div>
           </div>
           <div className="flex border-t border-black text-sm font-bold">
             <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
               CGST @ 9%
             </div>
             <div className="w-[15%] text-right pr-2 py-1">
               {cgstAmount.toFixed(2)}
             </div>
           </div>
           <div className="flex border-t border-black text-sm font-bold">
             <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
               SGST @ 9%
             </div>
             <div className="w-[15%] text-right pr-2 py-1">
               {sgstAmount.toFixed(2)}
             </div>
           </div>
           <div className="flex border-t-2 border-black text-sm font-bold text-lg">
             <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
               Grand Total
             </div>
             <div className="w-[15%] text-right pr-2 py-1">
               {grandTotal.toFixed(2)}
             </div>
           </div>
        </div>

        {/* Amount in words */}
        <div className="border-b-2 border-black p-2 text-sm flex gap-4 items-center">
          <span className="text-[13px]">Amount Chargeable (in words)</span>
          <span className="font-bold text-[13px]">{numberToWords(Math.round(grandTotal))} only.</span>
        </div>

        {/* Footer info */}
        <div className="flex flex-col border-b-2 border-black text-[13px]">
          <div className="p-2 border-b border-black">
            <p className="underline mb-1">Company's Bank Details :-</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-bold">
              <div className="flex gap-2"><span>Bank Name :-</span><input value={settings.bankName} onChange={e => updateSettings({bankName: e.target.value})} className="outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span>A/c. No.</span><input value={settings.bankAccountNo} onChange={e => updateSettings({bankAccountNo: e.target.value})} className="outline-none bg-transparent" /></div>
              <div className="flex gap-2"><input value={settings.companyCity + " Br.,"} onChange={e => updateSettings({companyCity: e.target.value.replace(' Br.,', '')})} className="outline-none bg-transparent text-right" /></div>
              <div className="flex gap-2"><span>IFS -</span><input value={settings.bankIfsc} onChange={e => updateSettings({bankIfsc: e.target.value})} className="outline-none bg-transparent" /></div>
            </div>
          </div>
          <div className="flex">
            <div className="w-1/2 border-r border-black p-2">
              <p>We declare that this Invoice shows the actual</p>
              <p>price of the goods described and that all</p>
              <p>particulars are true and correct</p>
            </div>
            <div className="w-1/2 p-2 relative min-h-[80px]">
              <div className="flex text-sm justify-end absolute top-2 right-4">
                <span>For </span><input value={settings.companyName} readOnly className="font-bold outline-none bg-transparent ml-1 text-right w-48" />
              </div>
              <div className="absolute bottom-2 right-4 text-sm">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center text-[11px] py-1">
          <p>SUBJECT TO KOLKATA JURISDICTION</p>
          <p>This is a Computer Generated Invoice</p>
        </div>

      </div>
    </div>
  );
}
