import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import partyRoutes from './routes/parties';
import billRoutes from './routes/bills';
import settingRoutes from './routes/settings';
import smsRoutes from './routes/sms';
import transporterRoutes from './routes/transporters';
import syncRoutes from './routes/sync';
import { authenticate } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/parties', authenticate, partyRoutes);
app.use('/api/bills', authenticate, billRoutes);
app.use('/api/settings', authenticate, settingRoutes);
app.use('/api/transporters', authenticate, transporterRoutes);
app.use('/api/sync', authenticate, syncRoutes);
app.use('/api/sms', smsRoutes); // Local SMS simulator - no auth needed

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
