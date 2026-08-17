import { create } from 'zustand';
import { apiClient } from '../utils/api';

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
  isbn?: string;
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
  paymentAmount?: number;
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
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  hideAllButtons?: boolean;
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
  fetchInitialData: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addParty: (party: Partial<Party>) => Promise<void>;
  updateParty: (id: string, party: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  addTransporter: (transporter: Partial<Transporter>) => Promise<void>;
  updateTransporter: (id: string, transporter: Partial<Transporter>) => Promise<void>;
  deleteTransporter: (id: string) => Promise<void>;
  createBill: (billData: any) => Promise<string>;
  updateBill: (id: string, type: string, billData: any) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  addProductsBulk: (products: Partial<Product>[]) => Promise<void>;
  findProductByBarcode: (barcode: string) => Product | undefined;
}

export const useStore = create<AppState>((set, get) => ({
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
      const current = get().settings;
      const updated = { ...current, ...newSettings };
      set({ settings: updated });
      await apiClient.put('/settings/1', updated);
    } catch (error) {
      console.error('Failed to update settings in database', error);
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
      const products = await apiClient.get('/products');
      set({ products: products as Product[] });
    } catch (error: any) {
      console.error('Failed to fetch products', error);
      get().showDialog({ title: 'Fetch Error', message: 'Failed to load products: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  
  fetchParties: async () => {
    try {
      const parties = await apiClient.get('/parties');
      set({ parties: parties as Party[] });
    } catch (error: any) {
      console.error('Failed to fetch parties', error);
      get().showDialog({ title: 'Fetch Error', message: 'Failed to load customers: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  
  fetchTransporters: async () => {
    try {
      const transporters = await apiClient.get('/transporters');
      set({ transporters: transporters as Transporter[] });
    } catch (error: any) {
      console.error('Failed to fetch transporters', error);
      get().showDialog({ title: 'Fetch Error', message: 'Failed to load transporters: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  
  fetchBills: async () => {
    try {
      const bills = await apiClient.get('/bills');
      set({ bills: bills as Bill[] });
    } catch (error: any) {
      console.error('Failed to fetch bills', error);
      get().showDialog({ title: 'Fetch Error', message: 'Failed to load bills: ' + (error.message || String(error)), type: 'alert' });
    }
  },
  
  fetchSettings: async () => {
    try {
      let res = await apiClient.get('/settings');
      if (!Array.isArray(res) || res.length === 0) {
        res = [await apiClient.post('/settings', { companyName: 'NILANSU PUBLICATION' })];
      }
      if (Array.isArray(res) && res.length > 0) {
        set({ settings: res[0] as Settings });
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  },
  
  fetchInitialData: async () => {
    try {
      const data = await apiClient.get('/sync/initial');
      set({
        settings: data.settings,
        products: data.products,
        parties: data.parties,
        transporters: data.transporters,
        bills: data.bills
      });
    } catch (error: any) {
      console.error('Failed to fetch initial sync data', error);
      get().showDialog({ 
        title: 'Network Error', 
        message: 'Could not connect to the server to fetch initial data. ' + (error.message || String(error)), 
        type: 'alert' 
      });
    }
  },
  
  addProduct: async (product) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticProduct = { ...product, id: tempId, createdAt: new Date().toISOString() } as unknown as Product;
    
    set(state => ({ products: [...state.products, optimisticProduct] })); // ⚡ INSTANT UPDATE
    try {
      const newProduct = await apiClient.post('/products', product);
      set(state => ({ products: state.products.map(p => p.id === tempId ? newProduct : p) }));
    } catch (err: any) {
      set(state => ({ products: state.products.filter(p => p.id !== tempId) })); // Revert
      console.error('Add Product DB Error:', err);
      get().showDialog({ title: 'Add Product Failed', message: err.message || 'Database error', type: 'alert' });
    }
  },
  
  addProductsBulk: async (productsList) => {
    // Basic bulk insert fallback
    for (const product of productsList) {
      try {
        const newProduct = await apiClient.post('/products', product);
        set(state => ({ products: [...state.products, newProduct] }));
      } catch (err) {
        console.error('Failed to insert product bulk', product?.name, err);
      }
    }
  },
  updateProduct: async (id, product) => {
    try {
      const updated = await apiClient.put(`/products/${id}`, product);
      set(state => ({ products: state.products.map(p => p.id === id ? updated : p) }));
    } catch (err: any) {
      console.error('Update Product Error:', err);
      get().showDialog({ title: 'Update Error', message: err.message || 'Failed to update product', type: 'alert' });
    }
  },
  
  deleteProduct: async (id) => {
    const prev = get().products;
    set(state => ({ products: state.products.filter(p => p.id !== id) })); // Optimistic delete
    try {
      await apiClient.delete(`/products/${id}`);
    } catch (err) {
      set({ products: prev }); // Revert
      get().showDialog({ title: 'Delete Failed', message: 'Cannot delete this product because it is already used in existing bills or records.', type: 'alert' });
    }
  },
  
  addParty: async (party) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticParty = { ...party, id: tempId } as unknown as Party;
    
    set(state => ({ parties: [...state.parties, optimisticParty] })); // ⚡ INSTANT UPDATE
    try {
      const newParty = await apiClient.post('/parties', party);
      set(state => ({ parties: state.parties.map(p => p.id === tempId ? newParty : p) }));
    } catch (err: any) {
      set(state => ({ parties: state.parties.filter(p => p.id !== tempId) })); // Revert
      console.error('Add Party DB Error:', err);
      get().showDialog({ title: 'Add Party Failed', message: err.message || 'Database error', type: 'alert' });
    }
  },
  
  updateParty: async (id, party) => {
    try {
      const updated = await apiClient.put(`/parties/${id}`, party);
      set(state => ({ parties: state.parties.map(p => p.id === id ? updated : p) }));
    } catch (err: any) {
      console.error('Update Party Error:', err);
      get().showDialog({ title: 'Update Party Failed', message: err.message || 'Database error', type: 'alert' });
    }
  },
  
  deleteParty: async (id) => {
    const prev = get().parties;
    set(state => ({ parties: state.parties.filter(p => p.id !== id) })); // Optimistic delete
    try {
      await apiClient.delete(`/parties/${id}`);
    } catch (err) {
      set({ parties: prev }); // Revert
      get().showDialog({ title: 'Delete Failed', message: 'Cannot delete this customer because they have existing bills or records.', type: 'alert' });
    }
  },
  
  addTransporter: async (transporter) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTransporter = { ...transporter, id: tempId } as unknown as Transporter;
    
    set(state => ({ transporters: [...state.transporters, optimisticTransporter] })); // ⚡ INSTANT UPDATE
    try {
      const newTransporter = await apiClient.post('/transporters', transporter);
      set(state => ({ transporters: state.transporters.map(t => t.id === tempId ? newTransporter : t) }));
    } catch (err: any) {
      set(state => ({ transporters: state.transporters.filter(t => t.id !== tempId) })); // Revert
      get().showDialog({ title: 'Add Transporter Failed', message: err.message || 'Database error', type: 'alert' });
    }
  },
  
  updateTransporter: async (id, transporter) => {
    try {
      const updated = await apiClient.put(`/transporters/${id}`, transporter);
      set(state => ({ transporters: state.transporters.map(t => t.id === id ? updated : t) }));
    } catch (err: any) {
      get().showDialog({ title: 'Update Transporter Failed', message: err.message || 'Database error', type: 'alert' });
    }
  },
  
  deleteTransporter: async (id) => {
    const prev = get().transporters;
    set(state => ({ transporters: state.transporters.filter(t => t.id !== id) })); // Optimistic delete
    try {
      await apiClient.delete(`/transporters/${id}`);
    } catch (err) {
      set({ transporters: prev }); // Revert
      get().showDialog({ title: 'Delete Failed', message: 'Cannot delete this transporter.', type: 'alert' });
    }
  },
  
  createBill: async (billData) => {
    if (!billData.lineItems || billData.lineItems.length === 0) {
      throw new Error('Bill must have at least one line item.');
    }

    // Auto-create products for manually typed line items
    for (let i = 0; i < billData.lineItems.length; i++) {
      if (!billData.lineItems[i].productId) {
        if (!billData.lineItems[i].productName?.trim()) {
          throw new Error(`Item ${i + 1} is empty. Please enter a product name.`);
        }

        const existingProd = get().products.find(p => p.name.toLowerCase() === billData.lineItems[i].productName.trim().toLowerCase());

        if (existingProd) {
          billData.lineItems[i].productId = existingProd.id;
        } else {
          // Create product via API first
          const newProd = await apiClient.post('/products', {
            name: billData.lineItems[i].productName.trim(),
            category: 'Miscellaneous',
            price: billData.lineItems[i].mrp || 0,
            stock: 0,
            lowStockThreshold: 10,
            hsn: billData.lineItems[i].hsn || null
          });
          billData.lineItems[i].productId = newProd.id;
        }
      }
    }

    try {
      const res = await apiClient.post('/bills', billData);
      
      // Background refetch for updated stock, party balances, and bills
      get().fetchInitialData();
      
      return res.id;
    } catch (err: any) {
      console.error('Create Bill Error:', err);
      get().showDialog({ title: 'Bill Save Error', message: err.message || 'Failed to save bill', type: 'alert' });
      throw err;
    }
  },
  
  updateBill: async (id, type, billData) => {
    try {
      await apiClient.put(`/bills/${id}`, { ...billData, type });
      // Background refetch
      get().fetchInitialData();
    } catch (err: any) {
      console.error('Update Bill Error:', err);
      get().showDialog({ title: 'Update Error', message: err.message, type: 'alert' });
    }
  },
  
  deleteBill: async (id) => {
    const prev = get().bills;
    set(state => ({ bills: state.bills.filter(b => b.id !== id) })); // Optimistic delete
    try {
      await apiClient.delete(`/bills/${id}`);
      // Background refetch for stock
      get().fetchInitialData();
    } catch (err: any) {
      set({ bills: prev }); // Revert
      console.error("Delete Bill Error", err);
      get().showDialog({ title: 'Delete Failed', message: err.message || 'Failed to delete bill.', type: 'alert' });
    }
  },
  
  findProductByBarcode: (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return undefined;
    return get().products.find(p => 
      (p.barcode && p.barcode === cleanBarcode) || p.id === cleanBarcode
    );
  },
}));
