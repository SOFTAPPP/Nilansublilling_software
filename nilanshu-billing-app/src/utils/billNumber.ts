import { getDb } from './api';

/**
 * Get the next auto-incremented bill number for a given prefix.
 * Queries the database for the last bill with the given prefix and returns prefix + (lastNumber + 1).
 * 
 * @param prefix - Bill number prefix (e.g., 'CSH-', 'QB-', 'INV-', 'TRN-', 'RCP-', 'VCH-')
 * @returns The next bill number string
 */
export async function getNextBillNumber(prefix: string): Promise<string> {
  try {
    const db = await getDb();
    // Get all bill numbers that start with this prefix
    const result = await db.select(
      `SELECT "billNumber" FROM "Bill" WHERE "billNumber" LIKE $1 ORDER BY "createdAt" DESC LIMIT 50`,
      [`${prefix}%`]
    );

    if (!Array.isArray(result) || result.length === 0) {
      return `${prefix}1`;
    }

    // Extract the numeric parts and find the maximum
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
    // Fallback: use timestamp
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
