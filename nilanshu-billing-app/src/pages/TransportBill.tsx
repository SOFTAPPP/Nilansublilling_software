import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getNextBillNumber } from '../utils/billNumber';

export default function TransportBill({ viewBill }: { viewBill?: any }) {
  const { parties, transporters, createBill, updateBill, showDialog } = useStore();
  
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

  // Packet fields
  const [totalPacket, setTotalPacket] = useState('');
  const [value, setValue] = useState('');
  const [material, setMaterial] = useState('');

  // Dropdown states
  const [partySearch, setPartySearch] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  const [transporterSearch, setTransporterSearch] = useState('');
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const transporterDropdownRef = useRef<HTMLDivElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

  const formStateStr = JSON.stringify({ billNo, date, buyerName, buyerProprietor, buyerAddress, buyerDistrict, buyerPin, buyerState, buyerMob, transporterName, transporterAddress, transporterPhone, totalPacket, value, material });
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
          
          setTotalPacket(data.totalPacket || '');
          setValue(data.value || '');
          setMaterial(data.material || '');
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
      setBuyerAddress(p.address || '');
      setBuyerMob(p.phone || '');
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

  const handleSave = async () => {
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
          transporterName, transporterAddress, transporterPhone
        }),
        lineItems: []
      };

      if (createdBillId) {
        await updateBill(createdBillId, 'transport', payload);
        showDialog({ title: 'Success', message: 'Transport Bill updated successfully!', type: 'alert' });
      } else {
        const id = await createBill(payload);
        setCreatedBillId(id);
        showDialog({ title: 'Success', message: 'Transport Bill saved successfully!', type: 'alert' });
      }
      setHasUnsavedChanges(false);
      lastSavedStateRef.current = formStateStr;
    } catch (err: any) {
      showDialog({ title: 'Save Failed', message: err.message || 'Failed to save bill.', type: 'alert' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Transport / Dispatch Bill</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <>
              <button 
                onClick={() => {
                  setCreatedBillId(null);
                  getNextBillNumber('TRN-').then(setBillNo);
                  setBuyerName(''); setBuyerProprietor(''); setBuyerAddress(''); setBuyerDistrict(''); setBuyerPin(''); setBuyerState(''); setBuyerMob('');
                  setTransporterName(''); setTransporterAddress(''); setTransporterPhone('');
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

      <div className="a4-page border-2 border-black relative flex flex-col bg-white">
        <div className="text-center py-4 border-b-2 border-black font-bold text-2xl tracking-wider">
          TRANSPORT BILL
        </div>

        <div className="flex justify-between border-b-2 border-black p-4 bg-gray-50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <span className="font-bold">Bill No:</span>
            <input value={billNo} onChange={e => setBillNo(e.target.value)} className="border-b border-black outline-none bg-transparent font-semibold w-32" readOnly={!!viewBill} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">Date:</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-b border-black outline-none bg-transparent font-semibold" readOnly={!!viewBill} disabled={!!viewBill} />
          </div>
        </div>

        <div className="grid grid-cols-2 flex-1">
          {/* LEFT COLUMN - BUYER */}
          <div className="border-r-2 border-black p-4 flex flex-col gap-4">
            <div className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase">Buyer Details</div>
            
            <div className="relative no-print" ref={partyDropdownRef}>
              <div className="flex items-center border border-gray-300 rounded px-2 text-sm bg-white">
                <input 
                  type="text"
                  value={partySearch} 
                  onChange={e => { setPartySearch(e.target.value); setPartyDropdownOpen(true); }} 
                  onFocus={() => setPartyDropdownOpen(true)}
                  className="w-full py-1.5 outline-none text-xs"
                  placeholder="Auto-fill from saved parties..." 
                />
              </div>
              {partyDropdownOpen && parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border shadow-xl z-50 max-h-40 overflow-y-auto no-print text-sm">
                  {parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone.includes(partySearch)).map(p => (
                    <div key={p.id} className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b" onClick={() => { handlePartyLookup(p.phone); setPartySearch(''); setPartyDropdownOpen(false); }}>
                      <div className="font-bold">{p.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Buyer Name</span>
                <input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="border-b border-gray-400 outline-none font-bold text-lg" readOnly={!!viewBill} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Proprietor Name</span>
                <input value={buyerProprietor} onChange={e => setBuyerProprietor(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Address</span>
                <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-600">District</span>
                  <input value={buyerDistrict} onChange={e => setBuyerDistrict(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-600">Pin Code</span>
                  <input value={buyerPin} onChange={e => setBuyerPin(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-600">State</span>
                  <input value={buyerState} onChange={e => setBuyerState(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-600">Mobile No.</span>
                  <input value={buyerMob} onChange={e => setBuyerMob(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - TRANSPORTER & MATERIAL */}
          <div className="p-4 flex flex-col gap-4">
            <div className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase">Transporter Details</div>
            
            <div className="relative no-print" ref={transporterDropdownRef}>
              <div className="flex items-center border border-gray-300 rounded px-2 text-sm bg-white">
                <input 
                  type="text"
                  value={transporterSearch} 
                  onChange={e => { setTransporterSearch(e.target.value); setTransporterDropdownOpen(true); }} 
                  onFocus={() => setTransporterDropdownOpen(true)}
                  className="w-full py-1.5 outline-none text-xs"
                  placeholder="Auto-fill from saved transporters..." 
                />
              </div>
              {transporterDropdownOpen && transporters.filter(t => t.name.toLowerCase().includes(transporterSearch.toLowerCase()) || t.phone.includes(transporterSearch)).length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border shadow-xl z-50 max-h-40 overflow-y-auto no-print text-sm">
                  {transporters.filter(t => t.name.toLowerCase().includes(transporterSearch.toLowerCase()) || t.phone.includes(transporterSearch)).map(t => (
                    <div key={t.id} className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b" onClick={() => { handleTransporterLookup(t.phone); setTransporterSearch(''); setTransporterDropdownOpen(false); }}>
                      <div className="font-bold">{t.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Transporter Name</span>
                <input value={transporterName} onChange={e => setTransporterName(e.target.value)} className="border-b border-gray-400 outline-none font-bold text-lg" readOnly={!!viewBill} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Transporter Address</span>
                <input value={transporterAddress} onChange={e => setTransporterAddress(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Transporter Phone No.</span>
                <input value={transporterPhone} onChange={e => setTransporterPhone(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
              </div>
            </div>

            <div className="font-bold text-lg border-b border-black pb-1 mt-4 mb-2 uppercase">Package Details</div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-600">Total Packet</span>
                  <input value={totalPacket} onChange={e => setTotalPacket(e.target.value)} className="border-b border-gray-400 outline-none font-bold text-lg" readOnly={!!viewBill} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-600">Value (₹)</span>
                  <input value={value} onChange={e => setValue(e.target.value)} className="border-b border-gray-400 outline-none font-bold text-lg" readOnly={!!viewBill} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600">Material in Packet</span>
                <input value={material} onChange={e => setMaterial(e.target.value)} className="border-b border-gray-400 outline-none" readOnly={!!viewBill} />
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM SIGNATURE AREA */}
        <div className="border-t-2 border-black min-h-[150px] p-4 flex flex-col justify-end">
          <div className="flex justify-between items-end w-full">
            <div className="w-1/3"></div>
            <div className="w-1/3"></div>
            <div className="w-1/3 text-center border-t border-dashed border-gray-400 pt-2 font-bold text-sm">
              Transport Received Sign. with seal
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
