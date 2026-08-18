import { useEffect, useRef, useState } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { checkBillNumberExists, getNextBillNumber, getNextBillNumberSync } from '../utils/billNumber';
import { getLocalDateString } from '../utils/dateUtils';
import { numberToWords } from '../utils/numberToWords';

export default function CreditBill({ type = 'credit', viewBill }: { type?: 'credit' | 'return', viewBill?: any }) {
  const { parties, settings, updateSettings, createBill, updateBill, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);

  // Consignee Details
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeState, setConsigneeState] = useState('');

  // Invoice Meta
  const [invoiceMeta, setInvoiceMeta] = useState({
    deliveryNote: '', termsOfPayment: '', refNo: '', otherRef: '', dispatchDocNo: '', deliveryNoteDate: '', dispatchedThrough: '', destination: '', termsOfDelivery: '', orderDate: ''
  });

  // Buyer Details
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const bills = useStore(state => state.bills);
  const [invoiceNo, setInvoiceNo] = useState(() => viewBill ? (viewBill.billNumber || '') : getNextBillNumberSync('INV-', bills));

  // Auto-fill next invoice number
  // (No longer needed to run asynchronously on mount since we initialized it synchronously)
  useEffect(() => {
    // We only need to check it once when the component mounts if we wanted to be sure it's latest,
    // but the store already has the latest bills.
  }, []);
  const [billDate, setBillDate] = useState(() => getLocalDateString());
  const [partyDiscount, setPartyDiscount] = useState(0);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

  const formStateStr = JSON.stringify({ items, partyId, buyerName, buyerAddress, buyerPhone, billDate, invoiceNo, invoiceMeta, partyDiscount, advanceAmount, settings });
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
      let parsedMeta = {
        deliveryNote: '', destination: '', dispatchedThrough: '', termsOfPayment: '',
        refNo: '', otherRef: '', dispatchDocNo: '', deliveryNoteDate: '', termsOfDelivery: '', orderDate: ''
      };
      if (viewBill.lrNo) {
        try {
          const parsed = JSON.parse(viewBill.lrNo);
          parsedMeta = { ...parsedMeta, ...parsed };
        } catch (e) {
          // Fallback if lrNo was just a string
          parsedMeta.deliveryNote = viewBill.lrNo;
        }
      }
      if (viewBill.destination) parsedMeta.destination = viewBill.destination;
      if (viewBill.driverName) parsedMeta.dispatchedThrough = viewBill.driverName;

      setInvoiceMeta(parsedMeta);
      if (viewBill.paymentAmount) {
        setAdvanceAmount(viewBill.paymentAmount.toString());
      } else {
        setAdvanceAmount('');
      }
    }
  }, [viewBill, parties]);

  const applyGlobalDiscount = (discount: number) => {
    setPartyDiscount(discount);
    setItems(prevItems => prevItems.map(item => {
      if (!item.productId && !item.productName) return item;
      const basePrice = item.rate || item.mrp;
      const discountAmount = (basePrice * discount) / 100;
      const newAmount = (basePrice - discountAmount) * item.quantity;
      return { ...item, discountPercent: discount, amount: newAmount };
    }));
  };

  // Search Party by Phone or Name
  const handlePartyLookup = (val: string, field: 'phone' | 'name') => {
    if (field === 'phone') setBuyerPhone(val);
    if (field === 'name') setBuyerName(val);

    const foundParty = parties.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (foundParty) {
      setBuyerName(foundParty.name);
      setBuyerPhone(foundParty.phone);
      setBuyerAddress(foundParty.address.replace(/ \| PIN:/g, '\nPIN:').replace(/ \| Dist:/g, '\nDist:'));
      const discount = foundParty.discountPercentage || 0;
      applyGlobalDiscount(discount);
      setPartyId(foundParty.id);

      // Auto-fill consignee details
      setConsigneeName(foundParty.name);
      setConsigneeAddress(foundParty.address.replace(/ \| PIN:/g, '\nPIN:').replace(/ \| Dist:/g, '\nDist:'));
      setConsigneeState('19'); // Default WB state code
      setBuyerState('19');
    } else {
      setPartyId(null);
      applyGlobalDiscount(0);
      if (val === '') {
        setBuyerPhone('');
        setBuyerAddress('');
        setConsigneeName('');
        setConsigneeAddress('');
      }
    }
  };

  // Paid and Cancelled stamps
  const [showPaidStamp, setShowPaidStamp] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  // Custom dropdown for Despatched through
  const [despatchDropdownOpen, setDespatchDropdownOpen] = useState(false);
  const despatchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setPartyDropdownOpen(false);
      }
      if (despatchDropdownRef.current && !despatchDropdownRef.current.contains(event.target as Node)) {
        setDespatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [showCancelStamp, setShowCancelStamp] = useState(false);

  // Calculates
  const mrpTotal = items.reduce((sum, item) => sum + ((item.rate || item.mrp) * item.quantity), 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0); // Discounted total
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const discountTotal = mrpTotal - totalAmount;

  // Tax calculations on discounted total
  const taxableAmount = totalAmount;
  const cgstRate = 0;
  const sgstRate = 0;
  const cgstAmount = (taxableAmount * cgstRate) / 100;
  const sgstAmount = (taxableAmount * sgstRate) / 100;

  const subtotalBeforeRound = taxableAmount + cgstAmount + sgstAmount;
  const roundOff = Math.round(subtotalBeforeRound) - subtotalBeforeRound;
  const grandTotal = Math.round(subtotalBeforeRound);

  const partyOutstanding = parties.find(p => p.id === partyId)?.outstandingBalance || 0;
  const addedAmount = Number(advanceAmount) || 0;
  const netPayable = grandTotal + addedAmount;

  // Validate invoice number on change - check for duplicates
  const handleInvoiceNoChange = async (val: string) => {
    setInvoiceNo(val);
    if (val.trim().length > 0) {
      // Check local bills state first for immediate feedback
      const localExists = useStore.getState().bills.some(b => b.billNumber === val);

      if (localExists) {
        showDialog({ title: 'Duplicate Invoice Number', message: `Invoice number ${val} already exists. Please use a different number.`, type: 'alert' });
        getNextBillNumber('INV-').then(setInvoiceNo);
      } else {
        // Fallback DB check
        const dbExists = await checkBillNumberExists(val);
        if (dbExists) {
          showDialog({ title: 'Duplicate Invoice Number', message: `Invoice number ${val} already exists. Please use a different number.`, type: 'alert' });
          getNextBillNumber('INV-').then(setInvoiceNo);
        }
      }
    }
  };

  // Removed retroactive recalculation when partyDiscount changes because discount is now global.
  useEffect(() => {
    // Left empty to avoid React hook count mismatch or safely remove if preferred.
    // The discount is now calculated dynamically in the render cycle.
  }, [partyDiscount]);

  const handlePrint = () => {
    if (!validate()) return;

    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  const validate = () => {
    const bankName = settings.bankName || '';
    const acNo = settings.bankAccountNo || '';
    const ifsc = settings.bankIfsc || '';
    if (bankName.length > 0) {
      const bLen = bankName.replace(/ /g, '').length;
      if (bLen < 3 || bLen > 44) {
        showDialog({ title: 'Bank Details Error', message: 'Bank Name must be between 3 and 44 characters (excluding spaces).', type: 'alert' });
        return false;
      }
    }
    if (acNo.length > 0 && (acNo.length < 8 || acNo.length > 17)) {
      showDialog({ title: 'Bank Details Error', message: 'Bank Account Number must be between 8 and 17 digits.', type: 'alert' });
      return false;
    }
    if (ifsc.length > 0 && !/^[A-Za-z]{4}\d{7}$/.test(ifsc)) {
      showDialog({ title: 'Bank Details Error', message: 'IFSC Code must start with 4 letters followed by 7 numbers (e.g. SBIN0011372).', type: 'alert' });
      return false;
    }

    if (items.length === 0) {
      showDialog({ title: 'Item Missing', message: 'Please add at least one item.', type: 'alert' });
      return false;
    }
    if (!invoiceNo) {
      showDialog({ title: 'Invoice Number Missing', message: 'Please enter an Invoice No.', type: 'alert' });
      return false;
    }
    if (!partyId) {
      showDialog({ title: 'Name Missing', message: 'Please select a valid customer.', type: 'alert' });
      return false;
    }
    return true;
  };

  const [createdBillId, setCreatedBillId] = useState<string | null>(null);

  const handleSave = () => {
    if (!validate()) return;

    try {
      if (createdBillId) {
        updateBill(createdBillId, type, {
          billNumber: invoiceNo,
          partyId: partyId,
          date: billDate,
          subtotal: mrpTotal,
          discount: discountTotal,
          cgst: cgstAmount,
          sgst: sgstAmount,
          total: grandTotal,
          paymentAmount: addedAmount,
          lrNo: JSON.stringify(invoiceMeta),
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
        showDialog({ title: 'Success', message: `${type === 'return' ? 'Return' : 'Credit'} Bill updated successfully!`, type: 'alert' });
      } else {
        createBill({
          type: type,
          billNumber: invoiceNo,
          partyId: partyId,
          date: billDate,
          subtotal: mrpTotal,
          discount: discountTotal,
          cgst: cgstAmount,
          sgst: sgstAmount,
          total: grandTotal,
          paymentAmount: addedAmount,
          lrNo: JSON.stringify(invoiceMeta),
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
        }).then(id => {
          setCreatedBillId(id);
        }).catch(err => {
          const msg = typeof err === 'string' ? err : err.message;
          showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
          setHasUnsavedChanges(true);
        });
        showDialog({ title: 'Success', message: `${type === 'return' ? 'Return' : 'Credit'} Bill saved successfully!`, type: 'alert' });
      }
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = formStateStr;

    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message;
      showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill.', type: 'alert' });
    }
  };

  const handleSendSMS = async () => {
    if (!buyerPhone) {
      showDialog({ title: 'Missing Info', message: "Please enter customer's phone number first.", type: 'alert' });
      return;
    }
    try {
      const cleanPhone = buyerPhone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) throw new Error('Invalid phone number');

      const { formatBillMessage } = await import('../utils/smsFormatter');
      const smsData = {
        companyName: settings.companyName || 'NILANSU PUBLICATION',
        billType: type === 'return' ? 'RETURN CUM CHALLAN' : 'INVOICE CUM CHALLAN',
        billNo: invoiceNo || 'N/A',
        buyerName: buyerName,
        items: items,
        subtotal: mrpTotal,
        discount: discountTotal,
        grandTotal: grandTotal,
      };
      const message = formatBillMessage(smsData);

      const baseUrl = import.meta.env.VITE_API_URL || 'http://72.61.231.155:5004/api';
      const response = await fetch(`${baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message })
      });
      if (response.ok) {
        showDialog({ title: 'SMS Sent', message: `SMS sent to ${buyerName} at ${cleanPhone} successfully!`, type: 'alert' });
      } else {
        throw new Error('Failed to send SMS');
      }
    } catch (err) {
      console.error(err);
      showDialog({ title: 'SMS Failed', message: `Could not send SMS to ${buyerPhone}. Ensure it is a valid 10-digit number.`, type: 'alert' });
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      {/* Header Controls (No Print) */}
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">{type === 'return' ? 'Sales Return Bill' : 'Chalan / Credit Bill (Tax Invoice)'}</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <>
              <button 
                onClick={() => {
                  setItems([]);
                  setCreatedBillId(null);
                  setPartyId(null);
                  setBuyerName('');
                  setBuyerPhone('');
                  setBuyerAddress('');
                  setAdvanceAmount('');
                  setConsigneeName('');
                  setConsigneeAddress('');
                  setPartyDiscount(0);
                  getNextBillNumber('INV-').then(setInvoiceNo);
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
            onClick={() => setShowPaidStamp(!showPaidStamp)}
            className="whitespace-nowrap border border-green-600 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium shadow-sm transition-colors text-sm bg-white"
          >
            Paid Stamp
          </button>
          <button
            onClick={() => setShowCancelStamp(!showCancelStamp)}
            className={`whitespace-nowrap border px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm bg-white ${type === 'return'
                ? 'border-blue-600 text-blue-700 hover:bg-blue-50'
                : 'border-red-600 text-red-700 hover:bg-red-50'
              }`}
          >
            {type === 'return' ? 'Received Stamp' : 'Cancelled Stamp'}
          </button>
          {!viewBill && (
            <button onClick={handleSendSMS} className="whitespace-nowrap bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-medium shadow-sm transition-colors text-sm">
              Send SMS
            </button>
          )}
          <button 
            onClick={handlePrint} 
            disabled={!viewBill && (hasUnsavedChanges || !createdBillId)}
            className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
          <div className={`absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 border-4 rounded-full w-64 h-64 flex items-center justify-center opacity-30 pointer-events-none z-0 ${type === 'return' ? 'text-blue-600 border-blue-600' : 'text-red-600 border-red-600'
            }`}>
            <span className="text-5xl font-bold uppercase tracking-widest text-center">
              {type === 'return' ? 'RECEIVED' : 'CANCELLED'}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="relative text-center py-2 font-bold text-lg border-b-2 border-black tracking-wide">
          <img src="/logo.png" alt="Logo" className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 object-contain print:block" />
          {type === 'return' ? 'RETURN CUM CHALLAN' : 'INVOICE CUM CHALLAN'}
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-normal italic text-gray-600">Original for Recipient</span>
        </div>

        {/* Top Details Grid */}
        <div className="flex flex-col text-sm border-b-2 border-black min-h-[220px]">
          {/* Top Half */}
          <div className="flex border-b-2 border-black">
            {/* Seller Details (Left) */}
            <div className="w-1/2 border-r-2 border-black p-2 flex flex-col justify-start min-h-[140px]">
              <input 
                value={settings.companyName} 
                onChange={e => updateSettings({ companyName: e.target.value })} 
                className="font-bold text-3xl uppercase w-full bg-transparent outline-none" 
                readOnly={!!viewBill}
              />
              <div className="font-bold text-[15px] w-full">Publishers and Book Sellers</div>
              <div className="w-full text-[15px] mt-1">{settings.companyAddress}</div>
              <div className="w-full text-[15px]">{settings.companyCity}</div>
              <div className="flex gap-2 text-[15px] mt-1"><span className="whitespace-nowrap">IT PAN -</span><span className="w-full uppercase">{settings.companyPan}</span></div>
              <div className="flex gap-2 text-[15px]"><span className="whitespace-nowrap">Phone No.-</span><span className="w-full">{settings.companyContact}</span></div>
            </div>

            {/* Invoice Meta Grid (Right) */}
            <div className="w-1/2 flex flex-col text-[13px]">
              <div className="flex flex-1 border-b border-black">
                <div className="w-1/2 border-r border-black p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Invoice No.</span>
                  <input value={invoiceNo} disabled={!!viewBill} onChange={e => handleInvoiceNoChange(e.target.value)} className="font-bold w-full max-w-[180px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0 disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Date:-</span>
                  <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="font-bold w-full max-w-[150px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0 cursor-pointer" readOnly={!!viewBill} disabled={!!viewBill} />
                </div>
              </div>
              <div className="flex flex-1 border-b border-black">
                <div className="w-1/2 border-r border-black p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Transport Name:</span>
                  <input value={invoiceMeta.dispatchedThrough} onChange={e => setInvoiceMeta({ ...invoiceMeta, dispatchedThrough: e.target.value })} className="font-bold w-full max-w-[180px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" readOnly={!!viewBill} />
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Transport no:</span>
                  <input value={invoiceMeta.dispatchDocNo} onChange={e => setInvoiceMeta({ ...invoiceMeta, dispatchDocNo: e.target.value })} className="font-bold w-full max-w-[150px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" readOnly={!!viewBill} />
                </div>
              </div>
              <div className="flex flex-1 border-b border-black">
                <div className="w-1/2 border-r border-black p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Delivery Note Date</span>
                  <input type="date" value={invoiceMeta.deliveryNoteDate} onChange={e => setInvoiceMeta({ ...invoiceMeta, deliveryNoteDate: e.target.value })} className="font-bold w-full max-w-[150px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0 cursor-pointer" readOnly={!!viewBill} disabled={!!viewBill} />
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Order Date</span>
                  <input type="date" value={invoiceMeta.orderDate} onChange={e => setInvoiceMeta({ ...invoiceMeta, orderDate: e.target.value })} className="font-bold w-full max-w-[150px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0 cursor-pointer" readOnly={!!viewBill} disabled={!!viewBill} />
                </div>
              </div>
              <div className="flex flex-1">
                <div className="w-1/2 border-r border-black p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Despatched through</span>
                  <div className="relative w-full max-w-[180px] mt-1 print:hidden" ref={despatchDropdownRef}>
                    <div
                      onClick={() => setDespatchDropdownOpen(!despatchDropdownOpen)}
                      className="flex justify-between items-center font-bold w-full outline-none bg-background cursor-pointer border border-border rounded px-2 py-1.5 text-[12px] hover:border-gray-400 focus:border-blue-500 transition-all shadow-sm"
                    >
                      <span>{invoiceMeta.termsOfPayment || 'ROAD'}</span>
                      <svg className={`fill-current h-4 w-4 text-gray-500 transition-transform ${despatchDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                    {despatchDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-background border border-border shadow-xl rounded-md z-50 overflow-hidden text-sm">
                        {['ROAD', 'TRAIN', 'AIR', 'BY HAND'].map((method) => (
                          <div
                            key={method}
                            className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors border-b border-border/50 last:border-0 font-medium"
                            onClick={() => {
                              setInvoiceMeta({ ...invoiceMeta, termsOfPayment: method });
                              setDespatchDropdownOpen(false);
                            }}
                          >
                            {method}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hidden print:block font-bold w-full outline-none bg-transparent mt-1">
                    {invoiceMeta.termsOfPayment || 'ROAD'}
                  </div>
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-start">
                  <span className="text-[11px] text-gray-600 font-medium">Destination</span>
                  <input value={invoiceMeta.destination} onChange={e => setInvoiceMeta({ ...invoiceMeta, destination: e.target.value })} className="font-bold w-full max-w-[180px] outline-none border border-gray-300 rounded px-2 py-1.5 mt-1 text-[12px] bg-background hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none print:mt-0" readOnly={!!viewBill} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Half */}
          <div className="flex flex-1">
            {/* Buyer Details (Full Width) */}
            <div className="w-full p-2 flex flex-col flex-1">
              <div className="flex items-start gap-1">
                <span className="text-sm">Buyer:-</span>
                <div className="flex-1 flex justify-between gap-4">
                  <div className="flex-1 max-w-[60%] flex flex-col">
                    <div className="relative mb-1" ref={partyDropdownRef}>
                      <input
                        value={buyerName}
                        onChange={e => {
                          handlePartyLookup(e.target.value, 'name');
                          setPartySearch(e.target.value);
                          setPartyDropdownOpen(true);
                        }}
                        onFocus={() => setPartyDropdownOpen(true)}
                        placeholder="Search & Enter Buyer Name or Phone..."
                        className="font-bold w-full outline-none bg-transparent"
                        readOnly={!!viewBill}
                      />

                      {partyDropdownOpen && parties.filter(p => {
                        const isSelectedMatch = partyId && parties.find(x => x.id === partyId)?.name === buyerName;
                        if (isSelectedMatch) return true;
                        return p.name.toLowerCase().includes(buyerName.toLowerCase()) || p.phone.includes(buyerName);
                      }).length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-[400px] max-w-[90vw] bg-background border border-border shadow-xl rounded-md z-50 max-h-60 overflow-y-auto no-print text-sm text-left">
                          {parties.filter(p => {
                            const isSelectedMatch = partyId && parties.find(x => x.id === partyId)?.name === buyerName;
                            if (isSelectedMatch) return true;
                            return p.name.toLowerCase().includes(buyerName.toLowerCase()) || p.phone.includes(buyerName);
                          }).map(p => (
                            <div
                              key={p.id}
                              className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                              onClick={() => {
                                handlePartyLookup(p.phone, 'phone');
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
                    <textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="Buyer Address" rows={2} className="w-full outline-none bg-transparent mt-1 resize-none overflow-y-auto leading-tight print:hidden" readOnly={!!viewBill} />
                    <div className="hidden print:block w-full mt-1 leading-tight whitespace-pre-wrap break-words">{buyerAddress}</div>
                    <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="Buyer Phone" className="w-full outline-none bg-transparent mt-1 print:hidden" readOnly={!!viewBill} />
                    <div className="hidden print:block w-full mt-1 leading-tight">{buyerPhone}</div>
                  </div>
                  {partyId && (() => {
                    const selectedParty = parties.find(p => p.id === partyId);
                    if (!selectedParty) return null;
                    const hasBankDetails = selectedParty.bankName || selectedParty.bankAccountNo || selectedParty.bankIfsc;
                    if (!hasBankDetails) return null;
                    return (
                      <div className="text-[11px] text-gray-700 flex flex-col items-end text-right min-w-[200px]">
                        <div className="font-bold underline mb-1">Bank Details:</div>
                        {selectedParty.bankName && <div>Bank: {selectedParty.bankName}</div>}
                        {selectedParty.bankAccountNo && <div>A/c No: {selectedParty.bankAccountNo}</div>}
                        {selectedParty.bankIfsc && <div>IFSC: {selectedParty.bankIfsc}</div>}
                      </div>
                    );
                  })()}
                </div>
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
              readOnly={!!viewBill}
            />
          </div>

          {/* Discount and Total Rows */}
          <div className="flex border-t border-black text-sm font-bold border-r-0">
            <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
              MRP TOTAL
            </div>
            <div className="w-[15%] text-right pr-2 py-1">
              {mrpTotal.toFixed(2)}
            </div>
          </div>
          <div className="flex border-t border-black text-sm border-r-0">
            <div className="w-[85%] text-right pr-4 py-1 border-r border-black flex justify-end items-center gap-2">
              <span className="no-print text-xs text-muted-foreground">Party Discount:</span>
              <input
                type="number"
                min="0"
                value={partyDiscount}
                onChange={e => applyGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-12 border-2 border-gray-300 rounded text-center font-bold no-print py-0.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                readOnly={!!viewBill}
              />
              <span className="hidden print:inline font-bold pr-2">{partyDiscount}%</span>
              Less: Discount
            </div>
            <div className="w-[15%] text-right pr-2 py-1">
              {discountTotal.toFixed(2)}
            </div>
          </div>
          <div className="flex border-t border-black text-sm">
            <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
              Round Off
            </div>
            <div className="w-[15%] text-right pr-2 py-1">
              {roundOff.toFixed(2)}
            </div>
          </div>
          {partyOutstanding > 0 && (
            <div className="flex border-t-2 border-black text-sm font-bold bg-muted/50 print:bg-transparent">
              <div className="w-[85%] text-right pr-4 py-1 border-r border-black flex justify-end items-center gap-2">
                <div className="flex items-center gap-2 no-print text-xs">
                  <span className="font-bold text-foreground">Amount to receive (₹{partyOutstanding}) | Add: Previous Due</span>
                  <input 
                    type="number" 
                    value={advanceAmount} 
                    onChange={e => {
                      const val = e.target.value;
                      if (Number(val) > partyOutstanding) {
                        setAdvanceAmount(partyOutstanding.toString());
                      } else if (Number(val) < 0) {
                        setAdvanceAmount('0');
                      } else {
                        setAdvanceAmount(val);
                      }
                    }}
                    max={partyOutstanding}
                    min="0"
                    className="w-24 px-2 py-0.5 border border-border rounded text-center outline-none bg-background text-foreground font-bold" 
                    placeholder="0.00"
                    readOnly={!!viewBill}
                  />
                </div>
                <span className="hidden print:block text-xs font-semibold">Add: Previous Due</span>
              </div>
              <div className="w-[15%] text-right pr-2 py-1 text-green-600 dark:text-green-400">
                + {addedAmount.toFixed(2)}
              </div>
            </div>
          )}

          <div className="flex border-t-2 border-black text-sm font-bold text-lg">
            <div className="w-[85%] text-right pr-4 py-1 border-r border-black">
              GRAND TOTAL
            </div>
            <div className="w-[15%] text-right pr-2 py-1">
              {netPayable.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="border-b-2 border-black p-2 text-sm flex gap-4 items-center">
          <span className="text-[13px]">Amount Chargeable (in words)</span>
          <span className="font-bold text-[13px]">{numberToWords(netPayable)} only.</span>
        </div>

        {/* Footer info */}
        <div className="flex flex-col border-b-2 border-black text-[13px]">
          <div className="p-2 border-b border-black">
            <p className="underline mb-1">Company's Bank Details :-</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-bold">
              <div className="flex gap-2"><span>Bank Name :-</span><input value={settings.bankName} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''); if (val.replace(/ /g, '').length <= 44) updateSettings({ bankName: val }); }} className="outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span>A/c. No.</span><input value={settings.bankAccountNo} maxLength={17} onChange={e => { const val = e.target.value.replace(/\D/g, ''); updateSettings({ bankAccountNo: val }) }} className="outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span>IFSC -</span><input value={settings.bankIfsc} maxLength={11} onChange={e => { let val = e.target.value.toUpperCase(); let formatted = ''; for (let i = 0; i < val.length; i++) { if (i < 4) { if (/[A-Z]/.test(val[i])) formatted += val[i]; } else { if (/[0-9]/.test(val[i])) formatted += val[i]; } } updateSettings({ bankIfsc: formatted }) }} className="outline-none bg-transparent uppercase" /></div>
            </div>
          </div>
          <div className="flex">
            <div className="w-1/2 border-r border-black p-2">
              <p>We declare that this Invoice shows the actual</p>
              <p>price of the goods described and that all</p>
              <p>particulars are true and correct</p>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">Credit Limit: 90 Days</p>
            </div>
            <div className="w-1/2 p-2 relative min-h-[80px]">
              <div className="flex flex-col text-sm items-end absolute top-2 right-4">
                <div className="font-bold text-right">{settings.companyName}</div>
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
