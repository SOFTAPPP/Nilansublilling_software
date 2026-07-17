"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await prisma_1.default.admin.findUnique({ where: { username } });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt_1.default.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
        res.json({ token, admin: { id: admin.id, username: admin.username } });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
const auth_1 = require("../middleware/auth");
// Get current user
router.get('/me', auth_1.authenticate, (req, res) => {
    res.json({ admin: req.admin });
});
exports.default = router;
