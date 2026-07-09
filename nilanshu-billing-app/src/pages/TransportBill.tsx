import React, { useState } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';

export default function TransportBill() {
  const { parties } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [partyPhone, setPartyPhone] = useState('');
  const [partyName, setPartyName] = useState('');

  const handlePartyLookup = (val: string, field: 'phone' | 'name') => {
    if (field === 'phone') setPartyPhone(val);
    if (field === 'name') setPartyName(val);

    const foundParty = parties.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (foundParty) {
      setPartyName(foundParty.name);
      setPartyPhone(foundParty.phone);
    }
  };
  const [dispatchDetails, setDispatchDetails] = useState({
    vehicleNo: '',
    destination: '',
    driverName: '',
    lrNo: ''
  });

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = Math.round(totalAmount);

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Transport / Dispatch Bill</h2>
        <button 
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Print Transport Bill
        </button>
      </div>

      <div className="a4-page border border-black relative">
        <div className="text-center py-2 border-b border-black font-semibold text-lg flex justify-between px-4">
          <span className="w-1/3"></span>
          <span className="w-1/3">TRANSPORT BILL</span>
          <span className="w-1/3 text-right text-xs font-normal mt-1">(DISPATCH COPY)</span>
        </div>

        <div className="grid grid-cols-2 text-sm border-b border-black">
          <div className="border-r border-black p-4">
            <h2 className="font-bold text-lg mb-2">Consignee Details</h2>
            <div className="flex gap-2 mb-2 items-center">
              <span className="w-16">Phone:</span>
              <input 
                list="party-phones"
                value={partyPhone} onChange={e => handlePartyLookup(e.target.value, 'phone')} 
                className="font-bold w-full outline-none bg-transparent border-b border-gray-300"
                placeholder="Lookup by Phone"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-16">Name:</span>
              <input 
                list="party-names"
                value={partyName} onChange={e => handlePartyLookup(e.target.value, 'name')} 
                className="font-bold w-full outline-none bg-transparent border-b border-gray-300"
                placeholder="Enter Party Name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 p-4 gap-2">
            <p className="font-semibold">Date:</p><p>{new Date().toLocaleDateString('en-GB')}</p>
            <p className="font-semibold">Vehicle No:</p>
            <input value={dispatchDetails.vehicleNo} onChange={e => setDispatchDetails({...dispatchDetails, vehicleNo: e.target.value})} className="border-b border-gray-300 outline-none" />
            <p className="font-semibold">Destination:</p>
            <input value={dispatchDetails.destination} onChange={e => setDispatchDetails({...dispatchDetails, destination: e.target.value})} className="border-b border-gray-300 outline-none" />
            <p className="font-semibold">L.R. No:</p>
            <input value={dispatchDetails.lrNo} onChange={e => setDispatchDetails({...dispatchDetails, lrNo: e.target.value})} className="border-b border-gray-300 outline-none" />
          </div>
        </div>

        <div className="min-h-[300px]">
          <BillEngine items={items} onChange={setItems} columns={['sno', 'name', 'qty', 'rate', 'amount']} />
        </div>

        <div className="border-t border-black flex">
          <div className="w-3/4 p-2 border-r border-black">
            <p className="font-bold">Total Bundles/Qty: {totalQuantity}</p>
            <p className="italic text-sm mt-2">Amount in words: {numberToWords(grandTotal)}</p>
          </div>
          <div className="w-1/4 p-2 flex justify-between font-bold text-lg items-center">
            <span>TOTAL</span>
            <span>{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
