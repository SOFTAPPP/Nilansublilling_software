import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Send SMS Simulation
router.post('/send', (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    res.status(400).json({ error: 'Phone and message are required' });
    return;
  }

  const logLine = `[${new Date().toISOString()}] To: ${phone} | Message: ${message}\n`;
  const logFile = path.join(__dirname, '../../../sms_logs.txt');

  // Print to console
  console.log(`[SMS SIMULATOR] ${logLine.trim()}`);

  // Write to log file
  try {
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write to SMS log file', err);
  }

  res.json({ success: true, message: 'SMS sent successfully (simulated)' });
});

export default router;
