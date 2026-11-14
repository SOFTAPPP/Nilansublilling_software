import type { Bill } from '../store/useStore';

// How a saved bill moved the party's outstanding balance.
// Must mirror the balance updates in backend/src/routes/bills.ts.
export const billBalanceEffect = (bill: Bill) => {
  const paid = bill.paymentAmount || 0;
  switch (bill.type) {
    case 'credit': return bill.total - paid;
    case 'cash': return -paid;
    case 'return':
    case 'receipt': return -bill.total;
    default: return 0;
  }
};

// The party's balance just before `billId` was saved.
// The stored outstandingBalance already includes that bill (and every bill saved
// after it), so showing it as "Previous Due" on that bill counts the bill twice.
// For a bill that is not saved yet, the current balance is already the previous one.
export const balanceBeforeBill = (
  currentBalance: number,
  bills: Bill[],
  partyId: string | null,
  billId?: string | null,
) => {
  if (!partyId) return 0;
  const self = billId ? bills.find(b => b.id === billId) : undefined;
  if (!self) return currentBalance;

  const savedAt = (b: Bill) => new Date(b.createdAt || b.date).getTime();
  const selfSavedAt = savedAt(self);
  const effectSinceSelf = bills
    .filter(b => b.partyId === partyId && (b.id === self.id || savedAt(b) > selfSavedAt))
    .reduce((sum, b) => sum + billBalanceEffect(b), 0);
  return currentBalance - effectSinceSelf;
};
