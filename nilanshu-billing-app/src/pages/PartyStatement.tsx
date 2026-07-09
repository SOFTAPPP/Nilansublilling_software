import React, { useState } from 'react';

export default function PartyStatement() {
  const [partyName, setPartyName] = useState('MODEL LIBRARY');
  const [fromDate, setFromDate] = useState('2024-10-18');
  const [toDate, setToDate] = useState('2025-08-25');

  const entries = [
    { date: 'Oct 18', vNo: '', particulars: 'Opening Balance', debit: 11000.00, credit: 0, balance: '11000.00 Dr' },
    { date: 'Nov 14', vNo: '', particulars: 'Bill No. N000258', debit: 12000.00, credit: 0, balance: '23000.00 Dr' },
    { date: 'Nov 25', vNo: '', particulars: 'Bill No. N000405', debit: 17588.00, credit: 0, balance: '40588.00 Dr' },
    { date: 'Dec 2', vNo: '', particulars: 'Bill No. N000508', debit: 27490.00, credit: 0, balance: '68078.00 Dr' },
    { date: 'Dec 8', vNo: '', particulars: 'Bill No. N000667', debit: 19100.00, credit: 0, balance: '87178.00 Dr' },
    { date: 'Jan 13', vNo: '', particulars: 'Bill No. N001209', debit: 5525.00, credit: 0, balance: '92703.00 Dr' },
    { date: 'Apr 15', vNo: 'E', particulars: 'CASH PAYMENT AT OFFIC', debit: 0, credit: 20000.00, balance: '72703.00 Dr' },
  ];

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div className="bg-gray-100 text-black p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto w-full">
      <div className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Party Statement / Ledger</h2>
        <div className="flex gap-4">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border p-2 rounded" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border p-2 rounded" />
          <button onClick={() => window.print()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-sans">Print Statement</button>
        </div>
      </div>

      {/* Ledger Canvas */}
      <div className="a4-page border border-black p-6 relative bg-white mx-auto font-mono text-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold tracking-wider">B.B. KUNDU & COMPANY</h1>
          <p>8B/1, TAMER LANE, KOLKATA-700009</p>
          <p>Phone : 7003157291/9163970125 E-Mail : bbkunduco@gmail.com</p>
        </div>

        {/* Ledger Info */}
        <div className="flex justify-between items-end mb-4 border-b border-black border-dashed pb-2">
          <div>
            <div className="flex gap-2">
              <span>Ledger Account :</span>
              <input value={partyName} onChange={e => setPartyName(e.target.value)} className="font-bold outline-none bg-transparent" />
            </div>
            <div className="ml-32">BASIRHAT</div>
          </div>
          <div className="text-right">
            <div>{new Date(fromDate).toLocaleDateString('en-GB')} - {new Date(toDate).toLocaleDateString('en-GB')}</div>
            <div>Page No.:1</div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left whitespace-pre">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="py-2 font-normal w-24">Date</th>
              <th className="py-2 font-normal w-16">V No.</th>
              <th className="py-2 font-normal">Particulars</th>
              <th className="py-2 font-normal text-right w-24">Debit</th>
              <th className="py-2 font-normal text-right w-24">Credit</th>
              <th className="py-2 font-normal text-right w-32">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i}>
                <td className="py-1">{entry.date}</td>
                <td className="py-1 text-center">{entry.vNo}</td>
                <td className="py-1">{entry.particulars}</td>
                <td className="py-1 text-right">{entry.debit ? entry.debit.toFixed(2) : ''}</td>
                <td className="py-1 text-right">{entry.credit ? entry.credit.toFixed(2) : ''}</td>
                <td className="py-1 text-right">{entry.balance}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-b border-black border-dashed">
              <td className="py-2">Total</td>
              <td></td>
              <td></td>
              <td className="py-2 text-right">{totalDebit.toFixed(2)}</td>
              <td className="py-2 text-right">{totalCredit.toFixed(2)}</td>
              <td className="py-2 text-right">72703.00 Dr</td>
            </tr>
          </tfoot>
        </table>

      </div>
    </div>
  );
}
