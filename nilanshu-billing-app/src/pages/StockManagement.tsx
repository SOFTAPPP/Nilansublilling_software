import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, Product } from '../store/useStore';
import { Search, Plus, Edit2, Trash2, Upload, ScanBarcode, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StockManagement() {
  const { products, addProduct, addProductsBulk, updateProduct, deleteProduct, showDialog } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Custom Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: '', price: 0, stock: 0, lowStockThreshold: 10, bindingVariant: '', hsn: '', barcode: ''
  });
  const [barcodeScanActive, setBarcodeScanActive] = useState(false);

  // Barcode scanner detection for the modal
  const lastKeyTime = useRef<number>(0);
  const barcodeBuffer = useRef<string>('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const handleModalBarcodeScan = useCallback((scannedBarcode: string) => {
    setFormData(prev => ({ ...prev, barcode: scannedBarcode.trim() }));
    setBarcodeScanActive(true);
    setTimeout(() => setBarcodeScanActive(false), 1500);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a text input (except the barcode field)
      const target = e.target as HTMLElement;
      const isBarcodeFocused = barcodeInputRef.current === target;
      const isTextInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text';
      
      // If focused on a text input that's NOT the barcode field, let normal typing happen
      if (isTextInput && !isBarcodeFocused) return;

      const currentTime = Date.now();
      
      // If time between keys is > 50ms, probably human typing, reset buffer
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        e.preventDefault();
        handleModalBarcodeScan(barcodeBuffer.current);
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, handleModalBarcodeScan]);

  // Get unique categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.bindingVariant && p.bindingVariant.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData(product);
    } else {
      setEditingId(null);
      setFormData({ id: '', name: '', category: '', price: 0, stock: 0, lowStockThreshold: 10, bindingVariant: '', hsn: '', barcode: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      showDialog({ title: 'Validation Error', message: 'Name and Category are required', type: 'alert' });
      return;
    }
    
    setIsModalOpen(false);

    if (editingId) {
      await updateProduct(editingId, formData);
    } else {
      await addProduct(formData);
    }
  };

  const handleDelete = (id: string) => {
    showDialog({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'confirm',
      onConfirm: async () => {
        await deleteProduct(id);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isJson = file.name.toLowerCase().endsWith('.json');
      let newProducts: Partial<Product>[] = [];

      if (isJson) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          newProducts = data;
        } else {
          throw new Error('JSON file must contain an array of products');
        }
      } else {
        // Excel or CSV
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Map Excel columns to Product fields
        newProducts = data.map((row: any) => ({
          name: row.name || row.Name || row['Product Name'] || '',
          category: row.category || row.Category || 'ALL',
          price: Number(row.price || row.Price || row.MRP || 0),
          stock: Number(row.stock || row.Stock || row.Qty || 0),
          lowStockThreshold: Number(row.lowStockThreshold || row['Min Stock'] || 10),
          bindingVariant: row.bindingVariant || row.Variant || row.Binding || '',
          hsn: row.hsn || row.HSN || '',
          barcode: row.barcode || row.Barcode || ''
        })).filter(p => p.name); // only keep rows that at least have a name
      }

      if (newProducts.length > 0) {
        await addProductsBulk(newProducts);
        showDialog({ title: 'Success', message: `Imported ${newProducts.length} products successfully.`, type: 'alert' });
      } else {
        showDialog({ title: 'Import Failed', message: 'No valid products found in the file.', type: 'alert' });
      }
    } catch (err: any) {
      console.error(err);
      showDialog({ title: 'Import Error', message: err.message || 'Failed to read file.', type: 'alert' });
    }
    // reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
        <div className="flex gap-2">
          <button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2">
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search products by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="relative min-w-[180px]" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="w-full flex items-center justify-between bg-background border border-border px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 hover:border-primary/50 transition-all cursor-pointer shadow-sm font-medium text-foreground"
          >
            <span className="truncate">{selectedCategory}</span>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCategoryDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
              {categories.map((c: string) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(c);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedCategory === c 
                      ? 'bg-primary text-primary-foreground font-medium' 
                      : 'text-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Product ID</th>
              <th className="p-4 font-medium">Product Name</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Barcode</th>
              <th className="p-4 font-medium">Variant/Binding</th>
              <th className="p-4 font-medium text-right">MRP (₹)</th>
              <th className="p-4 font-medium text-right">Stock</th>
              <th className="p-4 font-medium text-right">Min Stock</th>
              <th className="p-4 font-medium text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                <td className="p-4 text-muted-foreground font-medium">{product.id}</td>
                <td className="p-4 font-medium">{product.name}</td>
                <td className="p-4">
                  <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">
                    {product.category}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground">{product.barcode || '-'}</td>
                <td className="p-4 text-muted-foreground">{product.bindingVariant || '-'}</td>
                <td className="p-4 text-right">{product.price.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    product.stock <= product.lowStockThreshold 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {product.stock}
                  </span>
                </td>
                <td className="p-4 text-right text-muted-foreground">{product.lowStockThreshold}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(product)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 tracking-tight text-foreground">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Product ID <span className="font-normal opacity-70 capitalize tracking-normal">(Leave blank to auto-generate)</span></label>
                <input 
                  value={formData.id || ''} 
                  onChange={e => setFormData({...formData, id: e.target.value})} 
                  className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" 
                  disabled={!!editingId}
                  placeholder="e.g. PROD-123"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="Product Name" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Category <span className="text-red-500">*</span></label>
                  <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="Category Name" />
                </div>
                
                <div>
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Price (MRP)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Current Stock</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="0" />
                </div>
                
                <div>
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Min Stock</label>
                  <input type="number" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="10" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">HSN Code</label>
                  <input value={formData.hsn || ''} onChange={e => setFormData({...formData, hsn: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="e.g. 1234" />
                </div>
                
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    <ScanBarcode size={14} className={barcodeScanActive ? 'text-emerald-500' : 'text-muted-foreground'} />
                    Barcode
                    <span className="text-[10px] font-normal opacity-70 tracking-normal capitalize">(scan/type)</span>
                  </label>
                  <div className="relative">
                    <input 
                      ref={barcodeInputRef}
                      value={formData.barcode || ''} 
                      onChange={e => setFormData({...formData, barcode: e.target.value})} 
                      className={`w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 transition-all font-semibold text-sm text-foreground ${
                        barcodeScanActive ? 'border-emerald-500 ring-2 ring-emerald-200' : 'focus:ring-primary/30'
                      }`}
                      placeholder="Scan barcode..."
                    />
                    {barcodeScanActive && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-[10px] font-extrabold animate-pulse uppercase tracking-wider">
                        Scanned!
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Variant / Binding</label>
                  <input value={formData.bindingVariant || ''} onChange={e => setFormData({...formData, bindingVariant: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="e.g. Hardcover" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-border/50 rounded-xl hover:bg-muted font-bold transition-colors text-sm text-foreground shadow-sm">Cancel</button>
              <button onClick={handleSave} className="px-7 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold shadow-md transition-colors text-sm">Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
