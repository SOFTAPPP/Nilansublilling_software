"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Send SMS Simulation
router.post('/send', (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        res.status(400).json({ error: 'Phone and message are required' });
        return;
    }
    const logLine = `[${new Date().toISOString()}] To: ${phone} | Message: ${message}\n`;
    const logFile = path_1.default.join(__dirname, '../../../sms_logs.txt');
    // Print to console
    console.log(`[SMS SIMULATOR] ${logLine.trim()}`);
    // Write to log file
    try {
        fs_1.default.appendFileSync(logFile, logLine, 'utf8');
    }
    catch (err) {
        console.error('Failed to write to SMS log file', err);
    }
    res.json({ success: true, message: 'SMS sent successfully (simulated)' });
});
exports.default = router;
