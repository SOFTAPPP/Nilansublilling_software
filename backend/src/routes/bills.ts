import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({
      include: {
        lineItems: true,
        party: true,
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
    const bill = await prisma.bill.create({
      data: {
        ...billData,
        lineItems: {
          create: lineItems
        }
      },
      include: {
        lineItems: true,
      }
    });
    
    // Decrease stock for each product in the bill
    for (const item of lineItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity }
        }
      });
    }

    res.status(201).json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

export default router;
