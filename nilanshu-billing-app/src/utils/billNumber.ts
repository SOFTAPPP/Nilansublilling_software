import { getDb } from './api';
import { Bill } from '../store/useStore';

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
    const creditBills = bills.filter(b => b.type === 'credit');
    
    let maxNum = 0;
    for (const row of creditBills) {
      const billNum = row.billNumber || '';
      const match = billNum.match(/^(\d+)-(\d{4})$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
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
 * Get the next auto-incremented bill number for a given prefix.
 */
export async function getNextBillNumber(prefix: string): Promise<string> {
  try {
    const db = await getDb();
    
    // Special handling for Invoice format: 01-2026
    if (prefix === 'INV-') {
      const currentYear = new Date().getFullYear();
      const result = await db.select(
        `SELECT "billNumber" FROM "Bill" WHERE "type" = 'credit' ORDER BY "createdAt" DESC LIMIT 50`
      );
      
      let maxNum = 0;
      if (Array.isArray(result)) {
        for (const row of result as any[]) {
          const billNum = row.billNumber || '';
          // Try to match format like 01-2026 or 1-2026
          const match = billNum.match(/^(\d+)-(\d{4})$/);
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          } else if (billNum.startsWith('INV-')) {
            const parsed = parseInt(billNum.replace('INV-', ''), 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
      }
      return `${(maxNum + 1).toString().padStart(2, '0')}-${currentYear}`;
    }

    // Default handling for other prefixes like CSH-, QB-, etc.
    const result = await db.select(
      `SELECT "billNumber" FROM "Bill" WHERE "billNumber" LIKE $1 ORDER BY "createdAt" DESC LIMIT 50`,
      [`${prefix}%`]
    );

    if (!Array.isArray(result) || result.length === 0) {
      return `${prefix}1`;
    }

    let maxNum = 0;
    for (const row of result as any[]) {
      const billNum = row.billNumber || '';
      const numPart = billNum.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }

    return `${prefix}${maxNum + 1}`;
  } catch (err) {
    console.error(`[getNextBillNumber] Failed for prefix "${prefix}":`, err);
    if (prefix === 'INV-') return `01-${new Date().getFullYear()}`;
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Check if a bill number already exists in the database.
 * @param billNumber - The full bill number to check (e.g., 'CSH-1', 'INV-01-2026')
 * @returns true if the bill number already exists
 */
export async function checkBillNumberExists(billNumber: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.select(
      `SELECT COUNT(*) as cnt FROM "Bill" WHERE "billNumber" = $1`,
      [billNumber]
    );
    if (Array.isArray(result) && result.length > 0) {
      const count = Number((result[0] as any).cnt);
      return count > 0;
    }
    return false;
  } catch (err) {
    console.error('[checkBillNumberExists] Failed:', err);
    return false;
  }
}
