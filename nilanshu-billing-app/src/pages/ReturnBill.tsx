import React, { useState } from 'react';
import CreditBill from './CreditBill';

export default function ReturnBill() {
  // We can reuse the CreditBill UI but pass props or just render a wrapper with a red header.
  // For simplicity, we just render a styled container indicating it's a return.
  return <CreditBill type="return" />;
}
