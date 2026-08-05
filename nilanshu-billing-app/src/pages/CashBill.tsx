import { useEffect, useRef, useState } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { checkBillNumberExists, getNextBillNumber, getNextBillNumberSync } from '../utils/billNumber';
import { getLocalDateString } from '../utils/dateUtils';
import { numberToWords } from '../utils/numberToWords';

export default function CashBill({ viewBill }: { viewBill?: any }) {
  const { settings, updateSettings, createBill, parties, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState('');
  const bills = useStore(state => state.bills);
  const [memoNo, setMemoNo] = useState(() => viewBill ? (viewBill.billNumber || '') : getNextBillNumberSync('CSH-', bills));

  // Auto-fill next memo number
  // (No longer needed to run asynchronously on mount since we initialized it synchronously)
  useEffect(() => {
    // Synchronously initialized
  }, []);
  const [billDate, setBillDate] = useState(() => getLocalDateString());
  const [showPaidStamp, setShowPaidStamp] = useState(true);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [defaultDiscount, setDefaultDiscount] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
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
      if (viewBill.deductedAmount && viewBill.deductedAmount < 0) {
        setAdvanceAmount(Math.abs(viewBill.deductedAmount).toString());
      } else {
        setAdvanceAmount('');
      }
    }
  }, [viewBill, parties]);

  const handlePartyLookup = (val: string) => {
    setPartyName(val);
    const foundParty = parties.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (foundParty) {
      setPartyName(foundParty.name);
      setPartyId(foundParty.id);
      const discount = foundParty.discountPercentage || 0;
      setDefaultDiscount(discount);
    } else {
      setPartyId(null);
      setDefaultDiscount(0);
    }
  };

  // Calculate totals (discount applies to totalAmount)
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
  const totalAmount = mrpTotal; // Base sum is just MRP total now
  const discountTotal = (totalAmount * defaultDiscount) / 100;
  const subtotalBeforeRound = totalAmount - discountTotal;
  const roundOff = Math.round(subtotalBeforeRound) - subtotalBeforeRound;
  const grandTotal = Math.round(subtotalBeforeRound);

  const partyOutstanding = parties.find(p => p.id === partyId)?.outstandingBalance || 0;
  const addedAmount = Number(advanceAmount) || 0;
  const netPayable = grandTotal + addedAmount;

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
    if (!memoNo) {
      showDialog({ title: 'Memo Number Missing', message: 'Please enter a Memo No.', type: 'alert' });
      return false;
    }
    return true;
  };

  // Validate memo number on change - check for duplicates
  const handleMemoNoChange = async (val: string) => {
    const fullNo = 'CSH-' + val.replace(/^CSH-/, '');
    setMemoNo(fullNo);
    if (val.replace(/^CSH-/, '').length > 0) {
      // Check local bills state first for immediate feedback (including optimistically deleted bills)
      const localExists = useStore.getState().bills.some(b => b.billNumber === fullNo);

      if (localExists) {
        showDialog({ title: 'Duplicate Bill Number', message: `Bill number ${fullNo} already exists. Please use a different number.`, type: 'alert' });
        // Reset back to next available
        getNextBillNumber('CSH-').then(setMemoNo);
      } else {
        // Fallback to DB check
        const dbExists = await checkBillNumberExists(fullNo);
        if (dbExists) {
          showDialog({ title: 'Duplicate Bill Number', message: `Bill number ${fullNo} already exists. Please use a different number.`, type: 'alert' });
          getNextBillNumber('CSH-').then(setMemoNo);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await createBill({
        type: 'cash',
        billNumber: memoNo,
        partyId: partyId,
        date: billDate,
        subtotal: mrpTotal,
        cgst: 0,
        sgst: 0,
        total: grandTotal,
        deductedAmount: -addedAmount,
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
    if (!validate()) return;

    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Cash Memo</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <button onClick={handleSave} className="whitespace-nowrap bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors text-sm">
              Save
            </button>
          )}
          <button onClick={() => setShowPaidStamp(!showPaidStamp)} className="whitespace-nowrap border border-green-600 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 font-medium shadow-sm transition-colors text-sm bg-background">
            Paid Stamp
          </button>
          <button onClick={handlePrint} className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm">
            Print Bill
          </button>
        </div>
      </div>

      {/* Bill Canvas */}
      <div className="a4-page relative flex flex-col p-4 print:p-2">

        {/* Stamps overlay */}
        {showPaidStamp && (
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-green-600 border-4 border-green-600 rounded-full w-48 h-48 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <span className="text-5xl font-bold uppercase tracking-widest">PAID</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center flex flex-col items-center relative">
          <img src="/logo.png" alt="Logo" className="absolute left-0 top-0 w-14 h-14 object-contain" />
          <input 
            value={settings.companyName} 
            onChange={e => updateSettings({ companyName: e.target.value })} 
            className="text-3xl font-bold uppercase tracking-wide text-center w-full bg-transparent outline-none" 
          />
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
        <div className="flex flex-col mb-4 bg-muted/20 print:bg-transparent rounded-xl p-4 print:p-0 border border-border print:border-none gap-4 min-h-[170px] print:min-h-0">
          
          {/* Top Row: Center CASH MEMO */}
          <div className="flex justify-center w-full relative">
            <span className="hidden print:block absolute right-2 top-0 text-[12px] italic text-gray-500 whitespace-nowrap">Original for Recipient</span>
            <div className="text-primary print:text-black font-extrabold text-xl tracking-widest uppercase -mt-2">
              CASH MEMO
            </div>
          </div>

          {/* Bottom Row: Buyer, Memo No, Date */}
          <div className="flex justify-between items-start w-full gap-4 print:items-end">
            
            {/* Buyer Block */}
            <div className="flex flex-col gap-1 relative w-[380px] print:w-auto print:flex-1" ref={partyDropdownRef}>
              <div className="flex items-baseline gap-2">
                <span className="text-sm">Buyer:-</span>
                <input
                  type="text"
                  value={partyName}
                  onChange={e => { handlePartyLookup(e.target.value); setPartyDropdownOpen(true); }}
                  onFocus={() => setPartyDropdownOpen(true)}
                  className="outline-none w-full bg-transparent font-bold text-sm text-foreground"
                  placeholder="Search & Enter Buyer Name or Phone..."
                />
              </div>

              {partyId && (
                <div className="text-[14px] text-foreground font-medium mt-1 pl-12 flex flex-col gap-1">
                  {parties.find(p => p.id === partyId)?.address && <div>{parties.find(p => p.id === partyId)?.address}</div>}
                  {parties.find(p => p.id === partyId)?.phone && <div>{parties.find(p => p.id === partyId)?.phone}</div>}
                </div>
              )}

              {partyDropdownOpen && parties.filter(p => {
                const isSelectedMatch = partyId && parties.find(x => x.id === partyId)?.name === partyName;
                if (isSelectedMatch) return true;
                return p.name.toLowerCase().includes(partyName.toLowerCase()) || p.phone.includes(partyName);
              }).length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-background border border-border shadow-2xl rounded-lg z-50 max-h-60 overflow-y-auto no-print text-sm">
                    {parties.filter(p => {
                      const isSelectedMatch = partyId && parties.find(x => x.id === partyId)?.name === partyName;
                      if (isSelectedMatch) return true;
                      return p.name.toLowerCase().includes(partyName.toLowerCase()) || p.phone.includes(partyName);
                    }).map(p => (
                      <div
                        key={p.id}
                        className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors border-b border-border/50 last:border-0 flex justify-between items-center"
                        onClick={() => {
                          setPartyName(p.name);
                          setPartyId(p.id);
                          const customerDiscount = p.discountPercentage || 0;
                          setDefaultDiscount(customerDiscount);
                          setPartyDropdownOpen(false);

                          // Only apply customer default discount to items that have NO manually set discount
                          setItems(prevItems => prevItems.map(item => {
                            if (!item.discountPercent || item.discountPercent === 0) {
                              const discountAmount = (item.mrp * customerDiscount) / 100;
                              const newAmount = (item.mrp - discountAmount) * item.quantity;
                              return { ...item, discountPercent: customerDiscount, amount: newAmount };
                            }
                            return item;
                          }));
                        }}
                      >
                        <div className="font-bold text-foreground text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Memo No and Date Block */}
            <div className="flex items-start gap-3 shrink-0">
              <div className="flex flex-col bg-background print:bg-transparent border border-border print:border-none rounded-lg px-4 py-2 shadow-sm print:shadow-none min-w-[120px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Memo No.</span>
                <div className="flex items-center">
                  <span className="font-bold text-xs text-foreground">CSH-</span>
                  <input value={memoNo.replace(/^CSH-/, '')} onChange={e => handleMemoNoChange(e.target.value)} className="outline-none w-16 bg-transparent font-bold text-xs text-foreground placeholder:text-muted-foreground" placeholder="178" />
                </div>
              </div>

              <div className="flex flex-col bg-background print:bg-transparent border border-border print:border-none rounded-lg px-4 py-2 shadow-sm print:shadow-none min-w-[120px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Date</span>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="outline-none bg-transparent font-bold text-xs text-foreground cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table wrapper */}
        <div className="flex-1 border border-black border-b-0 relative z-10 flex flex-col mt-2">
          <BillEngine
            items={items}
            onChange={setItems}
            columns={['sno', 'qty', 'name', 'mrp', 'amount']}
          />
        </div>

        {/* Bottom Section */}
        <div className="flex border border-black text-sm z-10 relative">
          {/* Left Half */}
          <div className="w-[60%] border-r border-black p-3 flex flex-col justify-between">
            <div>
              <p className="font-bold underline mb-1 text-xs">Bank Details:</p>
              <div className="flex items-center gap-2 text-xs mb-1"><span className="font-semibold whitespace-nowrap flex-shrink-0">Bank Name:</span><input value={settings.bankName} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''); if (val.replace(/ /g, '').length <= 44) updateSettings({ bankName: val }); }} className="outline-none bg-transparent w-full" placeholder="Bank Name" /></div>
              <div className="flex items-center gap-2 text-xs"><span className="font-semibold whitespace-nowrap flex-shrink-0">A/c No:</span><input value={settings.bankAccountNo} maxLength={17} onChange={e => { const val = e.target.value.replace(/\D/g, ''); updateSettings({ bankAccountNo: val }) }} className="outline-none bg-transparent w-full" placeholder="A/c No" /> <span className="font-semibold whitespace-nowrap flex-shrink-0">IFSC Code:</span><input value={settings.bankIfsc} maxLength={11} onChange={e => { let val = e.target.value.toUpperCase(); let formatted = ''; for (let i = 0; i < val.length; i++) { if (i < 4) { if (/[A-Z]/.test(val[i])) formatted += val[i]; } else { if (/[0-9]/.test(val[i])) formatted += val[i]; } } updateSettings({ bankIfsc: formatted }) }} className="outline-none bg-transparent w-full uppercase" placeholder="IFSC Code" /></div>
            </div>

            {/* QR Code in the middle space */}
            <div className="flex my-3">
              <div className="w-20 h-20 border border-gray-300 p-1 flex items-center justify-center relative">
                <div className="text-[8px] text-gray-400 text-center leading-tight">SCAN<br />TO<br />PAY</div>
                <img src="/qr.png" alt="QR" className="absolute w-18 h-18 object-contain opacity-0" onError={(e) => (e.currentTarget.style.opacity = '0')} onLoad={(e) => (e.currentTarget.style.opacity = '1')} />
              </div>
            </div>

            <div>
              <p className="font-bold text-xs">**THANKING YOU VISIT AGAIN**</p>
              <p className="italic text-xs mt-2">*Rupees {numberToWords(netPayable > 0 ? netPayable : grandTotal)} Only*</p>
            </div>
          </div>

          {/* Right Half */}
          <div className="w-[40%] flex flex-col relative">
            <div className="flex justify-between border-b border-black p-2 font-bold text-xs">
              <span>MRP TOTAL</span>
              <span>{mrpTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-xs items-center gap-2">
              <span className="flex-1 flex justify-between items-center">
                <span>Party Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={defaultDiscount}
                  onChange={e => setDefaultDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-12 border-2 border-gray-300 rounded text-center font-bold no-print text-xs py-0.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </span>
              <span>Less: Discount</span>
              <span className="w-16 text-right">{discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-xs">
              <span>Round Off</span>
              <span>{roundOff.toFixed(2)}</span>
            </div>
            {partyOutstanding > 0 && (
              <div className="flex items-center justify-between border-b border-black p-2 bg-muted/50 print:bg-transparent gap-2">
                <div className="flex items-center gap-2 no-print text-[10px] flex-1">
                  <span className="font-bold text-foreground leading-tight flex-1">Amount to receive (₹{partyOutstanding}) | Add: Previous Due</span>
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
                    className="w-16 px-1 py-0.5 border border-border rounded text-center outline-none bg-background text-foreground font-bold shrink-0 text-xs" 
                    placeholder="0.00"
                  />
                </div>
                <div className="hidden print:block text-xs font-semibold">Add: Previous Due</div>
                <span className="text-xs font-bold text-green-600 dark:text-green-400 shrink-0 w-16 text-right">+ {addedAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-black p-2 font-bold text-lg">
              <span>GRAND TOTAL</span>
              <span>{netPayable.toFixed(2)}</span>
            </div>

            <div className="flex-1 p-2 flex flex-col items-end justify-between min-h-[80px]">
              <div className="text-xs font-bold text-right w-full">{settings.companyName}</div>
              <div className="text-xs">Authorised Signatory</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
