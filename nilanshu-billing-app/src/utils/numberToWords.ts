export function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numStr = num.toString().replace(/[\, ]/g, '');
  if (numStr !== parseFloat(numStr).toString()) return 'not a number';
  let n: any = numStr.split('.');
  let str = '';
  if (n[0] === '0') str = 'Zero';
  else {
    let d = parseInt(n[0]);
    if (d >= 10000000) {
      str += numberToWords(Math.floor(d / 10000000)) + 'Crore ';
      d %= 10000000;
    }
    if (d >= 100000) {
      str += numberToWords(Math.floor(d / 100000)) + 'Lakh ';
      d %= 100000;
    }
    if (d >= 1000) {
      str += numberToWords(Math.floor(d / 1000)) + 'Thousand ';
      d %= 1000;
    }
    if (d >= 100) {
      str += numberToWords(Math.floor(d / 100)) + 'Hundred ';
      d %= 100;
    }
    if (d > 0) {
      if (d < 20) str += a[d];
      else {
        str += b[Math.floor(d / 10)];
        if (d % 10 > 0) str += '-' + a[d % 10];
        else str += ' ';
      }
    }
  }
  return str.trim();
}
