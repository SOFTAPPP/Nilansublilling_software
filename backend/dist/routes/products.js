"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await prisma_1.default.product.findMany();
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// Create product
router.post('/', async (req, res) => {
    try {
        const product = await prisma_1.default.product.create({
            data: req.body,
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// Update product
router.put('/:id', async (req, res) => {
    try {
        const product = await prisma_1.default.product.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// Delete product
router.delete('/:id', async (req, res) => {
    try {
        await prisma_1.default.product.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;
