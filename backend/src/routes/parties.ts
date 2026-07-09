import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all parties
router.get('/', async (req, res) => {
  try {
    const parties = await prisma.party.findMany();
    res.json(parties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

// Create party
router.post('/', async (req, res) => {
  try {
    const party = await prisma.party.create({
      data: req.body,
    });
    res.status(201).json(party);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// Update party
router.put('/:id', async (req, res) => {
  try {
    const party = await prisma.party.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(party);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update party' });
  }
});

// Delete party
router.delete('/:id', async (req, res) => {
  try {
    await prisma.party.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete party' });
  }
});

export default router;
