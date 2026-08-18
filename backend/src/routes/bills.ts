import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({
      include: {
        lineItems: true,
      },
      orderBy: { date: 'desc' }
    });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Create bill
router.post('/', async (req, res) => {
  try {
    const { lineItems, ...billData } = req.body;
    
    const bill = await prisma.$transaction(async (tx) => {
      // 1. Create the bill and line items
      const newBill = await tx.bill.create({
        data: {
          ...billData,
          date: billData.date ? new Date(billData.date) : new Date(),
          lineItems: {
            create: lineItems.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity) || 0,
              mrp: Number(item.mrp) || 0,
              discountPercent: Number(item.discountPercent) || 0,
              amount: Number(item.amount) || 0,
              rate: Number(item.rate) || 0,
              hsn: item.hsn || '',
            }))
          }
        },
        include: { lineItems: true }
      });

      const type = billData.type || 'cash';

      // 2. Adjust Stock
      for (const item of lineItems) {
        if (item.productId) {
          if (type === 'return') {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) || 0 } }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: Number(item.quantity) || 0 } }
            });
          }
        }
      }

      // 3. Adjust Party Balance
      if (billData.partyId) {
        const deducted = Number(billData.paymentAmount) || 0; // Using paymentAmount as deductedAmount in backend
        const total = Number(billData.total) || 0;
        
        if (type === 'credit') {
          // If they pay partial amount upfront, only the remainder increases balance
          const change = total - deducted;
          await tx.party.update({
            where: { id: billData.partyId },
            data: { outstandingBalance: { increment: change } }
          });
        } else if (type === 'cash') {
          // Cash bill usually means fully paid, but if there's overpayment or partial?
          // The frontend logic for cash: if addedPayment > 0, decrease balance. (addedPayment = deducted < 0)
          // To mirror exact frontend logic: paymentAmount is Math.abs(deductedAmount)
          // For simplicity, we just use the raw values if passed, but typically cash doesn't change balance
        } else if (type === 'return' || type === 'receipt') {
          await tx.party.update({
            where: { id: billData.partyId },
            data: { outstandingBalance: { decrement: total } }
          });
        }
      }

      return newBill;
    });

    res.status(201).json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Update bill
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lineItems, ...billData } = req.body;
    const type = billData.type || 'cash';
    
    const bill = await prisma.$transaction(async (tx) => {
      const oldBill = await tx.bill.findUnique({
        where: { id },
        include: { lineItems: true }
      });
      if (!oldBill) throw new Error("Bill not found");

      // Revert old party balance
      if (oldBill.partyId) {
        let revert = 0;
        if (oldBill.type === 'credit') {
          revert = - (oldBill.total - ((oldBill as any).paymentAmount || 0));
        } else if (oldBill.type === 'return' || oldBill.type === 'receipt') {
          revert = oldBill.total;
        }
        if (revert !== 0) {
          await tx.party.update({
            where: { id: oldBill.partyId },
            data: { outstandingBalance: { increment: revert } }
          });
        }
      }

      // Revert old stock
      for (const oldItem of oldBill.lineItems) {
        if (oldBill.type === 'return') {
          await tx.product.update({
            where: { id: oldItem.productId },
            data: { stock: { decrement: oldItem.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: oldItem.productId },
            data: { stock: { increment: oldItem.quantity } }
          });
        }
      }

      // Delete old line items
      await tx.billLineItem.deleteMany({ where: { billId: id } });

      // Update Bill and create new line items
      const updatedBill = await tx.bill.update({
        where: { id },
        data: {
          ...billData,
          date: billData.date ? new Date(billData.date) : new Date(),
          lineItems: {
            create: lineItems.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity) || 0,
              mrp: Number(item.mrp) || 0,
              discountPercent: Number(item.discountPercent) || 0,
              amount: Number(item.amount) || 0,
              rate: Number(item.rate) || 0,
              hsn: item.hsn || '',
            }))
          }
        },
        include: { lineItems: true }
      });

      // Apply new stock
      for (const item of lineItems) {
        if (item.productId) {
          if (type === 'return') {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) || 0 } }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: Number(item.quantity) || 0 } }
            });
          }
        }
      }

      // Apply new party balance
      if (billData.partyId) {
        const deducted = Number(billData.paymentAmount) || 0;
        const total = Number(billData.total) || 0;
        if (type === 'credit') {
          const change = total - deducted;
          await tx.party.update({
            where: { id: billData.partyId },
            data: { outstandingBalance: { increment: change } }
          });
        } else if (type === 'return' || type === 'receipt') {
          await tx.party.update({
            where: { id: billData.partyId },
            data: { outstandingBalance: { decrement: total } }
          });
        }
      }

      return updatedBill;
    });

    res.json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({
        where: { id },
        include: { lineItems: true }
      });
      if (!bill) return;

      // Revert stock
      for (const item of bill.lineItems) {
        if (bill.type === 'return') {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      // Revert party balance
      if (bill.partyId) {
        if (bill.type === 'credit') {
          const change = bill.total - ((bill as any).paymentAmount || 0);
          await tx.party.update({
            where: { id: bill.partyId },
            data: { outstandingBalance: { decrement: change } }
          });
        } else if (bill.type === 'return' || bill.type === 'receipt') {
          await tx.party.update({
            where: { id: bill.partyId },
            data: { outstandingBalance: { increment: bill.total } }
          });
        }
      }

      await tx.billLineItem.deleteMany({ where: { billId: id } });
      await tx.bill.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

export default router;
