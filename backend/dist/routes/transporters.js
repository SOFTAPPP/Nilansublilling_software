"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get all transporters
router.get('/', async (req, res) => {
    try {
        const transporters = await prisma_1.default.transporter.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(transporters);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transporters' });
    }
});
// Create transporter
router.post('/', async (req, res) => {
    try {
        const transporter = await prisma_1.default.transporter.create({
            data: req.body
        });
        res.status(201).json(transporter);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create transporter' });
    }
});
// Update transporter
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transporter = await prisma_1.default.transporter.update({
            where: { id },
            data: req.body
        });
        res.json(transporter);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update transporter' });
    }
});
// Delete transporter
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.transporter.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete transporter' });
    }
});
exports.default = router;
