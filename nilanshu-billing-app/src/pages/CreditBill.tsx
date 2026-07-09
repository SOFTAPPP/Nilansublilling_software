import React, { useState } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';

export default function CreditBill() {
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
  const [partyDiscount, setPartyDiscount] = useState(0);
  const [partyId, setPartyId] = useState<string | null>(null);

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
  // Calculate CGST and SGST (assuming 9% each for this example)
  const cgstRate = 9;
  const sgstRate = 9;
  const cgstAmount = (totalAmount * cgstRate) / 100;
  const sgstAmount = (totalAmount * sgstRate) / 100;
  const grandTotal = totalAmount + cgstAmount + sgstAmount;

  const handlePrint = () => {
    window.print();
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
        type: 'credit',
        billNumber: invoiceNo,
        partyId: partyId,
        subtotal: totalAmount,
        discount: 0, // Discount is applied per item mostly or not stored globally
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
      setInvoiceNo('');
    } catch (err) {
      showDialog({ title: 'Save Failed', message: 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

  const handleSendSMS = () => {
    if (!buyerPhone) {
      showDialog({ title: 'Missing Info', message: "Please enter customer's phone number first.", type: 'alert' });
      return;
    }
    showDialog({ title: 'SMS Sent', message: `SMS sent to ${buyerName} at ${buyerPhone} successfully!`, type: 'alert' });
  };

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      {/* Header Controls (No Print) */}
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Chalan / Credit Bill (Tax Invoice)</h2>
        <div className="flex gap-4">
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Save to Database</button>
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
          <button 
            onClick={handleSendSMS}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
          >
            Send SMS
          </button>
          <button 
            onClick={handlePrint}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Print Invoice
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="a4-page border border-black relative flex flex-col">
        
        {/* Stamps overlay */}
        {showPaidStamp && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-green-600 border-4 border-green-600 rounded-full w-64 h-64 flex items-center justify-center opacity-40 pointer-events-none z-50">
            <span className="text-6xl font-bold uppercase tracking-widest">PAID</span>
          </div>
        )}
        {showCancelStamp && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 text-red-600 border-4 border-red-600 rounded-full w-64 h-64 flex items-center justify-center opacity-40 pointer-events-none z-50">
            <span className="text-5xl font-bold uppercase tracking-widest text-center">CANCELLED</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center py-2 border-b border-black font-semibold text-lg flex justify-between px-4">
          <span className="w-1/3"></span>
          <span className="w-1/3">TAX INVOICE</span>
          <span className="w-1/3 text-right text-xs font-normal mt-1">(ORIGINAL FOR RECIPIENT)</span>
        </div>

        {/* Top Details Grid */}
        <div className="grid grid-cols-2 text-sm border-b border-black">
          {/* Left Column (Seller, Consignee, Buyer) */}
          <div className="border-r border-black flex flex-col">
            {/* Seller Details */}
            <div className="p-2 flex flex-col gap-1 flex-1">
              <input value={settings.companyName} onChange={e => updateSettings({companyName: e.target.value})} placeholder="Company Name" className="font-bold text-lg w-full outline-none bg-transparent" />
              <input value={settings.companyAddress} onChange={e => updateSettings({companyAddress: e.target.value})} placeholder="Address Line 1" className="w-full outline-none bg-transparent" />
              <input value={settings.companyCity} onChange={e => updateSettings({companyCity: e.target.value})} placeholder="City & Pin" className="w-full outline-none bg-transparent" />
              <div className="flex gap-2"><span className="whitespace-nowrap">GSTIN/UIN:</span><input value={settings.companyGstin} onChange={e => updateSettings({companyGstin: e.target.value})} className="w-full outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span className="whitespace-nowrap">State Name:</span><input value={settings.companyState} onChange={e => updateSettings({companyState: e.target.value})} className="w-full outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span className="whitespace-nowrap">Contact:</span><input value={settings.companyContact} onChange={e => updateSettings({companyContact: e.target.value})} className="w-full outline-none bg-transparent" /></div>
              <div className="flex gap-2"><span className="whitespace-nowrap">E-Mail:</span><input value={settings.companyEmail} onChange={e => updateSettings({companyEmail: e.target.value})} className="w-full outline-none bg-transparent" /></div>
            </div>
            
            {/* Consignee (Ship to) */}
            <div className="border-t border-black p-2 flex-1">
              <p className="font-semibold text-xs text-gray-500 mb-1">Consignee (Ship to)</p>
              <input value={consigneeName} onChange={e => setConsigneeName(e.target.value)} placeholder="Consignee Name" className="font-bold w-full outline-none bg-transparent" />
              <input value={consigneeAddress} onChange={e => setConsigneeAddress(e.target.value)} placeholder="Consignee Address" className="w-full outline-none bg-transparent" />
              <div className="flex gap-2 mt-1"><span>State:</span><input value={consigneeState} onChange={e => setConsigneeState(e.target.value)} className="w-full outline-none bg-transparent" /></div>
            </div>

            {/* Buyer (Bill to) */}
            <div className="border-t border-black p-2 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-xs text-gray-500">Buyer (Bill to)</p>
                {partyDiscount > 0 && <span className="text-green-600 font-bold text-xs ml-auto">Discount: {partyDiscount}%</span>}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-16">Phone:</span>
                <input 
                  list="party-phones"
                  value={buyerPhone} onChange={e => handlePartyLookup(e.target.value, 'phone')}
                  placeholder="Lookup by Phone"
                  className="flex-1 outline-none bg-transparent border-b border-gray-400"
                />
                <datalist id="party-phones">
                  {parties.map(p => <option key={p.id} value={p.phone}>{p.name}</option>)}
                </datalist>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-16">Name:</span>
                <input 
                  list="party-names"
                  value={buyerName} onChange={e => handlePartyLookup(e.target.value, 'name')}
                  placeholder="Lookup by Name"
                  className="font-bold flex-1 outline-none bg-transparent border-b border-gray-400"
                />
                <datalist id="party-names">
                  {parties.map(p => <option key={p.id} value={p.name}>{p.phone}</option>)}
                </datalist>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-16">Address:</span>
                <input 
                  value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)}
                  className="flex-1 outline-none bg-transparent border-b border-gray-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16">State:</span>
                <input 
                  value={buyerState} onChange={e => setBuyerState(e.target.value)}
                  className="flex-1 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Invoice Meta */}
          <div className="grid grid-cols-2">
            <div className="border-r border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Invoice No.</p>
              <input 
                value={invoiceNo} 
                onChange={e => setInvoiceNo(e.target.value)}
                className="font-bold w-full outline-none bg-transparent"
              />
            </div>
            <div className="border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Dated</p>
              <p className="font-bold">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
            <div className="border-r border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Delivery Note</p>
              <input value={invoiceMeta.deliveryNote} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNote: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Mode/Terms of Payment</p>
              <input value={invoiceMeta.termsOfPayment} onChange={e => setInvoiceMeta({...invoiceMeta, termsOfPayment: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-r border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Reference No. & Date.</p>
              <input value={invoiceMeta.refNo} onChange={e => setInvoiceMeta({...invoiceMeta, refNo: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Other References</p>
              <input value={invoiceMeta.otherRef} onChange={e => setInvoiceMeta({...invoiceMeta, otherRef: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-r border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Buyer's Order No.</p>
              <input value={invoiceMeta.dispatchDocNo} onChange={e => setInvoiceMeta({...invoiceMeta, dispatchDocNo: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Dated</p>
              <input type="date" value={invoiceMeta.deliveryNoteDate} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNoteDate: e.target.value})} className="w-full outline-none bg-transparent font-bold text-xs" />
            </div>
            <div className="border-r border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Dispatch Doc No.</p>
              <input value={invoiceMeta.dispatchedThrough} onChange={e => setInvoiceMeta({...invoiceMeta, dispatchedThrough: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Delivery Note Date</p>
              <input type="date" value={invoiceMeta.deliveryNoteDate} onChange={e => setInvoiceMeta({...invoiceMeta, deliveryNoteDate: e.target.value})} className="w-full outline-none bg-transparent font-bold text-xs" />
            </div>
            <div className="border-r border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Dispatched through</p>
              <input value={invoiceMeta.dispatchedThrough} onChange={e => setInvoiceMeta({...invoiceMeta, dispatchedThrough: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="border-b border-black p-2 flex flex-col justify-center">
              <p className="text-xs text-gray-500">Destination</p>
              <input value={invoiceMeta.destination} onChange={e => setInvoiceMeta({...invoiceMeta, destination: e.target.value})} className="w-full outline-none bg-transparent font-bold" />
            </div>
            <div className="col-span-2 p-2 flex flex-col">
              <p className="text-xs text-gray-500">Terms of Delivery</p>
              <textarea value={invoiceMeta.termsOfDelivery} onChange={e => setInvoiceMeta({...invoiceMeta, termsOfDelivery: e.target.value})} className="w-full outline-none bg-transparent resize-none flex-1 font-bold" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="flex-1 flex flex-col border-b border-black border-t-0">
          <div className="flex-1">
            <BillEngine 
              items={items} 
              onChange={setItems} 
              columns={['sno', 'name', 'hsn', 'qty', 'rate', 'per', 'amount']}
              globalDiscount={partyDiscount}
              maxItems={10}
            />
          </div>
          
          {/* Tax rows added below items inside the table container visually */}
          {items.length > 0 && (
             <div className="flex border-b border-black border-x">
               <div className="w-[58%] border-r border-black flex flex-col items-end pr-4 py-2">
                 <p>CGST</p>
                 <p>SGST</p>
               </div>
               <div className="w-[12%] border-r border-black flex flex-col items-end pr-2 py-2">
                 <p>{cgstRate} %</p>
                 <p>{sgstRate} %</p>
               </div>
               <div className="w-[30%] flex flex-col items-end pr-2 py-2">
                 <p>{cgstAmount.toFixed(2)}</p>
                 <p>{sgstAmount.toFixed(2)}</p>
               </div>
             </div>
          )}
          
          {/* Total Row */}
          <div className="flex font-bold border-t border-b border-black bg-muted/20">
            <div className="w-[48%] border-r border-l border-black text-right pr-4 py-1">Total</div>
            <div className="w-[10%] border-r border-black text-center py-1">{totalQuantity}</div>
            <div className="w-[12%] border-r border-black"></div>
            <div className="w-[30%] text-right pr-2 py-1 border-r border-black">₹ {grandTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="border-x border-b border-black p-2 text-sm flex gap-2">
          <span>Amount Chargeable (in words)</span>
          <span className="font-bold">Indian Rupees {numberToWords(grandTotal)}</span>
          <span className="ml-auto italic">E. & O.E</span>
        </div>

        {/* Tax Breakdown table */}
        <table className="w-full text-xs text-center border-collapse border border-black border-x">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black font-normal" rowSpan={2}>HSN/SAC</th>
              <th className="border-r border-black font-normal" rowSpan={2}>Taxable Value</th>
              <th className="border-r border-black font-normal" colSpan={2}>CGST</th>
              <th className="border-r border-black font-normal" colSpan={2}>SGST/UTGST</th>
              <th className="font-normal" rowSpan={2}>Total Tax Amount</th>
            </tr>
            <tr className="border-b border-black">
              <th className="border-r border-t border-black font-normal">Rate</th>
              <th className="border-r border-t border-black font-normal">Amount</th>
              <th className="border-r border-t border-black font-normal">Rate</th>
              <th className="border-r border-t border-black font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className="border-r border-black">{item.hsn}</td>
                <td className="border-r border-black">{item.amount.toFixed(2)}</td>
                <td className="border-r border-black">{cgstRate}%</td>
                <td className="border-r border-black">{((item.amount * cgstRate) / 100).toFixed(2)}</td>
                <td className="border-r border-black">{sgstRate}%</td>
                <td className="border-r border-black">{((item.amount * sgstRate) / 100).toFixed(2)}</td>
                <td>{(((item.amount * cgstRate) / 100) + ((item.amount * sgstRate) / 100)).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t border-black font-bold bg-gray-50">
              <td className="border-r border-black text-right pr-2">Total</td>
              <td className="border-r border-black">{totalAmount.toFixed(2)}</td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black">{cgstAmount.toFixed(2)}</td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black">{sgstAmount.toFixed(2)}</td>
              <td>{(cgstAmount + sgstAmount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        {/* Tax Amount in words */}
        <div className="border-x border-b border-black p-2 text-sm flex gap-2">
          <span>Tax Amount (in words) :</span>
          <span className="font-bold">Indian Rupees {numberToWords(cgstAmount + sgstAmount)}</span>
        </div>

        {/* Footer info */}
        <div className="flex border-x border-b border-black text-sm">
          <div className="w-1/2 border-r border-black p-2">
            <div className="flex gap-2 mb-4">
              <span>Company's PAN:</span>
              <input value={settings.companyPan} onChange={e => updateSettings({companyPan: e.target.value})} className="font-bold outline-none bg-transparent w-full" />
            </div>
            <p className="underline mb-1">Declaration</p>
            <p className="text-xs">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          </div>
          <div className="w-1/2 p-2 relative">
            <p className="underline mb-1">Company's Bank Details</p>
            <div className="grid grid-cols-[110px_1fr] gap-x-2 text-xs mb-4">
              <span>A/c Holder's Name</span>
              <div className="flex gap-1"><span>:</span><input value={settings.bankAccountName} onChange={e => updateSettings({bankAccountName: e.target.value})} className="font-bold outline-none bg-transparent w-full" /></div>
              <span>Bank Name</span>
              <div className="flex gap-1"><span>:</span><input value={settings.bankName} onChange={e => updateSettings({bankName: e.target.value})} className="font-bold outline-none bg-transparent w-full" /></div>
              <span>A/c No.</span>
              <div className="flex gap-1"><span>:</span><input value={settings.bankAccountNo} onChange={e => updateSettings({bankAccountNo: e.target.value})} className="font-bold outline-none bg-transparent w-full" /></div>
              <span>Branch & IFS Code</span>
              <div className="flex gap-1"><span>:</span><input value={settings.bankIfsc} onChange={e => updateSettings({bankIfsc: e.target.value})} className="font-bold outline-none bg-transparent w-full" /></div>
            </div>
            <div className="absolute bottom-2 right-2 text-center flex flex-col items-center">
              <div className="flex text-xs mb-8">
                <span>for </span><input value={settings.companyName} readOnly className="font-bold outline-none bg-transparent w-32 text-center" />
              </div>
              <p className="text-xs border-t border-black pt-1 px-4">Authorised Signatory</p>
            </div>
          </div>
        </div>
        
        <div className="text-center text-xs py-1 border-x border-b border-black">
          <p>SUBJECT TO KOLKATA JURISDICTION</p>
          <p>This is a Computer Generated Invoice</p>
        </div>

      </div>
    </div>
  );
}
