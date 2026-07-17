"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get settings
router.get('/', async (req, res) => {
    try {
        let settings = await prisma_1.default.settings.findUnique({ where: { id: 1 } });
        if (!settings) {
            settings = await prisma_1.default.settings.create({ data: { id: 1 } });
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// Update settings
router.put('/', async (req, res) => {
    try {
        const settings = await prisma_1.default.settings.upsert({
            where: { id: 1 },
            update: req.body,
            create: { ...req.body, id: 1 }
        });
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
exports.default = router;
