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
        const type = billData.type || 'cash';
        // Types that affect stock (sales/returns)
        const stockAffectingTypes = ['cash', 'credit', 'quick', 'transport', 'return'];
        const shouldAffectStock = stockAffectingTypes.includes(type);
        const bill = await prisma_1.default.$transaction(async (tx) => {
            // 1. Validate stock BEFORE creating the bill (only for sale types, not return/receipt/voucher)
            if (shouldAffectStock && type !== 'return') {
                for (const item of lineItems) {
                    if (item.productId) {
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        if (!product) {
                            throw new Error(`Product not found: ${item.productId}`);
                        }
                        const qty = Number(item.quantity) || 0;
                        if (qty > product.stock) {
                            throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`);
                        }
                    }
                }
            }
            // 2. Create the bill and line items
            const newBill = await tx.bill.create({
                data: {
                    ...billData,
                    date: billData.date ? new Date(billData.date) : new Date(),
                    lineItems: {
                        create: lineItems.map((item) => ({
                            productId: item.productId,
                            quantity: Number(item.quantity) || 0,
                            mrp: Number(item.mrp) || 0,
                            discountPercent: Number(item.discountPercent) || 0,
                            amount: Number(item.amount) || 0,
                            rate: Number(item.rate) || 0,
                            hsn: item.hsn || '',
                        }))
                    }
                },
                include: { lineItems: true }
            });
            // 3. Adjust Stock (only for stock-affecting types)
            if (shouldAffectStock) {
                for (const item of lineItems) {
                    if (item.productId) {
                        if (type === 'return') {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { increment: Number(item.quantity) || 0 } }
                            });
                        }
                        else {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { decrement: Number(item.quantity) || 0 } }
                            });
                        }
                    }
                }
            }
            // 3. Adjust Party Balance
            if (billData.partyId) {
                const deducted = Number(billData.paymentAmount) || 0; // Using paymentAmount as deductedAmount in backend
                const total = Number(billData.total) || 0;
                if (type === 'credit') {
                    // If they pay partial amount upfront, only the remainder increases balance
                    const change = total - deducted;
                    await tx.party.update({
                        where: { id: billData.partyId },
                        data: { outstandingBalance: { increment: change } }
                    });
                }
                else if (type === 'cash') {
                    if (deducted > 0) {
                        await tx.party.update({
                            where: { id: billData.partyId },
                            data: { outstandingBalance: { decrement: deducted } }
                        });
                    }
                }
                else if (type === 'return' || type === 'receipt') {
                    await tx.party.update({
                        where: { id: billData.partyId },
                        data: { outstandingBalance: { decrement: total } }
                    });
                }
            }
            return newBill;
        });
        res.status(201).json(bill);
    }
    catch (error) {
        console.error(error);
        const msg = error.message || 'Failed to create bill';
        // Return 400 for stock validation errors, 500 for other errors
        const status = msg.includes('Insufficient stock') ? 400 : 500;
        res.status(status).json({ error: msg });
    }
});
// Update bill
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lineItems, ...billData } = req.body;
        const type = billData.type || 'cash';
        const bill = await prisma_1.default.$transaction(async (tx) => {
            const oldBill = await tx.bill.findUnique({
                where: { id },
                include: { lineItems: true }
            });
            if (!oldBill)
                throw new Error("Bill not found");
            // Revert old party balance
            if (oldBill.partyId) {
                let revert = 0;
                if (oldBill.type === 'credit') {
                    revert = -(oldBill.total - (oldBill.paymentAmount || 0));
                }
                else if (oldBill.type === 'return' || oldBill.type === 'receipt') {
                    revert = oldBill.total;
                }
                else if (oldBill.type === 'cash') {
                    revert = (oldBill.paymentAmount || 0);
                }
                if (revert !== 0) {
                    await tx.party.update({
                        where: { id: oldBill.partyId },
                        data: { outstandingBalance: { increment: revert } }
                    });
                }
            }
            // Revert old stock (only for stock-affecting bill types)
            const oldStockAffecting = ['cash', 'credit', 'quick', 'transport', 'return'].includes(oldBill.type);
            if (oldStockAffecting) {
                for (const oldItem of oldBill.lineItems) {
                    if (oldBill.type === 'return') {
                        await tx.product.update({
                            where: { id: oldItem.productId },
                            data: { stock: { decrement: oldItem.quantity } }
                        });
                    }
                    else {
                        await tx.product.update({
                            where: { id: oldItem.productId },
                            data: { stock: { increment: oldItem.quantity } }
                        });
                    }
                }
            }
            // Delete old line items
            await tx.billLineItem.deleteMany({ where: { billId: id } });
            // Update Bill and create new line items
            const updatedBill = await tx.bill.update({
                where: { id },
                data: {
                    ...billData,
                    date: billData.date ? new Date(billData.date) : new Date(),
                    lineItems: {
                        create: lineItems.map((item) => ({
                            productId: item.productId,
                            quantity: Number(item.quantity) || 0,
                            mrp: Number(item.mrp) || 0,
                            discountPercent: Number(item.discountPercent) || 0,
                            amount: Number(item.amount) || 0,
                            rate: Number(item.rate) || 0,
                            hsn: item.hsn || '',
                        }))
                    }
                },
                include: { lineItems: true }
            });
            // Apply new stock (only for stock-affecting types)
            const newStockAffecting = ['cash', 'credit', 'quick', 'transport', 'return'].includes(type);
            if (newStockAffecting) {
                // Validate stock before decrementing (for sale types)
                if (type !== 'return') {
                    for (const item of lineItems) {
                        if (item.productId) {
                            const product = await tx.product.findUnique({ where: { id: item.productId } });
                            if (!product)
                                throw new Error(`Product not found: ${item.productId}`);
                            const qty = Number(item.quantity) || 0;
                            if (qty > product.stock) {
                                throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`);
                            }
                        }
                    }
                }
                for (const item of lineItems) {
                    if (item.productId) {
                        if (type === 'return') {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { increment: Number(item.quantity) || 0 } }
                            });
                        }
                        else {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { decrement: Number(item.quantity) || 0 } }
                            });
                        }
                    }
                }
            }
            // Apply new party balance
            if (billData.partyId) {
                const deducted = Number(billData.paymentAmount) || 0;
                const total = Number(billData.total) || 0;
                if (type === 'credit') {
                    const change = total - deducted;
                    await tx.party.update({
                        where: { id: billData.partyId },
                        data: { outstandingBalance: { increment: change } }
                    });
                }
                else if (type === 'cash') {
                    if (deducted > 0) {
                        await tx.party.update({
                            where: { id: billData.partyId },
                            data: { outstandingBalance: { decrement: deducted } }
                        });
                    }
                }
                else if (type === 'return' || type === 'receipt') {
                    await tx.party.update({
                        where: { id: billData.partyId },
                        data: { outstandingBalance: { decrement: total } }
                    });
                }
            }
            return updatedBill;
        });
        res.json(bill);
    }
    catch (error) {
        console.error(error);
        const msg = error.message || 'Failed to update bill';
        const status = msg.includes('Insufficient stock') ? 400 : 500;
        res.status(status).json({ error: msg });
    }
});
// Delete bill
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.$transaction(async (tx) => {
            const bill = await tx.bill.findUnique({
                where: { id },
                include: { lineItems: true }
            });
            if (!bill)
                return;
            // Revert stock (only for stock-affecting bill types)
            const delStockAffecting = ['cash', 'credit', 'quick', 'transport', 'return'].includes(bill.type);
            if (delStockAffecting) {
                for (const item of bill.lineItems) {
                    if (bill.type === 'return') {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } }
                        });
                    }
                    else {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                    }
                }
            }
            // Revert party balance
            if (bill.partyId) {
                if (bill.type === 'credit') {
                    const change = bill.total - (bill.paymentAmount || 0);
                    await tx.party.update({
                        where: { id: bill.partyId },
                        data: { outstandingBalance: { decrement: change } }
                    });
                }
                else if (bill.type === 'return' || bill.type === 'receipt') {
                    await tx.party.update({
                        where: { id: bill.partyId },
                        data: { outstandingBalance: { increment: bill.total } }
                    });
                }
                else if (bill.type === 'cash') {
                    const extra = bill.paymentAmount || 0;
                    if (extra > 0) {
                        await tx.party.update({
                            where: { id: bill.partyId },
                            data: { outstandingBalance: { increment: extra } }
                        });
                    }
                }
            }
            await tx.billLineItem.deleteMany({ where: { billId: id } });
            await tx.bill.delete({ where: { id } });
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete bill' });
    }
});
exports.default = router;
