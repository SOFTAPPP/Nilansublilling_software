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

export interface Bill {
  id: string;
  type: string;
  billNumber: string;
  partyId?: string;
  subtotal: number;
  discount: number;
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
  fetchBills: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addParty: (party: Partial<Party>) => Promise<void>;
  updateParty: (id: string, party: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  createBill: (billData: any) => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  products: [],
  parties: [],
  bills: [],
  settings: {
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyGstin: '',
    companyState: '',
    companyContact: '',
    companyEmail: '',
    companyPan: '',
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
      const db = await getDb();
      const current = useStore.getState().settings;
      const updated = { ...current, ...newSettings };
      
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
      set({ settings: updated });
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
        await db.execute('INSERT INTO "Settings" (id) VALUES (1)');
        res = await db.select('SELECT * FROM "Settings" WHERE id = 1');
      }
      if (Array.isArray(res) && res.length > 0) {
        set({ settings: res[0] as Settings });
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  },
  addProduct: async (product) => {
    const db = await getDb();
    const id = product.id || crypto.randomUUID();
    await db.execute(
      'INSERT INTO "Product" (id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
      [id, product.name, product.category, product.price || 0, product.stock || 0, product.lowStockThreshold || 10, product.bindingVariant || null, product.hsn || null]
    );
    await useStore.getState().fetchProducts();
  },
  updateProduct: async (id, product) => {
    const db = await getDb();
    await db.execute(
      'UPDATE "Product" SET name=$1, category=$2, price=$3, stock=$4, "lowStockThreshold"=$5, "bindingVariant"=$6, hsn=$7, "updatedAt"=NOW() WHERE id=$8',
      [product.name, product.category, product.price, product.stock, product.lowStockThreshold, product.bindingVariant || null, product.hsn || null, id]
    );
    await useStore.getState().fetchProducts();
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
  createBill: async (billData) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Bill" (
        id, type, "billNumber", "partyId", subtotal, discount, total, status, date, 
        "vehicleNo", destination, "driverName", "lrNo", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, NOW(), NOW())`,
      [
        id, 
        billData.type || 'cash', 
        billData.billNumber || `BILL-${Date.now()}`, 
        billData.partyId || null, 
        billData.subtotal, 
        billData.discount, 
        billData.total, 
        billData.status || 'completed',
        billData.vehicleNo || null,
        billData.destination || null,
        billData.driverName || null,
        billData.lrNo || null
      ]
    );
    for (const item of (billData.lineItems || [])) {
        const itemId = crypto.randomUUID();
        await db.execute(
            'INSERT INTO "BillLineItem" (id, "billId", "productId", quantity, mrp, "discountPercent", amount, rate, hsn) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [itemId, id, item.productId, item.quantity, item.mrp, item.discountPercent, item.amount, item.rate || null, item.hsn || null]
        );
        // adjust stock
        if (billData.type === 'return') {
          await db.execute('UPDATE "Product" SET stock = stock + $1 WHERE id = $2', [item.quantity, item.productId]);
        } else {
          await db.execute('UPDATE "Product" SET stock = stock - $1 WHERE id = $2', [item.quantity, item.productId]);
        }
    }
    // adjust party outstanding balance
    if (billData.partyId) {
      if (billData.type === 'credit') {
        await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" + $1, "updatedAt" = NOW() WHERE id = $2', [billData.total, billData.partyId]);
      } else if (billData.type === 'return') {
        await db.execute('UPDATE "Party" SET "outstandingBalance" = "outstandingBalance" - $1, "updatedAt" = NOW() WHERE id = $2', [billData.total, billData.partyId]);
      }
    }
    await useStore.getState().fetchProducts();
    await useStore.getState().fetchParties();
    await useStore.getState().fetchBills();
  },
}));
