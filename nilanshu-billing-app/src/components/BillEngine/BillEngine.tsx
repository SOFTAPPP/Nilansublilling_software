import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore, BillLineItem, Product } from '../../store/useStore';

interface BillEngineProps {
  items: BillLineItem[];
  onChange: (items: BillLineItem[]) => void;
  columns?: ('sno' | 'name' | 'hsn' | 'qty' | 'rate' | 'per' | 'mrp' | 'discount' | 'amount')[];
  readOnly?: boolean;
  globalDiscount?: number;
  maxItems?: number;
}

export const BillEngine: React.FC<BillEngineProps> = ({ 
  items, 
  onChange,
  columns = ['sno', 'name', 'qty', 'mrp', 'discount', 'amount'],
  readOnly = false,
  globalDiscount = 0,
  maxItems = 15
}) => {
  const { products, showDialog } = useStore();
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Barcode scanner detection
  const lastKeyTime = useRef<number>(0);
  const barcodeBuffer = useRef<string>('');

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (readOnly) return;
      const currentTime = new Date().getTime();
      
      // If time between keys is > 50ms, probably human typing, reset buffer
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        // Barcode scanned
        handleBarcodeScan(barcodeBuffer.current);
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, products, items]);

  const handleBarcodeScan = (barcode: string) => {
    const cleanBarcode = barcode.trim();
    const product = products.find(p => 
      p.id === cleanBarcode || 
      (p.hsn && p.hsn.trim() === cleanBarcode) ||
      p.name.toLowerCase().includes(cleanBarcode.toLowerCase())
    );
    if (product) {
      addLineItem(product);
    }
  };

  const addLineItem = (product?: Product) => {
    if (items.length >= maxItems) {
      showDialog({ title: 'Limit Reached', message: 'Maximum items reached for a single A4 bill! Please generate another bill for additional items.', type: 'alert' });
      return;
    }

    const newItem: BillLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product?.id || '',
      productName: product?.name || '',
      quantity: 1,
      mrp: product?.price || 0,
      discountPercent: globalDiscount || 0,
      amount: product ? (product.price - (product.price * (globalDiscount || 0) / 100)) : 0,
      hsn: product?.hsn || '',
      rate: product?.price || 0
    };
    onChange([...items, newItem]);
    setActiveRow(items.length);
  };

  const removeLineItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const updateLineItem = (index: number, field: keyof BillLineItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        item.productName = prod.name;
        item.mrp = prod.price;
        item.hsn = prod.hsn || '';
        item.rate = prod.price;
      }
    }

    // Recalculate amount
    const basePrice = columns.includes('rate') ? (item.rate || 0) : item.mrp;
    // Fallback to global discount if item discount is 0 and global exists
    const effectiveDiscount = item.discountPercent > 0 ? item.discountPercent : globalDiscount;
    const discountAmount = (basePrice * effectiveDiscount) / 100;
    item.amount = (basePrice - discountAmount) * item.quantity;

    newItems[index] = item;
    onChange(newItems);
  };

  // Render product search suggestions
  const renderProductSuggestions = (index: number, currentName: string) => {
    if (activeRow !== index) return null;
    const suggestions = products
      .filter(p => !currentName || p.name.toLowerCase().includes(currentName.toLowerCase()))
      .slice(0, 5);
    
    if (suggestions.length === 0) return null;

    return (
      <div className="absolute z-10 w-full bg-card border border-border mt-1 rounded-md shadow-lg">
        {suggestions.map(p => (
          <div 
            key={p.id} 
            className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
            onClick={() => {
              updateLineItem(index, 'productId', p.id);
              setActiveRow(null);
            }}
          >
            {p.name} - ₹{p.price}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <table className="w-full text-sm text-left border-collapse border border-border">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {columns.includes('sno') && <th className="p-2 border border-border w-12 text-center">SI No.</th>}
            {columns.includes('name') && <th className="p-2 border border-border">Description of Goods</th>}
            {columns.includes('hsn') && <th className="p-2 border border-border w-24">HSN/SAC</th>}
            {columns.includes('qty') && <th className="p-2 border border-border w-24 text-center">Quantity</th>}
            {columns.includes('rate') && <th className="p-2 border border-border w-24 text-right">Rate</th>}
            {columns.includes('per') && <th className="p-2 border border-border w-16 text-center">Per</th>}
            {columns.includes('mrp') && <th className="p-2 border border-border w-24 text-right">MRP</th>}
            {columns.includes('discount') && <th className="p-2 border border-border w-20 text-center">Dis %</th>}
            {columns.includes('amount') && <th className="p-2 border border-border w-32 text-right">Amount</th>}
            {!readOnly && <th className="p-2 border border-border w-12 no-print"></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
              {columns.includes('sno') && (
                <td className="p-2 border border-border text-center">{index + 1}</td>
              )}
              {columns.includes('name') && (
                <td className="p-0 border border-border relative">
                  {readOnly ? (
                    <div className="p-2">{item.productName}</div>
                  ) : (
                    <>
                      <input 
                        type="text"
                        className="w-full p-2 bg-transparent outline-none focus:bg-background"
                        value={item.productName}
                        onChange={(e) => updateLineItem(index, 'productName', e.target.value)}
                        onFocus={() => setActiveRow(index)}
                        placeholder="Type to search..."
                      />
                      {renderProductSuggestions(index, item.productName)}
                    </>
                  )}
                </td>
              )}
              {columns.includes('hsn') && (
                <td className="p-0 border border-border">
                  <input 
                    type="text" className="w-full p-2 text-center bg-transparent outline-none"
                    value={item.hsn || ''} onChange={(e) => updateLineItem(index, 'hsn', e.target.value)}
                    readOnly={readOnly}
                  />
                </td>
              )}
              {columns.includes('qty') && (
                <td className="p-0 border border-border">
                  {readOnly ? (
                    <div className="p-2 text-center">{item.quantity}</div>
                  ) : (
                    <select
                      className="w-full p-2 text-center bg-transparent outline-none cursor-pointer text-xs"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    >
                      {Array.from({ length: 100 }, (_, i) => i + 1).map((val) => (
                        <option key={val} value={val} className="text-black bg-white">
                          {val}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              )}
              {columns.includes('rate') && (
                <td className="p-0 border border-border">
                   <input 
                    type="number" className="w-full p-2 text-right bg-transparent outline-none"
                    value={item.rate || 0} onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    readOnly={readOnly}
                  />
                </td>
              )}
              {columns.includes('per') && (
                <td className="p-2 border border-border text-center text-muted-foreground">Pkt.</td>
              )}
              {columns.includes('mrp') && (
                <td className="p-0 border border-border">
                  <input 
                    type="number" className="w-full p-2 text-right bg-transparent outline-none"
                    value={item.mrp} onChange={(e) => updateLineItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                    readOnly={readOnly}
                  />
                </td>
              )}
              {columns.includes('discount') && (
                <td className="p-0 border border-border">
                  <input 
                    type="number" className="w-full p-2 text-center bg-transparent outline-none"
                    value={item.discountPercent} onChange={(e) => updateLineItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                    readOnly={readOnly}
                  />
                </td>
              )}
              {columns.includes('amount') && (
                <td className="p-2 border border-border text-right font-medium">
                  {item.amount.toFixed(2)}
                </td>
              )}
              {!readOnly && (
                <td className="p-0 border border-border text-center no-print">
                  <button 
                    onClick={() => removeLineItem(index)}
                    className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {!readOnly && (
        <button 
          onClick={() => addLineItem()}
          className="mt-4 flex items-center gap-2 text-primary hover:text-primary/80 font-medium no-print text-sm px-4 py-2 bg-primary/10 rounded-md"
        >
          <Plus size={16} /> Add Row
        </button>
      )}
    </div>
  );
};
