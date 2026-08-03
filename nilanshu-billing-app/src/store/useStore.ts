import { create } from 'zustand';
import { getDb } from '../utils/api';

export interface Product {
  id: string; // generate simple ID
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  bindingVariant?: string;
  hsn?: string;
  barcode?: string;
}

export interface Party {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  gstin?: string;
  discountPercentage: number;
  outstandingBalance: number;
}

export interface Transporter {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Bill {
  id: string;
  type: string;
  billNumber: string;
  partyId?: string;
  transporterId?: string;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  status: string;
  date: string;
}

export interface BillLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  mrp: number;
  discountPercent: number;
  amount: number;
  hsn?: string;
  rate?: number; // Pre-tax rate for chalan
}

export interface DialogOptions {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface Settings {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyGstin: string;
  companyState: string;
  companyContact: string;
  companyEmail: string;
  companyPan: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
}

interface AppState {
  products: Product[];
  parties: Party[];
  transporters: Transporter[];
  bills: Bill[];
  settings: Settings;
  theme: 'light' | 'dark';
  token: string | null;
  dialog: DialogOptions;
  showDialog: (options: Omit<DialogOptions, 'isOpen'>) => void;
  closeDialog: () => void;
  setProducts: (products: Product[]) => void;
  setParties: (parties: Party[]) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  toggleTheme: () => void;
  fetchProducts: () => Promise<void>;
  fetchParties: () => Promise<void>;
  fetchTransporters: () => Promise<void>;
  fetchBills: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addParty: (party: Partial<Party>) => Promise<void>;
  updateParty: (id: string, party: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  addTransporter: (transporter: Partial<Transporter>) => Promise<void>;
  updateTransporter: (id: string, transporter: Partial<Transporter>) => Promise<void>;
  deleteTransporter: (id: string) => Promise<void>;
  createBill: (billData: any) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  addProductsBulk: (products: Partial<Product>[]) => Promise<void>;
  findProductByBarcode: (barcode: string) => Product | undefined;
}

export const useStore = create<AppState>((set) => ({
  products: [],
  parties: [],
  transporters: [],
  bills: [],
  settings: {
    companyName: 'NILANSU PUBLICATION',
    companyAddress: '34, BENIATOLA LANE',
    companyCity: 'KOLKATA - 700009',
    companyGstin: '',
    companyState: '',
    companyContact: '+91 8240160147',
    companyEmail: 'nilansupublication@gmail.com',
    companyPan: 'CJZPP7439N',
    bankAccountName: '',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: ''
  },
  theme: 'light',
  token: sessionStorage.getItem('token'),
  isAuthenticated: false,
  dialog: {
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  },
  showDialog: (options) => set({ dialog: { ...options, isOpen: true } }),
  closeDialog: () => set((state) => ({ dialog: { ...state.dialog, isOpen: false } })),
  setProducts: (products) => set({ products }),
  setParties: (parties) => set({ parties }),
  updateSettings: async (newSettings) => {
    try {
      const current = useStore.getState().settings;
      const updated = { ...current, ...newSettings };

      // Update UI state immediately to prevent React input cursor jumping
      set({ settings: updated });

      const db = await getDb();

      const res = await db.select('SELECT * FROM "Settings" WHERE id = 1');
      if (Array.isArray(res) && res.length > 0) {
        await db.execute(
          `UPDATE "Settings" SET 
            "companyName"=$1, "companyAddress"=$2, "companyCity"=$3, "companyGstin"=$4, 
            "companyState"=$5, "companyContact"=$6, "companyEmail"=$7, "companyPan"=$8, 
            "bankAccountName"=$9, "bankName"=$10, "bankAccountNo"=$11, "bankIfsc"=$12 
          WHERE id = 1`,
          [
            updated.companyName || '', updated.companyAddress || '', updated.companyCity || '', updated.companyGstin || '',
            updated.companyState || '', updated.companyContact || '', updated.companyEmail || '', updated.companyPan || '',
            updated.bankAccountName || '', updated.bankName || '', updated.bankAccountNo || '', updated.bankIfsc || ''
          ]
        );
      } else {
        await db.execute(
          `INSERT INTO "Settings" (
            id, "companyName", "companyAddress", "companyCity", "companyGstin", 
            "companyState", "companyContact", "companyEmail", "companyPan", 
            "bankAccountName", "bankName", "bankAccountNo", "bankIfsc"
          ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            updated.companyName || '', updated.companyAddress || '', updated.companyCity || '', updated.companyGstin || '',
            updated.companyState || '', updated.companyContact || '', updated.companyEmail || '', updated.companyPan || '',
            updated.bankAccountName || '', updated.bankName || '', updated.bankAccountNo || '', updated.bankIfsc || ''
          ]
        );
      }
      // DB updated successfully in background
    } catch (error) {
      console.error('Failed to update settings in database', error);
      // Fallback to local state if database fails
      set((state) => ({ settings: { ...state.settings, ...newSettings } }));
    }
  },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),
  fetchProducts: async () => {
    try {
      const db = await getDb();
      const products = await db.select('SELECT * FROM "Product"');
      set({ products: products as Product[] });
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  },
  fetchParties: async () => {
    try {
      const db = await getDb();
      const parties = await db.select('SELECT * FROM "Party"');
      set({ parties: parties as Party[] });
    } catch (error) {
      console.error('Failed to fetch parties', error);
    }
  },
  fetchTransporters: async () => {
    try {
      const db = await getDb();
      const transporters = await db.select('SELECT * FROM "Transporter"');
      set({ transporters: transporters as Transporter[] });
    } catch (error) {
      console.error('Failed to fetch transporters', error);
    }
  },
  fetchBills: async () => {
    try {
      const db = await getDb();
      const bills = await db.select('SELECT * FROM "Bill" ORDER BY date DESC');
      set({ bills: bills as Bill[] });
    } catch (error) {
      console.error('Failed to fetch bills', error);
    }
  },
  fetchSettings: async () => {
    try {
      const db = await getDb();
      let res = await db.select('SELECT * FROM "Settings" WHERE id = 1');
      if (!Array.isArray(res) || res.length === 0) {
        await db.execute('INSERT INTO "Settings" (id, "companyName") VALUES (1, $1)', ['NILANSU PUBLICATION']);
        res = await db.select('SELECT * FROM "Settings" WHERE id = 1');
      }
      if (Array.isArray(res) && res.length > 0) {
        const dbSettings = res[0] as Settings;
        let needsUpdate = false;
        if (!dbSettings.companyName) { dbSettings.companyName = 'NILANSU PUBLICATION'; needsUpdate = true; }
        if (!dbSettings.companyAddress) { dbSettings.companyAddress = '34, BENIATOLA LANE'; needsUpdate = true; }
        if (!dbSettings.companyCity) { dbSettings.companyCity = 'KOLKATA - 700009'; needsUpdate = true; }
        if (!dbSettings.companyContact) { dbSettings.companyContact = '+91 8240160147'; needsUpdate = true; }
        if (!dbSettings.companyEmail) { dbSettings.companyEmail = 'nilansupublication@gmail.com'; needsUpdate = true; }
        if (!dbSettings.companyPan) { dbSettings.companyPan = 'CJZPP7439N'; needsUpdate = true; }

        if (needsUpdate) {
          await db.execute(
            'UPDATE "Settings" SET "companyName"=$1, "companyAddress"=$2, "companyCity"=$3, "companyContact"=$4, "companyEmail"=$5, "companyPan"=$6 WHERE id = 1',
            [dbSettings.companyName, dbSettings.companyAddress, dbSettings.companyCity, dbSettings.companyContact, dbSettings.companyEmail, dbSettings.companyPan]
          );
        }
        set({ settings: dbSettings });
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  },
  addProduct: async (product) => {
    const db = await getDb();
    const id = product.id || crypto.randomUUID();
    await db.execute(
      'INSERT INTO "Product" (id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, barcode, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
      [id, product.name, product.category, product.price || 0, product.stock || 0, product.lowStockThreshold || 10, product.bindingVariant || null, product.hsn || null, product.barcode || null]
    );
    await useStore.getState().fetchProducts();
  },
  addProductsBulk: async (productsList) => {
    const db = await getDb();
    // Use a transaction or sequential inserts
    for (const product of productsList) {
      const id = product.id || crypto.randomUUID();
      try {
        await db.execute(
          'INSERT INTO "Product" (id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, barcode, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
          [id, product.name, product.category, product.price || 0, product.stock || 0, product.lowStockThreshold || 10, product.bindingVariant || null, product.hsn || null, product.barcode || null]
        );
      } catch (err) {
        console.error('Failed to insert product bulk', product.name, err);
      }
    }
    await useStore.getState().fetchProducts();
  },
  updateProduct: async (id, product) => {
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE "Product" SET name=$1, category=$2, price=$3, stock=$4, "lowStockThreshold"=$5, "bindingVariant"=$6, hsn=$7, barcode=$8, "updatedAt"=NOW() WHERE id=$9',
        [product.name, product.category, product.price || 0, product.stock || 0, product.lowStockThreshold || 10, product.bindingVariant || null, product.hsn || null, product.barcode || null, id]
      );
      await useStore.getState().fetchProducts();
    } catch (err: any) {
      console.error('Update Product Error:', err);
      useStore.getState().showDialog({
        title: 'Update Error',
        message: err.message || 'Failed to update product',
        type: 'alert'
      });
    }
  },
  deleteProduct: async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM "Product" WHERE id=$1', [id]);
      await useStore.getState().fetchProducts();
    } catch (err) {
      useStore.getState().showDialog({
        title: 'Delete Failed',
        message: 'Cannot delete this product because it is already used in existing bills or records.',
        type: 'alert'
      });
    }
  },
  addParty: async (party) => {
    const db = await getDb();
    const id = party.id || crypto.randomUUID();
    await db.execute(
      'INSERT INTO "Party" (id, name, address, phone, email, gstin, "discountPercentage", "outstandingBalance", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
      [id, party.name, party.address, party.phone, party.email || null, party.gstin || null, party.discountPercentage || 0, party.outstandingBalance || 0]
    );
    await useStore.getState().fetchParties();
  },
  updateParty: async (id, party) => {
    const db = await getDb();
    await db.execute(
      'UPDATE "Party" SET name=$1, address=$2, phone=$3, email=$4, gstin=$5, "discountPercentage"=$6, "outstandingBalance"=$7, "updatedAt"=NOW() WHERE id=$8',
      [party.name, party.address, party.phone, party.email || null, party.gstin || null, party.discountPercentage, party.outstandingBalance, id]
    );
    await useStore.getState().fetchParties();
  },
  deleteParty: async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM "Party" WHERE id=$1', [id]);
      await useStore.getState().fetchParties();
    } catch (err) {
      useStore.getState().showDialog({
        title: 'Delete Failed',
        message: 'Cannot delete this customer because they have existing bills or records.',
        type: 'alert'
      });
    }
  },
  addTransporter: async (transporter) => {
    const db = await getDb();
    const id = transporter.id || crypto.randomUUID();
    await db.execute(
      'INSERT INTO "Transporter" (id, name, address, phone, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id, transporter.name, transporter.address, transporter.phone]
    );
    await useStore.getState().fetchTransporters();
  },
  updateTransporter: async (id, transporter) => {
    const db = await getDb();
    await db.execute(
      'UPDATE "Transporter" SET name=$1, address=$2, phone=$3, "updatedAt"=NOW() WHERE id=$4',
      [transporter.name, transporter.address, transporter.phone, id]
    );
    await useStore.getState().fetchTransporters();
  },
  deleteTransporter: async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM "Transporter" WHERE id=$1', [id]);
      await useStore.getState().fetchTransporters();
    } catch (err) {
      useStore.getState().showDialog({
        title: 'Delete Failed',
        message: 'Cannot delete this transporter because they have existing bills or records.',
        type: 'alert'
      });
    }
  },
  createBill: async (billData) => {
    const db = await getDb();
    const id = crypto.randomUUID();

    if (!billData.lineItems || billData.lineItems.length === 0) {
      throw new Error('Bill must have at least one line item.');
    }

    // Validate and auto-create products for manually typed line items
    for (let i = 0; i < billData.lineItems.length; i++) {
      if (!billData.lineItems[i].productId) {
        if (!billData.lineItems[i].productName?.trim()) {
          throw new Error(`Item ${i + 1} is empty. Please enter a product name.`);
        }

        const existingProd = useStore.getState().products.find(p => p.name.toLowerCase() === billData.lineItems[i].productName.trim().toLowerCase());

        if (existingProd) {
          billData.lineItems[i].productId = existingProd.id;
        } else {
          const newProdId = crypto.randomUUID();
          await db.execute(
            'INSERT INTO "Product" (id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
            [newProdId, billData.lineItems[i].productName.trim(), 'Miscellaneous', billData.lineItems[i].mrp || 0, 0, 10, null, billData.lineItems[i].hsn || null]
          );
          billData.lineItems[i].productId = newProdId;
        }
      }
    }

    // Pre-flight: check stock availability for non-return bills
    const type = billData.type || 'cash';
    if (type !== 'return') {
      for (const item of billData.lineItems) {
        if (!item.productId) continue;
        const stockRows = await db.select<{ stock: number; name: string; category: string }[]>(
          'SELECT stock, name, category FROM "Product" WHERE id = $1', [item.productId]
        );
        if (!stockRows || stockRows.length === 0) continue;
        const currentStock = Number(stockRows[0].stock) || 0;
        const needed = Number(item.quantity) || 0;
        if (currentStock < needed && stockRows[0].category !== 'Miscellaneous') {
          throw new Error(`Insufficient stock for "${stockRows[0].name}". Available: ${currentStock}, Needed: ${needed}`);
        }
      }
    }

    // Begin pseudo-transaction: insert bill first, then items sequentially
    try {
      await db.execute(
        `INSERT INTO "Bill" (
          id, type, "billNumber", "partyId", "transporterId", subtotal, discount, cgst, sgst, total, status, date, 
          "vehicleNo", destination, "driverName", "lrNo", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CAST($12 AS TIMESTAMP), $13, $14, $15, $16, NOW(), NOW())`,
        [
          id,
          type,
          billData.billNumber || `BILL-${Date.now()}`,
          billData.partyId || null,
          billData.transporterId || null,
          billData.subtotal,
          billData.discount,
          billData.cgst || 0,
          billData.sgst || 0,
          billData.total,
          billData.status || 'completed',
          billData.date ? new Date(billData.date).toISOString() : new Date().toISOString(),
          billData.vehicleNo || null,
          billData.destination || null,
          billData.driverName || null,
          billData.lrNo || null
        ]
      );
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err.message;
      if (errMsg && errMsg.includes('duplicate key')) {
        throw new Error('Bill number already exists. Please use a different bill number.');
      }
      throw new Error(errMsg || 'Failed to save bill to database.');
    }

    // Insert line items and update stock
    for (const item of (billData.lineItems || [])) {
      const itemId = crypto.randomUUID();
      await db.execute(
        'INSERT INTO "BillLineItem" (id, "billId", "productId", quantity, mrp, "discountPercent", amount, rate, hsn) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [itemId, id, item.productId, item.quantity, item.mrp, item.discountPercent, item.amount, item.rate || 0, item.hsn || '']
      );

      if (item.productId) {
        if (type === 'return') {
          await db.execute('UPDATE "Product" SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2', [item.quantity, item.productId]);
        } else {
          await db.execute('UPDATE "Product" SET stock = stock - $1, "updatedAt" = NOW() WHERE id = $2', [item.quantity, item.productId]);
        }
      }
    }

    // Adjust party outstanding balance
    if (billData.partyId) {
      if (type === 'credit') {
        await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" + $1, "updatedAt" = NOW() WHERE id = $2', [billData.total, billData.partyId]);
      } else if (type === 'return') {
        await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" - $1, "updatedAt" = NOW() WHERE id = $2', [billData.total, billData.partyId]);
      }
    }

    await useStore.getState().fetchProducts();
    await useStore.getState().fetchParties();
    await useStore.getState().fetchBills();
  },
  deleteBill: async (id) => {
    try {
      const db = await getDb();

      const billRows = await db.select<{ type: string, total: number, partyId: string | null }[]>('SELECT type, total, "partyId" FROM "Bill" WHERE id = $1', [id]);
      if (!billRows || billRows.length === 0) throw new Error("Bill not found");
      const bill = billRows[0];

      const items = await db.select<{ productId: string, quantity: number }[]>('SELECT "productId", quantity FROM "BillLineItem" WHERE "billId" = $1', [id]);

      // Revert stock
      for (const item of items) {
        if (item.productId) {
          if (bill.type === 'return') {
            await db.execute('UPDATE "Product" SET stock = stock - $1, "updatedAt" = NOW() WHERE id = $2', [item.quantity, item.productId]);
          } else {
            await db.execute('UPDATE "Product" SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2', [item.quantity, item.productId]);
          }
        }
      }

      // Revert party balance
      if (bill.partyId) {
        if (bill.type === 'credit') {
          await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" - $1, "updatedAt" = NOW() WHERE id = $2', [bill.total, bill.partyId]);
        } else if (bill.type === 'return') {
          await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" + $1, "updatedAt" = NOW() WHERE id = $2', [bill.total, bill.partyId]);
        }
      }

      // Delete the bill (cascades to BillLineItem)
      await db.execute('DELETE FROM "Bill" WHERE id = $1', [id]);

      await useStore.getState().fetchBills();
      await useStore.getState().fetchProducts();
      await useStore.getState().fetchParties();
    } catch (err: any) {
      console.error("Delete Bill Error", err);
      useStore.getState().showDialog({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete bill.',
        type: 'alert'
      });
    }
  },
  findProductByBarcode: (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return undefined;
    const state = useStore.getState();
    return state.products.find(p => 
      (p.barcode && p.barcode === cleanBarcode) || p.id === cleanBarcode
    );
  },
}));
