import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

import { authenticate, AuthRequest } from '../middleware/auth';

// Get current user
router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({ admin: req.admin });
});

export default router;
