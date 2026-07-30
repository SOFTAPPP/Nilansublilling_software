import React, { useState, useEffect } from 'react';
import { BillEngine } from '../components/BillEngine/BillEngine';
import { BillLineItem, useStore } from '../store/useStore';
import { numberToWords } from '../utils/numberToWords';

export default function TransportBill({ viewBill }: { viewBill?: any }) {
  const { transporters, createBill, showDialog } = useStore();
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [transporterPhone, setTransporterPhone] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [billNo, setBillNo] = useState('');

  useEffect(() => {
    if (viewBill) {
      setBillNo(viewBill.billNumber || '');
      if (viewBill.transporterId) {
        const t = transporters.find(t => t.id === viewBill.transporterId);
        if (t) {
          setTransporterName(t.name);
          setTransporterPhone(t.phone);
        }
      }
      if (viewBill.lineItems) {
        setItems(viewBill.lineItems.map((li: any) => ({
          ...li,
          mrp: li.mrp || li.rate,
          amount: li.amount,
        })));
      }
    }
  }, [viewBill, transporters]);

  const handleSave = async () => {
    if (items.length === 0) {
      showDialog({ title: 'Validation Error', message: 'Please add at least one item.', type: 'alert' });
      return;
    }
    if (!billNo) {
      showDialog({ title: 'Validation Error', message: 'Please enter a Bill No.', type: 'alert' });
      return;
    }
    
    const foundTransporter = transporters.find(p => p.phone === transporterPhone || p.name.toLowerCase() === transporterName.toLowerCase());
    
    try {
      await createBill({
        type: 'transport',
        billNumber: billNo,
        transporterId: foundTransporter ? foundTransporter.id : null,
        subtotal: totalAmount,
        discount: 0,
        total: grandTotal,
        vehicleNo: dispatchDetails.vehicleNo,
        destination: dispatchDetails.destination,
        driverName: dispatchDetails.driverName,
        lrNo: dispatchDetails.lrNo,
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
      showDialog({ title: 'Success', message: 'Transport Bill saved successfully!', type: 'alert' });
      setItems([]);
      setBillNo('');
      setDispatchDetails({ vehicleNo: '', destination: '', driverName: '', lrNo: '' });
      setTransporterPhone('');
      setTransporterName('');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message;
      showDialog({ title: 'Save Failed', message: msg || 'Failed to save bill. Bill number might be duplicate.', type: 'alert' });
    }
  };

  const handleTransporterLookup = (val: string, field: 'phone' | 'name') => {
    if (field === 'phone') setTransporterPhone(val);
    if (field === 'name') setTransporterName(val);

    const foundTransporter = transporters.find(p => p.phone === val || p.name.toLowerCase() === val.toLowerCase());
    if (foundTransporter) {
      setTransporterName(foundTransporter.name);
      setTransporterPhone(foundTransporter.phone);
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

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      showDialog({ title: 'Print Error', message: 'Some technical error happened or your printer is having an issue. Please fix it.', type: 'alert' });
    }
  };

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full relative">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Transport / Dispatch Bill</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-end flex-1">
          {!viewBill && (
            <button 
              onClick={handleSave} 
              className="whitespace-nowrap bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors text-sm"
            >
              Save to Database
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm"
          >
            Print Transport Bill
          </button>
        </div>
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
                list="transporter-phones"
                value={transporterPhone} onChange={e => handleTransporterLookup(e.target.value, 'phone')} 
                className="font-bold w-full outline-none bg-transparent border-b border-gray-300"
                placeholder="Lookup Transporter by Phone"
              />
              <datalist id="transporter-phones">
                {transporters.map(t => <option key={t.id} value={t.phone}>{t.name}</option>)}
              </datalist>
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-16">Name:</span>
              <input 
                list="transporter-names"
                value={transporterName} onChange={e => handleTransporterLookup(e.target.value, 'name')} 
                className="font-bold w-full outline-none bg-transparent border-b border-gray-300"
                placeholder="Enter Transporter Name"
              />
              <datalist id="transporter-names">
                {transporters.map(t => <option key={t.id} value={t.name}>{t.phone}</option>)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 p-4 gap-2 text-xs">
            <p className="font-semibold">Date:</p><p>{new Date().toLocaleDateString('en-GB')}</p>
            
            <p className="font-semibold">Bill No:</p>
            <input value={billNo} onChange={e => setBillNo(e.target.value)} className="border-b border-gray-300 outline-none bg-transparent" placeholder="TRN-101" />
            
            <p className="font-semibold">Vehicle No:</p>
            <input value={dispatchDetails.vehicleNo} onChange={e => setDispatchDetails({...dispatchDetails, vehicleNo: e.target.value})} className="border-b border-gray-300 outline-none bg-transparent" />
            
            <p className="font-semibold">Destination:</p>
            <input value={dispatchDetails.destination} onChange={e => setDispatchDetails({...dispatchDetails, destination: e.target.value})} className="border-b border-gray-300 outline-none bg-transparent" />
            
            <p className="font-semibold">Driver Name:</p>
            <input value={dispatchDetails.driverName} onChange={e => setDispatchDetails({...dispatchDetails, driverName: e.target.value})} className="border-b border-gray-300 outline-none bg-transparent" />
            
            <p className="font-semibold">L.R. No:</p>
            <input value={dispatchDetails.lrNo} onChange={e => setDispatchDetails({...dispatchDetails, lrNo: e.target.value})} className="border-b border-gray-300 outline-none bg-transparent" />
          </div>
        </div>

        <div className="min-h-[300px]">
          <BillEngine items={items} onChange={setItems} columns={['sno', 'name', 'qty', 'rate', 'amount']} />
        </div>

        <div className="border-y border-black flex">
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
