import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Fetch ALL initial data in a single request for instant app load
router.get('/initial', async (req, res) => {
  try {
    const [settings, products, parties, transporters, bills] = await Promise.all([
      prisma.settings.findFirst(),
      prisma.product.findMany({ orderBy: { name: 'asc' } }),
      prisma.party.findMany({ orderBy: { name: 'asc' } }),
      prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
      prisma.bill.findMany({
        include: { lineItems: true },
        orderBy: { date: 'desc' },
      })
    ]);

    res.json({
      settings: settings || { companyName: 'NILANSU PUBLICATION' }, // Provide a default if null
      products,
      parties,
      transporters,
      bills
    });
  } catch (error) {
    console.error('Initial sync error:', error);
    res.status(500).json({ error: 'Failed to synchronize initial data' });
  }
});

export default router;
