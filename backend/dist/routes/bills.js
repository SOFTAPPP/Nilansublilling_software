"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get all bills
router.get('/', async (req, res) => {
    try {
        const bills = await prisma_1.default.bill.findMany({
            include: {
                lineItems: true,
                party: true,
            },
            orderBy: { date: 'desc' }
        });
        res.json(bills);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});
// Create bill
router.post('/', async (req, res) => {
    try {
        const { lineItems, ...billData } = req.body;
        const bill = await prisma_1.default.bill.create({
            data: {
                ...billData,
                lineItems: {
                    create: lineItems
                }
            },
            include: {
                lineItems: true,
            }
        });
        // Decrease stock for each product in the bill
        for (const item of lineItems) {
            await prisma_1.default.product.update({
                where: { id: item.productId },
                data: {
                    stock: { decrement: item.quantity }
                }
            });
        }
        res.status(201).json(bill);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create bill' });
    }
});
exports.default = router;
