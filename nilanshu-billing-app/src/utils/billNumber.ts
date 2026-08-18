import { Bill, useStore } from '../store/useStore';

/**
 * Get the next auto-incremented bill number for a given prefix synchronously from memory.
 * 
 * @param prefix - Bill number prefix (e.g., 'CSH-', 'QB-', 'INV-', 'TRN-', 'RCP-', 'VCH-')
 * @param bills - Array of all bills from the store
 * @returns The next bill number string
 */
export function getNextBillNumberSync(prefix: string, bills: Bill[]): string {
  if (prefix === 'INV-') {
    const currentYear = new Date().getFullYear();
    
    let maxNum = 0;
    for (const row of bills) {
      const billNum = row.billNumber || '';
      const match = billNum.match(/^(\d+)-(\d{4})$/);
      if (match) {
        const billYear = parseInt(match[2], 10);
        if (billYear === currentYear) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      } else if (billNum.startsWith('INV-')) {
        const parsed = parseInt(billNum.replace('INV-', ''), 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    return `${(maxNum + 1).toString().padStart(2, '0')}-${currentYear}`;
  }

  const matchingBills = bills.filter(b => (b.billNumber || '').startsWith(prefix));
  if (matchingBills.length === 0) {
    return `${prefix}1`;
  }

  let maxNum = 0;
  for (const row of matchingBills) {
    const billNum = row.billNumber || '';
    const numPart = billNum.replace(prefix, '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }

  return `${prefix}${maxNum + 1}`;
}

/**
 * Get the next auto-incremented bill number for a given prefix using local store data.
 */
export async function getNextBillNumber(prefix: string): Promise<string> {
  const bills = useStore.getState().bills;
  return getNextBillNumberSync(prefix, bills);
}

/**
 * Check if a bill number already exists in the local store.
 * @param billNumber - The full bill number to check (e.g., 'CSH-1', 'INV-01-2026')
 * @returns true if the bill number already exists
 */
export async function checkBillNumberExists(billNumber: string): Promise<boolean> {
  const bills = useStore.getState().bills;
  return bills.some(b => b.billNumber === billNumber);
}
