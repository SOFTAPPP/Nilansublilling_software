"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get all parties
router.get('/', async (req, res) => {
    try {
        const parties = await prisma_1.default.party.findMany();
        res.json(parties);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch parties' });
    }
});
// Create party
router.post('/', async (req, res) => {
    try {
        const party = await prisma_1.default.party.create({
            data: req.body,
        });
        res.status(201).json(party);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create party' });
    }
});
// Update party
router.put('/:id', async (req, res) => {
    try {
        const party = await prisma_1.default.party.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json(party);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update party' });
    }
});
// Delete party
router.delete('/:id', async (req, res) => {
    try {
        await prisma_1.default.party.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete party' });
    }
});
exports.default = router;
