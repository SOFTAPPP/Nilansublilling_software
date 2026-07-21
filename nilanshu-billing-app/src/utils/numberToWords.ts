export function numberToWords(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return 'Zero';
  const n = Math.round(Math.abs(num));
  if (n === 0) return 'Zero';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n >= 10000000) return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
    if (n >= 100000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
    if (n >= 1000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n >= 100) return convert(Math.floor(n / 100)) + 'Hundred ' + convert(n % 100);
    if (n >= 20) return b[Math.floor(n / 10)] + (n % 10 > 0 ? '-' + a[n % 10].trim() : '') + ' ';
    return n > 0 ? a[n] : '';
  };

  return (num < 0 ? 'Minus ' : '') + convert(n).trim();
}
