import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all transporters
router.get('/', async (req, res) => {
  try {
    const transporters = await prisma.transporter.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(transporters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transporters' });
  }
});

// Create transporter
router.post('/', async (req, res) => {
  try {
    const transporter = await prisma.transporter.create({
      data: req.body
    });
    res.status(201).json(transporter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transporter' });
  }
});

// Update transporter
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transporter = await prisma.transporter.update({
      where: { id },
      data: req.body
    });
    res.json(transporter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transporter' });
  }
});

// Delete transporter
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transporter.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transporter' });
  }
});

export default router;
