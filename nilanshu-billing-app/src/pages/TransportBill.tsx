import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getNextBillNumber } from '../utils/billNumber';

export default function TransportBill({ viewBill }: { viewBill?: any }) {
  const { parties, transporters, createBill, updateBill, showDialog, settings } = useStore();
  const [showPaidStamp, setShowPaidStamp] = React.useState(false);
  
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Buyer fields
  const [partyId, setPartyId] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerProprietor, setBuyerProprietor] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerDistrict, setBuyerDistrict] = useState('');
  const [buyerPin, setBuyerPin] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerMob, setBuyerMob] = useState('');
  
  // Transporter fields
  const [transporterId, setTransporterId] = useState<string | null>(null);
  const [transporterName, setTransporterName] = useState('');
  const [transporterAddress, setTransporterAddress] = useState('');
  const [transporterPhone, setTransporterPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [route, setRoute] = useState('');

  // Packet fields
  const [totalPacket, setTotalPacket] = useState('');
  const [value, setValue] = useState('');
  const [material, setMaterial] = useState('');

  // Custom Company Name override
  const [customCompanyName, setCustomCompanyName] = useState('');

  useEffect(() => {
    if (!viewBill && !customCompanyName && settings?.companyName) {
      setCustomCompanyName(settings.companyName);
    }
  }, [settings?.companyName, viewBill]);

  // Dropdown states
  const [partySearch, setPartySearch] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  const [transporterSearch, setTransporterSearch] = useState('');
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const transporterDropdownRef = useRef<HTMLDivElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

  const formStateStr = JSON.stringify({ billNo, date, buyerName, buyerProprietor, buyerAddress, buyerDistrict, buyerPin, buyerState, buyerMob, transporterName, transporterAddress, transporterPhone, vehicleNo, route, totalPacket, value, material, customCompanyName });
  const lastSavedStateRef = useRef(formStateStr);

  useEffect(() => {
    if (!viewBill) {
      if (lastSavedStateRef.current !== formStateStr) {
        setHasUnsavedChanges(true);
      }
    }
  }, [formStateStr, viewBill]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setPartyDropdownOpen(false);
      }
      if (transporterDropdownRef.current && !transporterDropdownRef.current.contains(event.target as Node)) {
        setTransporterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fill next bill number
  useEffect(() => {
    if (!viewBill) {
      getNextBillNumber('TRN-').then(setBillNo);
    }
  }, [viewBill]);

  useEffect(() => {
    if (viewBill) {
      setBillNo(viewBill.billNumber || '');
      if (viewBill.date) {
        setDate(new Date(viewBill.date).toISOString().split('T')[0]);
      }
      
      // Parse JSON from lrNo
      if (viewBill.lrNo) {
        try {
          const data = JSON.parse(viewBill.lrNo);
          setBuyerName(data.buyerName || '');
          setBuyerProprietor(data.buyerProprietor || '');
          setBuyerAddress(data.buyerAddress || '');
          setBuyerDistrict(data.buyerDistrict || '');
          setBuyerPin(data.buyerPin || '');
          setBuyerState(data.buyerState || '');
          setBuyerMob(data.buyerMob || '');
          
          setTransporterName(data.transporterName || '');
          setTransporterAddress(data.transporterAddress || '');
          setTransporterPhone(data.transporterPhone || '');
          setVehicleNo(data.vehicleNo || '');
          setRoute(data.route || '');
          
          setTotalPacket(data.totalPacket || '');
          setValue(data.value || '');
          setMaterial(data.material || '');
          
          if (data.customCompanyName) {
            setCustomCompanyName(data.customCompanyName);
          } else {
            setCustomCompanyName(settings?.companyName || '');
          }
        } catch (e) {
          // fallback if it wasn't JSON
        }
      }
      setPartyId(viewBill.partyId || null);
      setTransporterId(viewBill.transporterId || null);
    }
  }, [viewBill]);

  const handlePartyLookup = (val: string) => {
    const p = parties.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (p) {
      setPartyId(p.id);
      setBuyerName(p.name);
      setBuyerProprietor(p.proprietorName || '');
      setBuyerMob(p.phone || '');
      
      let parsedAddress = p.address || '';
      let parsedDistrict = '';
      let parsedPin = '';
      let parsedState = '';

      const stateMatch = parsedAddress.match(/ \| State: (.*)$/);
      if (stateMatch) {
        parsedState = stateMatch[1].trim();
        parsedAddress = parsedAddress.replace(stateMatch[0], '');
      }

      const pinMatch = parsedAddress.match(/ \| PIN: (.*)$/);
      if (pinMatch) {
        parsedPin = pinMatch[1].trim();
        parsedAddress = parsedAddress.replace(pinMatch[0], '');
      }

      const distMatch = parsedAddress.match(/ \| Dist: (.*)$/);
      if (distMatch) {
        parsedDistrict = distMatch[1].trim();
        parsedAddress = parsedAddress.replace(distMatch[0], '');
      }

      setBuyerAddress(parsedAddress.trim());
      setBuyerDistrict(parsedDistrict);
      setBuyerPin(parsedPin);
      setBuyerState(parsedState);
    }
  };

  const handleTransporterLookup = (val: string) => {
    const t = transporters.find(t => t.phone === val || t.name.toLowerCase() === val.toLowerCase());
    if (t) {
      setTransporterId(t.id);
      setTransporterName(t.name);
      setTransporterPhone(t.phone);
      setTransporterAddress(t.address || '');
    }
  };

  const [createdBillId, setCreatedBillId] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const payload = {
        type: 'transport' as const,
        billNumber: billNo,
        partyId: partyId,
        transporterId: transporterId,
        subtotal: 0,
        discount: 0,
        total: Number(value) || 0,
        date: new Date(date).toISOString(),
        // Store all custom fields as JSON in lrNo
        lrNo: JSON.stringify({
          buyerName, buyerProprietor, buyerAddress, buyerDistrict, buyerPin, buyerState, buyerMob,
          totalPacket, value, material,
          transporterName, transporterAddress, transporterPhone, vehicleNo, route,
          customCompanyName
        }),
        lineItems: []
      };

      if (createdBillId) {
        updateBill(createdBillId, 'transport', payload);
        showDialog({ title: 'Success', message: 'Transport Bill updated successfully!', type: 'alert' });
      } else {
        createBill(payload).then(id => {
          setCreatedBillId(id);
        }).catch(err => {
          showDialog({ title: 'Save Failed', message: err.message || 'Failed to save bill.', type: 'alert' });
          setHasUnsavedChanges(true);
        });
        showDialog({ title: 'Success', message: 'Transport Bill saved successfully!', type: 'alert' });
      }
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = formStateStr;
    } catch (err: any) {
      showDialog({ title: 'Save Failed', message: err.message || 'Failed to save bill.', type: 'alert' });
    }
  };

  const handleSendSMS = async () => {
    if (!buyerMob) {
      showDialog({ title: 'Missing Info', message: "Please enter buyer's mobile number first.", type: 'alert' });
      return;
    }
    try {
      const cleanPhone = buyerMob.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) throw new Error('Invalid phone number format');

      const { formatTransportBillMessage } = await import('../utils/smsFormatter');
      const smsData = {
        companyName: settings.companyName || 'NILANSU PUBLICATION',
        billNo: billNo,
        buyerName: buyerName,
        transporterName: transporterName,
        totalPacket: totalPacket,
        value: value,
      };
      const message = formatTransportBillMessage(smsData);

      const baseUrl = import.meta.env.VITE_API_URL || 'http://72.61.231.155:5004/api';
      const response = await fetch(`${baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message })
      });
      
      if (response.ok) {
        showDialog({ title: 'SMS Sent', message: `SMS sent to ${buyerName} at +91 ${cleanPhone} successfully!`, type: 'alert' });
      } else {
        const errorData = await response.json();
        const serverMsg = errorData.details?.message || errorData.error || 'Failed to send SMS';
        throw new Error(serverMsg);
      }
    } catch (err: any) {
      console.error(err);
      showDialog({ title: 'SMS Failed', message: err.message, type: 'alert' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Transport / Dispatch Bill</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1 min-w-0">
          {!viewBill && (
            <>
              <button 
                onClick={() => setShowPaidStamp(!showPaidStamp)}
                className="whitespace-nowrap border border-green-600 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 font-medium shadow-sm transition-colors text-sm bg-background"
              >
                Paid Stamp
              </button>
              <button onClick={handleSendSMS} className="whitespace-nowrap bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-medium shadow-sm transition-colors text-sm no-print">
                Send SMS
              </button>
              <button 
                onClick={() => {
                  setCreatedBillId(null);
                  getNextBillNumber('TRN-').then(setBillNo);
                  setBuyerName(''); setBuyerProprietor(''); setBuyerAddress(''); setBuyerDistrict(''); setBuyerPin(''); setBuyerState(''); setBuyerMob('');
                  setTransporterName(''); setTransporterAddress(''); setTransporterPhone(''); setVehicleNo(''); setRoute('');
                  setTotalPacket(''); setValue(''); setMaterial('');
                  setPartyId(null); setTransporterId(null);
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
            Print
          </button>
        </div>
      </div>

      <div className="a4-page border-2 border-foreground print:border-black relative flex flex-col bg-card text-foreground print:bg-white print:text-black overflow-hidden">
        {showPaidStamp && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-green-600 border-4 border-green-600 rounded-full w-64 h-64 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <span className="text-6xl font-bold uppercase tracking-widest">PAID</span>
          </div>
        )}
        <div className="text-center py-4 border-b-2 border-black print:border-black dark:border-white font-bold text-2xl tracking-wider">
          TRANSPORT BILL
        </div>

        <div className="flex justify-between border-b-2 border-black print:border-black dark:border-white p-4 bg-gray-50 dark:bg-transparent print:bg-transparent">
          <div className="flex items-center gap-2">
            <span className="font-bold">Bill No:</span>
            <input value={billNo} onChange={e => setBillNo(e.target.value)} className="border-b border-black print:border-black dark:border-white outline-none bg-transparent font-semibold w-32" readOnly={!!viewBill} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">Date:</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-b border-black print:border-black dark:border-white outline-none bg-transparent font-semibold" readOnly={!!viewBill} disabled={!!viewBill} />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {/* BUYER COLUMN */}
          <div className="border-b-2 border-black print:border-black dark:border-white flex flex-col">
            <div className="font-bold text-lg bg-gray-100 dark:bg-transparent print:bg-gray-100 dark:bg-transparent border-b-2 border-black print:border-black dark:border-white p-2 uppercase text-center tracking-wider">Buyer Details</div>
            
            <div className="p-5 flex flex-col gap-4 relative">
              <div className="relative no-print" ref={partyDropdownRef}>
                <div className="flex items-center border border-gray-300 rounded px-2 text-sm bg-background text-foreground">
                  <input 
                    type="text"
                    value={partySearch} 
                    onChange={e => { setPartySearch(e.target.value); setPartyDropdownOpen(true); }} 
                    onFocus={() => setPartyDropdownOpen(true)}
                    className="w-full py-1.5 outline-none text-xs bg-transparent dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    placeholder="Auto-fill from saved parties..." 
                  />
                </div>
                {partyDropdownOpen && parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-background text-foreground border shadow-xl z-50 max-h-40 overflow-y-auto no-print text-sm">
                    {parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).map(p => (
                      <div key={p.id} className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b" onClick={() => { handlePartyLookup(p.phone); setPartySearch(''); setPartyDropdownOpen(false); }}>
                        <div className="font-bold">{p.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-bold whitespace-nowrap w-32">Buyer Name :</span>
                <input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">Proprietor Name :</span>
                <input value={buyerProprietor} onChange={e => setBuyerProprietor(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">Address :</span>
                <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">District :</span>
                <input value={buyerDistrict} onChange={e => setBuyerDistrict(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
                <span className="font-bold whitespace-nowrap ml-2">Pin Code :</span>
                <input value={buyerPin} onChange={e => setBuyerPin(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent w-24 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">State :</span>
                <input value={buyerState} onChange={e => setBuyerState(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">Mobile No. :</span>
                <input value={buyerMob} onChange={e => setBuyerMob(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - TRANSPORTER & MATERIAL */}
          <div className="flex flex-col">
            <div className="font-bold text-lg bg-gray-100 dark:bg-transparent print:bg-gray-100 dark:bg-transparent border-b-2 border-black print:border-black dark:border-white p-2 uppercase text-center tracking-wider">Transporter Details</div>
            
            <div className="p-5 flex flex-col gap-4 relative flex-1 min-w-0">
              <div className="relative no-print" ref={transporterDropdownRef}>
                <div className="flex items-center border border-gray-300 rounded px-2 text-sm bg-background text-foreground">
                  <input 
                    type="text"
                    value={transporterSearch} 
                    onChange={e => { setTransporterSearch(e.target.value); setTransporterDropdownOpen(true); }} 
                    onFocus={() => setTransporterDropdownOpen(true)}
                    className="w-full py-1.5 outline-none text-xs bg-transparent dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    placeholder="Auto-fill from saved transporters..." 
                  />
                </div>
                {transporterDropdownOpen && transporters.filter(t => t.name.toLowerCase().includes(transporterSearch.toLowerCase()) || t.phone.includes(transporterSearch)).length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-background text-foreground border shadow-xl z-50 max-h-40 overflow-y-auto no-print text-sm">
                    {transporters.filter(t => t.name.toLowerCase().includes(transporterSearch.toLowerCase()) || t.phone.includes(transporterSearch)).map(t => (
                      <div key={t.id} className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b" onClick={() => { handleTransporterLookup(t.phone); setTransporterSearch(''); setTransporterDropdownOpen(false); }}>
                        <div className="font-bold">{t.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-bold whitespace-nowrap w-40">Vehicle / Transport No. :</span>
                <input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-40">Route (From - To) :</span>
                <input value={route} onChange={e => setRoute(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-40">Transporter Name :</span>
                <input value={transporterName} onChange={e => setTransporterName(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-40">Transporter Address :</span>
                <input value={transporterAddress} onChange={e => setTransporterAddress(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-40">Transporter Ph. No. :</span>
                <input value={transporterPhone} onChange={e => setTransporterPhone(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
            </div>

            <div className="font-bold text-lg bg-gray-100 dark:bg-transparent print:bg-gray-100 dark:bg-transparent border-y-2 border-black print:border-black dark:border-white p-2 uppercase text-center tracking-wider">Package Details</div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">Total Packet :</span>
                <input value={totalPacket} onChange={e => setTotalPacket(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
                <span className="font-bold whitespace-nowrap ml-4">Value (₹) :</span>
                <input value={value} onChange={e => setValue(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent w-24 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap w-32">Material Details :</span>
                <input value={material} onChange={e => setMaterial(e.target.value)} className="border-b-2 border-dotted border-black print:border-black dark:border-white outline-none font-normal text-sm bg-transparent flex-1 min-w-0 px-1 pb-0.5" readOnly={!!viewBill} />
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM SIGNATURE AREA */}
        <div className="border-t-2 border-black print:border-black dark:border-white min-h-[150px] p-4 flex flex-col justify-between">
          <div className="flex flex-col items-center text-center w-full mb-8">
            <input 
              value={customCompanyName || settings.companyName || ''} 
              onChange={e => setCustomCompanyName(e.target.value)} 
              className="text-3xl font-bold uppercase tracking-wide text-center w-full bg-transparent border-none outline-none hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5 transition-colors print:hover:bg-transparent" 
              placeholder="COMPANY NAME"
              readOnly={!!viewBill} 
            />
            <div className="text-base mt-1 text-center">{settings.companyAddress}</div>
            <div className="text-base text-center">{settings.companyCity}</div>
            <div className="flex gap-2 text-base justify-center items-center mt-1">
              <span className="flex items-center whitespace-nowrap font-semibold">IT PAN: <span className="ml-1 uppercase font-normal">{settings.companyPan}</span></span>
              <span className="text-gray-400">|</span>
              <span className="flex items-center whitespace-nowrap font-semibold">Phone: <span className="ml-1 font-normal">{settings.companyContact}</span></span>
              <span className="text-gray-400">|</span>
              <span className="flex items-center whitespace-nowrap font-semibold">Email: <span className="ml-1 font-normal">{settings.companyEmail}</span></span>
            </div>
          </div>
          <div className="flex justify-end w-full">
            <div className="w-1/3 text-center border-t border-dashed border-gray-400 pt-2 font-bold text-base">
              Transport Received Sign. with seal
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
