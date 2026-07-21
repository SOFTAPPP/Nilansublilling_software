import React, { useState } from 'react';
import { useStore, Product } from '../store/useStore';
import { Search, Plus, Edit2, Trash2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StockManagement() {
  const { products, addProduct, addProductsBulk, updateProduct, deleteProduct, showDialog } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: '', price: 0, stock: 0, lowStockThreshold: 10, bindingVariant: '', hsn: '', barcode: ''
  });

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
      setFormData({ name: '', category: '', price: 0, stock: 0, lowStockThreshold: 10, bindingVariant: '', hsn: '', barcode: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      showDialog({ title: 'Validation Error', message: 'Name and Category are required', type: 'alert' });
      return;
    }
    if (editingId) {
      await updateProduct(editingId, formData);
    } else {
      await addProduct(formData);
    }
    setIsModalOpen(false);
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
          <label className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 flex items-center gap-2 cursor-pointer transition-colors border border-border shadow-sm">
            <Upload size={18} /> Import Stock
            <input 
              type="file" 
              accept=".json,.csv,.xlsx,.xls" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>
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
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-background border border-border px-4 py-2 rounded-md outline-none focus:ring-2 focus:ring-primary/50"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
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
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name *</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded bg-background" />
              </div>
              <div>
                <label className="block text-sm mb-1">Category *</label>
                <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Price (MRP)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full border p-2 rounded bg-background" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Current Stock</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full border p-2 rounded bg-background" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Min Stock</label>
                  <input type="number" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})} className="w-full border p-2 rounded bg-background" />
                </div>
                <div>
                  <label className="block text-sm mb-1">HSN Code</label>
                  <input value={formData.hsn || ''} onChange={e => setFormData({...formData, hsn: e.target.value})} className="w-full border p-2 rounded bg-background" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Barcode</label>
                  <input value={formData.barcode || ''} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full border p-2 rounded bg-background" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-1">Variant / Binding</label>
                  <input value={formData.bindingVariant || ''} onChange={e => setFormData({...formData, bindingVariant: e.target.value})} className="w-full border p-2 rounded bg-background" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md hover:bg-muted">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
