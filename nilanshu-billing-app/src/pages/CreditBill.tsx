import React, { useState, useRef, useEffect } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';
import { getLocalDateString } from '../utils/dateUtils';

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
  const [billDate, setBillDate] = useState(() => getLocalDateString());
  const [partyDiscount, setPartyDiscount] = useState(0);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [useOutstanding, setUseOutstanding] = useState(false);

  useEffect(() => {
    if (viewBill) {
      setInvoiceNo(viewBill.billNumber || '');
      setBillDate(getLocalDateString(viewBill.date));
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
      const discount = foundParty.discountPercentage || 0;
      setPartyDiscount(discount);
      setPartyId(foundParty.id);
      
      // Auto-fill consignee details
      setConsigneeName(foundParty.name);
      setConsigneeAddress(foundParty.address);
      setConsigneeState(foundParty.gstin ? foundParty.gstin.substring(0, 2) : '19'); // Default WB state code 19
      setBuyerState(foundParty.gstin ? foundParty.gstin.substring(0, 2) : '19');

      // Retroactively apply the default discount to all existing items
      setItems(prevItems => prevItems.map(item => {
        if (!item.discountPercent || item.discountPercent === 0) {
          const discountAmount = (item.mrp * discount) / 100;
          const newAmount = (item.mrp - discountAmount) * item.quantity;
          return { ...item, discountPercent: discount, amount: newAmount };
        }
        return item;
      }));
    } else {
      setPartyId(null);
      setPartyDiscount(0);
    }
  };
  
  // Paid and Cancelled stamps
  const [showPaidStamp, setShowPaidStamp] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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

  const partyOutstanding = parties.find(p => p.id === partyId)?.outstandingBalance || 0;
  const deductedAmount = (useOutstanding && partyOutstanding > 0) ? Math.min(partyOutstanding, grandTotal) : 0;
  const netPayable = grandTotal - deductedAmount;

  const handlePrint = () => {
    const bankName = settings.bankName || '';
    const acNo = settings.bankAccountNo || '';
    const ifsc = settings.bankIfsc || '';
    if (bankName.length > 0) {
      const bLen = bankName.replace(/ /g, '').length;
      if (bLen < 3 || bLen > 44) {
        showDialog({ title: 'Validation Error', message: 'Bank Name must be between 3 and 44 characters (excluding spaces).', type: 'alert' });
        return;
      }
    }
    if (acNo.length > 0 && (acNo.length < 8 || acNo.length > 17)) {
      showDialog({ title: 'Validation Error', message: 'Bank Account Number must be between 8 and 17 digits.', type: 'alert' });
      return;
    }
    if (ifsc.length > 0 && !/^[A-Za-z]{4}\d{7}$/.test(ifsc)) {
      showDialog({ title: 'Validation Error', message: 'IFSC Code must start with 4 letters followed by 7 numbers (e.g. SBIN0011372).', type: 'alert' });
      return;
    }

    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  const handleSave = async () => {
    const bankName = settings.bankName || '';
    const acNo = settings.bankAccountNo || '';
    const ifsc = settings.bankIfsc || '';
    if (bankName.length > 0) {
      const bLen = bankName.replace(/ /g, '').length;
      if (bLen < 3 || bLen > 44) {
        showDialog({ title: 'Validation Error', message: 'Bank Name must be between 3 and 44 characters (excluding spaces).', type: 'alert' });
        return;
      }
    }
    if (acNo.length > 0 && (acNo.length < 8 || acNo.length > 17)) {
      showDialog({ title: 'Validation Error', message: 'Bank Account Number must be between 8 and 17 digits.', type: 'alert' });
      return;
    }
    if (ifsc.length > 0 && !/^[A-Za-z]{4}\d{7}$/.test(ifsc)) {
      showDialog({ title: 'Validation Error', message: 'IFSC Code must start with 4 letters followed by 7 numbers (e.g. SBIN0011372).', type: 'alert' });
      return;
    }

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
        deductedAmount: deductedAmount,
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
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      {/* Header Controls (No Print) */}
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">{type === 'return' ? 'Sales Return Bill' : 'Chalan / Credit Bill (Tax Invoice)'}</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <button onClick={handleSave} className="whitespace-nowrap bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors text-sm">
              Save to Database
            </button>
          )}
          <button 
            onClick={() => setShowPaidStamp(!showPaidStamp)}
            className="whitespace-nowrap border border-green-600 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium shadow-sm transition-colors text-sm bg-white"
          >
            Toggle PAID Stamp
          </button>
          <button 
            onClick={() => setShowCancelStamp(!showCancelStamp)}
            className="whitespace-nowrap border border-red-600 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 font-medium shadow-sm transition-colors text-sm bg-white"
          >
            Toggle DELETE Stamp
          </button>
          {!viewBill && (
            <button onClick={handleSendSMS} className="whitespace-nowrap bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-medium shadow-sm transition-colors text-sm">
              Send SMS
            </button>
          )}
          <button onClick={handlePrint} className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm">
            Print Invoice
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="a4-page border-2 border-border relative flex flex-col">
        
        {/* Stamps overlay */}
        {showPaidStamp && (
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-green-600 border-4 border-green-600 rounded-full w-64 h-64 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <span className="text-6xl font-bold uppercase tracking-widest">PAID</span>
          </div>
        )}
        {showCancelStamp && (
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 text-red-600 border-4 border-red-600 rounded-full w-64 h-64 flex items-center justify-center opacity-30 pointer-events-none z-0">
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
              <div className="font-bold text-2xl uppercase w-full">{settings.companyName}</div>
              <div className="font-bold text-sm w-full">Publishers and Book Sellers</div>
              <div className="w-full text-sm mt-1">{settings.companyAddress}</div>
              <div className="w-full text-sm">{settings.companyCity}</div>
              <div className="flex gap-2 text-sm mt-1"><span className="whitespace-nowrap">IT PAN -</span><span className="w-full uppercase">{settings.companyPan}</span></div>
              <div className="flex gap-2 text-sm"><span className="whitespace-nowrap">Phone No.-</span><span className="w-full">{settings.companyContact}</span></div>
            </div>
            
            {/* Buyer Details */}
            <div className="p-2 flex flex-col flex-1">
              <div className="flex items-start gap-1">
                <span className="text-sm">Buyer:-</span>
                <div className="flex-1 flex flex-col">
                  <div className="relative no-print mb-1" ref={partyDropdownRef}>
                    <div className="flex items-center border border-border bg-background rounded-lg px-2 text-sm w-full shadow-sm">
                      <input 
                        type="text"
                        value={partySearch} 
                        onChange={e => { setPartySearch(e.target.value); setPartyDropdownOpen(true); }} 
                        onFocus={() => setPartyDropdownOpen(true)}
                        className="w-full py-1.5 outline-none text-xs"
                        placeholder="Search Customer by Name or Phone..." 
                      />
                      <svg onClick={() => setPartyDropdownOpen(!partyDropdownOpen)} className="w-4 h-4 cursor-pointer text-gray-500 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    
                    {partyDropdownOpen && parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-background border border-border shadow-xl rounded-md z-50 max-h-60 overflow-y-auto no-print text-sm text-left">
                        {parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).map(p => (
                          <div
                            key={p.id}
                            className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                            onClick={() => {
                              handlePartyLookup(p.phone, 'phone');
                              setPartySearch('');
                              setPartyDropdownOpen(false);
                            }}
                          >
                            <div className="font-bold">{p.name}</div>
                            <div className="text-xs opacity-90">{p.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
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
              <div className="w-1/2 border-r border-black p-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-600 font-medium">Invoice No.</span>
                <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="font-bold w-full outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" />
              </div>
              <div className="w-1/2 p-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-600 font-medium">Date:-</span>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="font-bold w-full outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" />
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-600 font-medium">Transport no:</span>
                <input value={invoiceMeta.dispatchedThrough} onChange={e => setInvoiceMeta({...invoiceMeta, dispatchedThrough: e.target.value})} className="font-bold w-full outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" />
              </div>
              <div className="w-1/2 p-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-600 font-medium">Delivery Note Date</span>
                <input type="date" value={invoiceMeta.deliveryNoteDate} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNoteDate: e.target.value})} className="font-bold w-full outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" />
              </div>
            </div>
            <div className="flex flex-1">
              <div className="w-1/2 border-r border-black p-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-600 font-medium">Despatched through</span>
                <div className="relative w-full mt-1 print:hidden">
                  <select 
                    value={invoiceMeta.termsOfPayment || 'ROAD'} 
                    onChange={e => setInvoiceMeta({...invoiceMeta, termsOfPayment: e.target.value})} 
                    className="font-bold w-full outline-none bg-background appearance-none cursor-pointer border border-border rounded px-2 py-1.5 text-[12px] hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                  >
                    <option value="ROAD">ROAD</option>
                    <option value="TRAIN">TRAIN</option>
                    <option value="AIR">AIR</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
                <div className="hidden print:block font-bold w-full outline-none bg-transparent mt-1">
                  {invoiceMeta.termsOfPayment || 'ROAD'}
                </div>
              </div>
              <div className="w-1/2 p-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-600 font-medium">Destination</span>
                <input value={invoiceMeta.destination} onChange={e => setInvoiceMeta({...invoiceMeta, destination: e.target.value})} className="font-bold w-full outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" />
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
            
            {partyOutstanding > 0 && (
              <div className="flex border-t-2 border-black text-sm font-bold bg-yellow-50/50 dark:bg-yellow-900/20 print:bg-transparent">
                <div className="w-[85%] text-right pr-4 py-1 border-r border-black flex justify-end items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer no-print text-xs">
                    <input type="checkbox" checked={useOutstanding} onChange={e => setUseOutstanding(e.target.checked)} className="w-3 h-3 accent-primary" />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Use Advance (₹{partyOutstanding})</span>
                  </label>
                  <span className="hidden print:block text-xs font-semibold">Less Advance</span>
                </div>
                <div className="w-[15%] text-right pr-2 py-1 text-red-600 dark:text-red-400">
                  - {deductedAmount.toFixed(2)}
                </div>
              </div>
            )}
            {(useOutstanding && partyOutstanding > 0) && (
              <div className="flex border-t-2 border-black text-sm font-bold text-lg bg-green-50 dark:bg-green-900/20 print:bg-transparent text-foreground">
                <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
                  NET PAYABLE
                </div>
                <div className="w-[15%] text-right pr-2 py-1">
                  {netPayable.toFixed(2)}
                </div>
              </div>
            )}
         </div>

        {/* Amount in words */}
        <div className="border-b-2 border-black p-2 text-sm flex gap-4 items-center">
          <span className="text-[13px]">Amount Chargeable (in words)</span>
          <span className="font-bold text-[13px]">{numberToWords(Math.round(netPayable > 0 ? netPayable : grandTotal))} only.</span>
        </div>

        {/* Footer info */}
        <div className="flex flex-col border-b-2 border-black text-[13px]">
          <div className="p-2 border-b border-black">
            <p className="underline mb-1">Company's Bank Details :-</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-bold">
              <div className="flex gap-2"><span>Bank Name :-</span><input value={settings.bankName} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''); if (val.replace(/ /g, '').length <= 44) updateSettings({ bankName: val }); }} className="outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span>A/c. No.</span><input value={settings.bankAccountNo} maxLength={17} onChange={e => { const val = e.target.value.replace(/\D/g, ''); updateSettings({bankAccountNo: val}) }} className="outline-none bg-transparent" /></div>
              <div className="flex gap-2"><input value={settings.companyCity + " Br.,"} onChange={e => updateSettings({companyCity: e.target.value.replace(' Br.,', '')})} className="outline-none bg-transparent text-right" /></div>
              <div className="flex gap-2"><span>IFS -</span><input value={settings.bankIfsc} maxLength={11} onChange={e => { let val = e.target.value.toUpperCase(); let formatted = ''; for (let i = 0; i < val.length; i++) { if (i < 4) { if (/[A-Z]/.test(val[i])) formatted += val[i]; } else { if (/[0-9]/.test(val[i])) formatted += val[i]; } } updateSettings({ bankIfsc: formatted }) }} className="outline-none bg-transparent uppercase" /></div>
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
                <span>For </span><div className="font-bold ml-1 text-right w-48 truncate">{settings.companyName}</div>
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
