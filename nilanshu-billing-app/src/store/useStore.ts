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
  proprietorName: string;
  address: string;
  phone: string;
  email?: string;
  aadharNumber?: string;
  discountPercentage: number;
  outstandingBalance: number;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
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
  discountManuallySet?: boolean; // track if user manually edited the discount
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
  isAuthenticated: boolean;
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
  
  _syncQueue: { task: () => Promise<void>; resolve: () => void; reject: (err: any) => void }[];
  _isSyncing: boolean;
  enqueueSync: (task: () => Promise<void>) => Promise<void>;
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
  
  _syncQueue: [],
  _isSyncing: false,
  enqueueSync: (task) => {
    return new Promise((resolve, reject) => {
      set((state) => ({ _syncQueue: [...state._syncQueue, { task, resolve, reject }] }));
      const processQueue = async () => {
        if (useStore.getState()._isSyncing) return;
        useStore.setState({ _isSyncing: true });
        while (useStore.getState()._syncQueue.length > 0) {
          const { task: nextTask, resolve: res, reject: rej } = useStore.getState()._syncQueue[0];
          try {
            await nextTask();
            res();
          } catch (err) {
            console.error("Queue Task Failed", err);
            rej(err);
          }
          set((state) => ({ _syncQueue: state._syncQueue.slice(1) }));
        }
        useStore.setState({ _isSyncing: false });
      };
      processQueue();
    });
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
      const products = await db.select('SELECT id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, barcode FROM "Product"');
      set({ products: products as Product[] });
    } catch (error: any) {
      console.error('Failed to fetch products', error);
      useStore.getState().showDialog({ title: 'Fetch Error', message: 'Failed to load products: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  fetchParties: async () => {
    try {
      const db = await getDb();
      const parties = await db.select('SELECT id, name, "proprietorName", address, phone, email, "aadharNumber", "discountPercentage", "outstandingBalance", "bankName", "bankAccountNo", "bankIfsc" FROM "Party"');
      set({ parties: parties as Party[] });
    } catch (error: any) {
      console.error('Failed to fetch parties', error);
      useStore.getState().showDialog({ title: 'Fetch Error', message: 'Failed to load customers: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  fetchTransporters: async () => {
    try {
      const db = await getDb();
      const transporters = await db.select('SELECT id, name, phone, address FROM "Transporter"');
      set({ transporters: transporters as Transporter[] });
    } catch (error: any) {
      console.error('Failed to fetch transporters', error);
      useStore.getState().showDialog({ title: 'Fetch Error', message: 'Failed to load transporters: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  fetchBills: async () => {
    return useStore.getState().enqueueSync(async () => {
      try {
        const db = await getDb();
        const bills = await db.select('SELECT id, type, "billNumber", "partyId", "transporterId", subtotal, discount, cgst, sgst, total, status, CAST(date AS TEXT) as date FROM "Bill" ORDER BY date DESC');
        const normalizedBills = (bills as any[]).map(b => {
          let dateStr = String(b.date);
          if (dateStr.includes(' ') && !dateStr.includes('T')) {
            dateStr = dateStr.replace(' ', 'T') + 'Z';
          }
          return { ...b, date: dateStr };
        });
        set({ bills: normalizedBills as Bill[] });
      } catch (error: any) {
        console.error('Failed to fetch bills', error);
        useStore.getState().showDialog({ title: 'Fetch Error', message: 'Failed to load bills: ' + (error.message || String(error)), type: 'alert' });
      }
    });
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
    const id = product.id || `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProduct: Product = {
      id, name: product.name || '', category: product.category || '', price: product.price || 0,
      stock: product.stock || 0, lowStockThreshold: product.lowStockThreshold || 10,
      bindingVariant: product.bindingVariant || undefined, hsn: product.hsn || undefined, barcode: product.barcode || undefined
    };
    // Optimistic: update UI instantly
    set((state) => ({ products: [newProduct, ...state.products] }));
    // Background: persist to DB
    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO "Product" (id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, barcode, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
        [id, newProduct.name, newProduct.category, Number(newProduct.price) || 0, Number(newProduct.stock) || 0, Number(newProduct.lowStockThreshold) || 10, newProduct.bindingVariant || null, newProduct.hsn || null, newProduct.barcode || null]
      );
    } catch (err: any) {
      console.error('Add Product DB Error:', err);
      useStore.getState().showDialog({ title: 'Add Party Failed', message: err.message || 'Database error', type: 'alert' });
      useStore.getState().fetchProducts(); // Rollback
    }
  },
  addProductsBulk: async (productsList) => {
    const db = await getDb();
    // Use a transaction or sequential inserts
    for (const product of productsList) {
      const id = product.id || `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
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
      // Optimistic: update UI instantly
      set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...product } : p)
      }));
      // Background: persist to DB
      const db = await getDb();
      await db.execute(
        'UPDATE "Product" SET name=$1, category=$2, price=$3, stock=$4, "lowStockThreshold"=$5, "bindingVariant"=$6, hsn=$7, barcode=$8, "updatedAt"=NOW() WHERE id=$9',
        [product.name, product.category, Number(product.price) || 0, Number(product.stock) || 0, Number(product.lowStockThreshold) || 10, product.bindingVariant || null, product.hsn || null, product.barcode || null, id]
      );
    } catch (err: any) {
      console.error('Update Product Error:', err);
      useStore.getState().showDialog({ title: 'Update Error', message: err.message || 'Failed to update product', type: 'alert' });
      useStore.getState().fetchProducts(); // Rollback on error
    }
  },
  deleteProduct: async (id) => {
    try {
      // Optimistic: remove from UI instantly
      set((state) => ({ products: state.products.filter(p => p.id !== id) }));
      const db = await getDb();
      await db.execute('DELETE FROM "Product" WHERE id=$1', [id]);
    } catch (err) {
      useStore.getState().showDialog({ title: 'Delete Failed', message: 'Cannot delete this product because it is already used in existing bills or records.', type: 'alert' });
      useStore.getState().fetchProducts(); // Rollback on error
    }
  },
  addParty: async (party) => {
    const id = party.id || crypto.randomUUID();
    const newParty: Party = {
      id, name: party.name || '', proprietorName: party.proprietorName || '', address: party.address || '', phone: party.phone || '',
      email: party.email || undefined, aadharNumber: party.aadharNumber || undefined,
      discountPercentage: party.discountPercentage || 0, outstandingBalance: party.outstandingBalance || 0,
      bankName: party.bankName || '', bankAccountNo: party.bankAccountNo || '', bankIfsc: party.bankIfsc || ''
    };
    set((state) => ({ parties: [newParty, ...state.parties] }));
    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO "Party" (id, name, "proprietorName", address, phone, email, "aadharNumber", "discountPercentage", "outstandingBalance", "bankName", "bankAccountNo", "bankIfsc", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())',
        [id, newParty.name, newParty.proprietorName, newParty.address, newParty.phone, newParty.email || null, newParty.aadharNumber || null, Number(newParty.discountPercentage) || 0, Number(newParty.outstandingBalance) || 0, newParty.bankName, newParty.bankAccountNo, newParty.bankIfsc]
      );
    } catch (err: any) {
      console.error('Add Party DB Error:', err);
      useStore.getState().showDialog({ title: 'Add Party Failed', message: err.message || 'Database error', type: 'alert' });
      useStore.getState().fetchParties(); // Rollback
    }
  },
  updateParty: async (id, party) => {
    set((state) => ({ parties: state.parties.map(p => p.id === id ? { ...p, ...party } : p) }));
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE "Party" SET name=$1, "proprietorName"=$2, address=$3, phone=$4, email=$5, "aadharNumber"=$6, "discountPercentage"=$7, "outstandingBalance"=$8, "bankName"=$9, "bankAccountNo"=$10, "bankIfsc"=$11, "updatedAt"=NOW() WHERE id=$12',
        [party.name, party.proprietorName || '', party.address, party.phone, party.email || null, party.aadharNumber || null, Number(party.discountPercentage) || 0, Number(party.outstandingBalance) || 0, party.bankName || '', party.bankAccountNo || '', party.bankIfsc || '', id]
      );
    } catch (err: any) {
      console.error('Update Party Error:', err);
      useStore.getState().showDialog({ title: 'Update Party Failed', message: err.message || 'Database error', type: 'alert' });
      useStore.getState().fetchParties(); // Rollback
    }
  },
  deleteParty: async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM "Party" WHERE id=$1', [id]);
      set((state) => ({ parties: state.parties.filter(p => p.id !== id) }));
    } catch (err) {
      useStore.getState().showDialog({ title: 'Delete Failed', message: 'Cannot delete this customer because they have existing bills or records.', type: 'alert' });
    }
  },
  addTransporter: async (transporter) => {
    const id = transporter.id || crypto.randomUUID();
    const newT: Transporter = { id, name: transporter.name || '', phone: transporter.phone || '', address: transporter.address || '' };
    set((state) => ({ transporters: [newT, ...state.transporters] }));
    const db = await getDb();
    await db.execute(
      'INSERT INTO "Transporter" (id, name, address, phone, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id, newT.name, newT.address, newT.phone]
    );
  },
  updateTransporter: async (id, transporter) => {
    set((state) => ({ transporters: state.transporters.map(t => t.id === id ? { ...t, ...transporter } : t) }));
    const db = await getDb();
    await db.execute(
      'UPDATE "Transporter" SET name=$1, address=$2, phone=$3, "updatedAt"=NOW() WHERE id=$4',
      [transporter.name, transporter.address, transporter.phone, id]
    );
  },
  deleteTransporter: async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM "Transporter" WHERE id=$1', [id]);
      set((state) => ({ transporters: state.transporters.filter(t => t.id !== id) }));
    } catch (err) {
      useStore.getState().showDialog({ title: 'Delete Failed', message: 'Cannot delete this transporter because they have existing bills or records.', type: 'alert' });
    }
  },
  createBill: async (billData) => {
    const id = crypto.randomUUID();

    if (!billData.lineItems || billData.lineItems.length === 0) {
      throw new Error('Bill must have at least one line item.');
    }

    const newProductsToCreate: any[] = [];
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
          const newProdId = `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
          newProductsToCreate.push({
            id: newProdId,
            name: billData.lineItems[i].productName.trim(),
            mrp: billData.lineItems[i].mrp || 0,
            hsn: billData.lineItems[i].hsn || null
          });
          billData.lineItems[i].productId = newProdId;
        }
      }
    }

    // Pre-flight: check stock availability for non-return bills
    const type = billData.type || 'cash';
    if (type !== 'return') {
      for (const item of billData.lineItems) {
        if (!item.productId) continue;
        if (newProductsToCreate.some(np => np.id === item.productId)) continue;

        const existingProd = useStore.getState().products.find(p => p.id === item.productId);
        if (!existingProd) continue;

        const currentStock = existingProd.stock;
        const needed = Number(item.quantity) || 0;
        if (currentStock < needed && existingProd.category !== 'Miscellaneous') {
          throw new Error(`Insufficient stock for "${existingProd.name}". Available: ${currentStock}, Needed: ${needed}`);
        }
      }
    }

    // Optimistic: update local state for stock changes instead of re-fetching
    set((state) => {
      // Add the new miscellaneous products to local state immediately
      const appendedProducts = [...state.products];
      for (const np of newProductsToCreate) {
        appendedProducts.push({
          id: np.id, name: np.name, category: 'Miscellaneous', price: np.mrp, stock: 0, lowStockThreshold: 10, bindingVariant: null, hsn: np.hsn, barcode: null
        } as any);
      }

      const updatedProducts = appendedProducts.map(p => {
        const lineItem = (billData.lineItems || []).find((li: any) => li.productId === p.id);
        if (lineItem) {
          const qty = Number(lineItem.quantity) || 0;
          return { ...p, stock: type === 'return' ? p.stock + qty : p.stock - qty };
        }
        return p;
      });
      const newBill: Bill = {
        id, type, billNumber: billData.billNumber || `BILL-${Date.now()}`,
        partyId: billData.partyId || undefined, transporterId: billData.transporterId || undefined,
        subtotal: billData.subtotal, discount: billData.discount,
        cgst: billData.cgst || 0, sgst: billData.sgst || 0, total: billData.total,
        status: billData.status || 'completed', date: billData.date || new Date().toISOString()
      };
      const updatedParties = billData.partyId ? state.parties.map(p => {
        if (p.id === billData.partyId) {
          const deducted = billData.deductedAmount || 0;
          const effectiveTotal = billData.total || 0;
          let balanceChange = 0;
          if (type === 'credit') balanceChange = effectiveTotal - deducted;
          else if (type === 'return' || type === 'receipt') balanceChange = -effectiveTotal;
          
          return { ...p, outstandingBalance: p.outstandingBalance + balanceChange };
        }
        return p;
      }) : state.parties;
      return { products: updatedProducts, bills: [newBill, ...state.bills], parties: updatedParties };
    });

    // Background DB sync
    useStore.getState().enqueueSync(async () => {
      try {
        const db = await getDb();

        // Insert new miscellaneous products
        for (const np of newProductsToCreate) {
          await db.execute(
            'INSERT INTO "Product" (id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
            [np.id, np.name, 'Miscellaneous', np.mrp, 0, 10, null, np.hsn]
          );
        }

        await db.execute(
          `INSERT INTO "Bill" (
            id, type, "billNumber", "partyId", "transporterId", subtotal, discount, cgst, sgst, total, status, date, 
            "vehicleNo", destination, "driverName", "lrNo", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CAST($12 AS TIMESTAMP), $13, $14, $15, $16, NOW(), NOW())`,
          [
            id, type, billData.billNumber || `BILL-${Date.now()}`, billData.partyId || null, billData.transporterId || null,
            Number(billData.subtotal) || 0, Number(billData.discount) || 0, Number(billData.cgst) || 0, Number(billData.sgst) || 0, Number(billData.total) || 0,
            billData.status || 'completed', billData.date ? new Date(billData.date).toISOString() : new Date().toISOString(),
            billData.vehicleNo || null, billData.destination || null, billData.driverName || null, billData.lrNo || null
          ]
        );

        for (const item of (billData.lineItems || [])) {
          const itemId = crypto.randomUUID();
          await db.execute(
            'INSERT INTO "BillLineItem" (id, "billId", "productId", quantity, mrp, "discountPercent", amount, rate, hsn) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [itemId, id, item.productId, Number(item.quantity) || 0, Number(item.mrp) || 0, Number(item.discountPercent) || 0, Number(item.amount) || 0, Number(item.rate) || 0, item.hsn || '']
          );

          if (item.productId) {
            if (type === 'return') {
              await db.execute('UPDATE "Product" SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2', [Number(item.quantity) || 0, item.productId]);
            } else {
              await db.execute('UPDATE "Product" SET stock = stock - $1, "updatedAt" = NOW() WHERE id = $2', [Number(item.quantity) || 0, item.productId]);
            }
          }
        }

        if (billData.partyId) {
          if (type === 'credit') {
            const deducted = billData.deductedAmount || 0;
            const change = (Number(billData.total) || 0) - deducted;
            await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" + $1, "updatedAt" = NOW() WHERE id = $2', [change, billData.partyId]);
          } else if (type === 'return' || type === 'receipt') {
            await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" - $1, "updatedAt" = NOW() WHERE id = $2', [Number(billData.total) || 0, billData.partyId]);
          }
        }
      } catch (err: any) {
        console.error('Create Bill Background Error:', err);
        useStore.getState().showDialog({ title: 'Bill Save Error', message: err.message || 'Background sync failed', type: 'alert' });
        // Rollback
        await useStore.getState().fetchProducts();
        await useStore.getState().fetchParties();
        await useStore.getState().fetchBills();
      }
    });
  },
  deleteBill: async (id) => {
    try {
      // Find bill in local state to immediately remove it from UI
      const bill = useStore.getState().bills.find(b => b.id === id);
      if (!bill) throw new Error("Bill not found in local state");

      // OPTIMISTIC UPDATE 1: Instantly remove the bill from the UI list and revert party balance
      set((state) => {
        const updatedParties = bill.partyId ? state.parties.map(p => {
          if (p.id === bill.partyId) {
            const revert = bill.type === 'credit' ? -bill.total : bill.type === 'return' ? bill.total : 0;
            return { ...p, outstandingBalance: p.outstandingBalance + revert };
          }
          return p;
        }) : state.parties;
        return { bills: state.bills.filter(b => b.id !== id), parties: updatedParties };
      });

      // Background process: fetch items, revert stock in UI, then sync with DB
      useStore.getState().enqueueSync(async () => {
        try {
          const db = await getDb();
          const items = await db.select<{ productId: string, quantity: number }[]>('SELECT "productId", quantity FROM "BillLineItem" WHERE "billId" = $1', [id]);
          
          // OPTIMISTIC UPDATE 2: Instantly revert stock in the UI once items are fetched
          set((state) => {
            const updatedProducts = state.products.map(p => {
              const item = items.find(i => i.productId === p.id);
              if (item) {
                return { ...p, stock: bill.type === 'return' ? p.stock - item.quantity : p.stock + item.quantity };
              }
              return p;
            });
            return { products: updatedProducts };
          });

          // Sync with DB
          for (const item of items) {
            if (item.productId) {
              if (bill.type === 'return') {
                await db.execute('UPDATE "Product" SET stock = stock - $1, "updatedAt" = NOW() WHERE id = $2', [Number(item.quantity) || 0, item.productId]);
              } else {
                await db.execute('UPDATE "Product" SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2', [Number(item.quantity) || 0, item.productId]);
              }
            }
          }

          if (bill.partyId) {
            if (bill.type === 'credit') {
              await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" - $1, "updatedAt" = NOW() WHERE id = $2', [Number(bill.total) || 0, bill.partyId]);
            } else if (bill.type === 'return') {
              await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" + $1, "updatedAt" = NOW() WHERE id = $2', [Number(bill.total) || 0, bill.partyId]);
            }
          }

          // EXPLICITLY delete line items first to prevent any missing ON DELETE CASCADE constraint errors
          await db.execute('DELETE FROM "BillLineItem" WHERE "billId" = $1', [id]);
          await db.execute('DELETE FROM "Bill" WHERE id = $1', [id]);

        } catch (bgErr: any) {
          console.error("Delete Bill Background Error", bgErr);
          useStore.getState().showDialog({
            title: 'Delete Sync Failed', message: bgErr.message || 'Failed to sync deletion with server. Reverting.',
            type: 'alert'
          });
          await useStore.getState().fetchBills();
          await useStore.getState().fetchProducts();
          await useStore.getState().fetchParties();
        }
      });
    } catch (err: any) {
      console.error("Delete Bill Error", err);
      useStore.getState().showDialog({
        title: 'Delete Failed', message: err.message || 'Failed to delete bill.',
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
