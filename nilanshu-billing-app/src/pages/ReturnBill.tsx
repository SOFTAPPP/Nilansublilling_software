import React, { useState } from 'react';
import CreditBill from './CreditBill';

export default function ReturnBill() {
  // We can reuse the CreditBill UI but pass props or just render a wrapper with a red header.
  // For simplicity, we just render a styled container indicating it's a return.
  return (
    <div className="relative">
      <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6 border border-red-300 font-bold no-print text-center text-lg">
        🚨 RETURN BILL MODE ACTIVE - THIS WILL REDUCE OUTSTANDING BALANCE AND ADD TO STOCK 🚨
      </div>
      <div className="print:before:content-['RETURN_BILL'] print:before:absolute print:before:top-0 print:before:left-0 print:before:text-4xl print:before:font-bold print:before:text-gray-400">
        <CreditBill />
      </div>
    </div>
  );
}
