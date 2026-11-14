"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Fetch ALL initial data in a single request for instant app load
router.get('/initial', async (req, res) => {
    try {
        const [settings, products, parties, transporters, bills] = await Promise.all([
            prisma_1.default.settings.findFirst(),
            prisma_1.default.product.findMany({ orderBy: { name: 'asc' } }),
            prisma_1.default.party.findMany({ orderBy: { name: 'asc' } }),
            prisma_1.default.transporter.findMany({ orderBy: { name: 'asc' } }),
            prisma_1.default.bill.findMany({
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
    }
    catch (error) {
        console.error('Initial sync error:', error);
        res.status(500).json({ error: 'Failed to synchronize initial data' });
    }
});
exports.default = router;
