export interface SMSBillData {
  companyName: string;
  billType: string;
  billNo: string;
  buyerName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    mrp: number;
    amount: number;
    discountPercent?: number;
  }>;
  subtotal: number;
  discount: number;
  grandTotal: number;
}

export const formatBillMessage = (data: SMSBillData): string => {
  // Format Company and Header
  const header = `${data.companyName.toUpperCase()}\nBill: ${data.billNo}\n`;
  const buyer = data.buyerName ? `Buyer: ${data.buyerName}\n` : '';
  const separator = `----\n`;

  // Format Items (Compact)
  let itemsText = '';
  data.items.forEach((item, index) => {
    // Abbreviate long names slightly if needed, but keeping it mostly intact
    const name = item.productName.length > 20 ? item.productName.substring(0, 18) + '..' : item.productName;
    const discText = (item.discountPercent && item.discountPercent > 0) ? `(D:${item.discountPercent}%)` : '';
    itemsText += `${index + 1}.${name}\nQty:${item.quantity} x Rs.${item.mrp} ${discText} = Rs.${item.amount}\n`;
  });

  // Format Totals
  let totalsText = `Total: Rs.${data.subtotal}\n`;
  if (data.discount > 0) {
    totalsText += `Disc: Rs.${data.discount}\n`;
  }
  totalsText += `Final: Rs.${data.grandTotal}\nThank you!`;

  return header + buyer + separator + itemsText + separator + totalsText;
};

export interface TransportSMSData {
  companyName: string;
  billNo: string;
  buyerName: string;
  transporterName: string;
  totalPacket: string;
  value: string;
}

export const formatTransportBillMessage = (data: TransportSMSData): string => {
  return `${data.companyName.toUpperCase()}
Transport Bill: ${data.billNo}
Buyer: ${data.buyerName}
Transporter: ${data.transporterName}
Packets: ${data.totalPacket}
Value: Rs.${data.value}
Thank you!`;
};
