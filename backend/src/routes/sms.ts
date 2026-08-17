import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Send SMS
router.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    res.status(400).json({ error: 'Phone and message are required' });
    return;
  }

  const logLine = `[${new Date().toISOString()}] To: ${phone} | Message: ${message}\n`;
  const logFile = path.join(__dirname, '../../../sms_logs.txt');

  // Fast2SMS actual call
  try {
    const fetchFn = globalThis.fetch;
    const response = await fetchFn("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": "CG9UkidHO7tnesDPzu4vbALWxlf1oyEXp6gBRm3QSqc0YTF8VZpN89oXdSfTHDwk6Ls4EzGKY32jqrVa",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "q",
        message: message,
        language: "english",
        flash: 0,
        numbers: phone,
      })
    });
    
    const data = await response.json();
    console.log(`[FAST2SMS RESPONSE]`, data);
    
    // Log to file as well
    fs.appendFileSync(logFile, `${logLine.trim()} | SUCCESS: ${JSON.stringify(data)}\n`, 'utf8');
    
    if (data.return) {
      res.json({ success: true, message: 'SMS sent successfully', fast2sms: data });
    } else {
      res.status(500).json({ error: 'Fast2SMS rejected request', details: data });
    }
  } catch (err: any) {
    console.error('Fast2SMS Error', err);
    fs.appendFileSync(logFile, `${logLine.trim()} | ERROR: ${err.message}\n`, 'utf8');
    res.status(500).json({ error: 'Failed to send SMS', details: err.message });
  }
});

export default router;
