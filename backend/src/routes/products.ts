import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Helper: extract only valid Product fields from request body
const pickProductFields = (body: any) => {
  const fields: any = {};
  if (body.name !== undefined) fields.name = body.name;
  if (body.category !== undefined) fields.category = body.category;
  if (body.price !== undefined) fields.price = Number(body.price) || 0;
  if (body.stock !== undefined) fields.stock = Number(body.stock) || 0;
  if (body.lowStockThreshold !== undefined) fields.lowStockThreshold = Number(body.lowStockThreshold) || 10;
  if (body.bindingVariant !== undefined) fields.bindingVariant = body.bindingVariant || null;
  if (body.hsn !== undefined) fields.hsn = body.hsn || null;
  if (body.barcode !== undefined) fields.barcode = body.barcode || null;
  if (body.part !== undefined) fields.part = body.part || null;
  return fields;
};

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error('GET /products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Generate next PROD-XXXXXX ID
const generateProductId = async (): Promise<string> => {
  const products = await prisma.product.findMany({
    select: { id: true },
    where: { id: { startsWith: 'PROD-' } },
    orderBy: { id: 'desc' },
    take: 1,
  });
  
  let nextNum = 1;
  if (products.length > 0) {
    const lastId = products[0].id; // e.g. "PROD-000123"
    const numPart = parseInt(lastId.replace('PROD-', ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  
  return `PROD-${String(nextNum).padStart(6, '0')}`;
};

// Create product
router.post('/', async (req, res) => {
  try {
    const data = pickProductFields(req.body);
    // Auto-generate PROD-XXXXXX ID
    data.id = await generateProductId();
    console.log('Creating product with data:', JSON.stringify(data));
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (error: any) {
    console.error('POST /products error:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message || String(error) });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const data = pickProductFields(req.body);
    // Allow updating the Product ID itself
    if (req.body.id && req.body.id.trim() !== '' && req.body.id !== req.params.id) {
      data.id = req.body.id.trim();
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });
    res.json(product);
  } catch (error: any) {
    console.error('PUT /products error:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message || String(error) });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    // First check if product exists
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found in database' });
    }
    
    // Check if product is referenced in any bill line items
    const usageCount = await prisma.billLineItem.count({ where: { productId: req.params.id } });
    if (usageCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product', 
        details: `This product is used in ${usageCount} bill(s). Remove those bills first.` 
      });
    }
    
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /products error:', error);
    res.status(500).json({ error: 'Failed to delete product', details: error.message || String(error) });
  }
});

export default router;
