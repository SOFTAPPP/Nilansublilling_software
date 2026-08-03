import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { useStore, BillLineItem, Product } from '../../store/useStore';
import { BarcodeScanIndicator } from '../BarcodeScanIndicator';

interface BillEngineProps {
  items: BillLineItem[];
  onChange: (items: BillLineItem[]) => void;
  columns?: ('sno' | 'name' | 'hsn' | 'qty' | 'rate' | 'per' | 'mrp' | 'discount' | 'amount')[];
  readOnly?: boolean;
  globalDiscount?: number;
  maxItems?: number;
}

const CellInput = ({ value, onChange, onFocus, placeholder, className, readOnly }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // We don't need local state for cursor preservation if we use setSelectionRange directly.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const val = e.target.value;
    
    // Call the parent update which might cause asynchronous re-renders
    onChange(val);

    // Force the cursor back to exactly where it was right after the DOM update cycle
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(start, end);
      }
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={value || ''}
      onChange={handleChange}
      onFocus={onFocus}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  );
};

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
  const [openQtyDropdown, setOpenQtyDropdown] = useState<number | null>(null);
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
        e.preventDefault(); // prevent form submit or other default action
        handleBarcodeScan(barcodeBuffer.current);
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        // Ignore space and other non-barcode chars if needed, but standard barcodes can be alphanumeric
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
      (p.barcode && p.barcode === cleanBarcode) ||
      p.id === cleanBarcode
    );
    
    if (product) {
      // Dispatch success event for the indicator
      window.dispatchEvent(new CustomEvent('barcode-scan-result', { 
        detail: { barcode: cleanBarcode, found: true, productName: product.name } 
      }));

      // Check if item is already in the bill
      const existingItemIndex = items.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex >= 0) {
        // Increment quantity if already exists
        const currentQty = items[existingItemIndex].quantity || 0;
        updateLineItem(existingItemIndex, 'quantity', currentQty + 1);
      } else {
        // Check if there is an empty row we can populate
        const emptyRowIndex = items.findIndex(item => !item.productId);
        if (emptyRowIndex >= 0) {
          updateLineItem(emptyRowIndex, 'productId', product.id);
        } else {
          // Add a new row
          addLineItem(product);
        }
      }
    } else {
      // Dispatch error event for the indicator
      window.dispatchEvent(new CustomEvent('barcode-scan-result', { 
        detail: { barcode: cleanBarcode, found: false } 
      }));
      showDialog({ title: 'Barcode Not Found', message: `No product found for barcode: ${cleanBarcode}. Please assign this barcode to a product in Stock Management.`, type: 'alert' });
    }
  };

  const addLineItem = (product?: Product) => {
    if (items.length >= maxItems) {
      showDialog({ title: 'Limit Reached', message: 'Maximum items reached for a single A4 bill! Please generate another bill for additional items.', type: 'alert' });
      return;
    }

    const discountPct = product && globalDiscount > 0 ? globalDiscount : 0;
    const newItem: BillLineItem = {
      id: crypto.randomUUID(),
      productId: product?.id || '',
      productName: product?.name || '',
      quantity: 1,
      mrp: product?.price || 0,
      discountPercent: discountPct,
      amount: product ? (product.price - (product.price * discountPct / 100)) : 0,
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

    // Auto-resolve product name to productId on blur or name change
    if (field === 'productName') {
      const match = products.find(p => p.name.toLowerCase() === value?.toLowerCase());
      if (match) {
        item.productId = match.id;
        item.mrp = match.price;
        item.hsn = match.hsn || '';
        item.rate = match.price;
      } else {
        item.productId = '';
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

  // Render product search suggestions — also matches by barcode
  const renderProductSuggestions = (index: number, currentName: string) => {
    if (activeRow !== index) return null;
    const query = currentName?.toLowerCase() || '';
    const suggestions = products
      .filter(p => !query || 
        p.name.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
      )
      .slice(0, 20);
    
    if (suggestions.length === 0) return null;

    return (
      <div className="absolute z-10 w-[450px] bg-card border border-border mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {suggestions.map(p => (
          <div 
            key={p.id} 
            className="px-3 py-2 cursor-pointer hover:bg-muted text-sm flex justify-between items-center"
            onClick={() => {
              updateLineItem(index, 'productId', p.id);
              setActiveRow(null);
            }}
          >
            <span className="flex-1 truncate">{p.name}</span>
            <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
              {p.barcode ? `🏷${p.barcode} | ` : ''}{p.category} | Stock: {p.stock} | ₹{p.price}
            </span>
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
                      <CellInput 
                        className="w-full p-2 bg-transparent outline-none focus:bg-background"
                        value={item.productName}
                        onChange={(val: string) => updateLineItem(index, 'productName', val)}
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
                  <CellInput 
                    className="w-full p-2 text-center bg-transparent outline-none"
                    value={item.hsn || ''} onChange={(val: string) => updateLineItem(index, 'hsn', val)}
                    readOnly={readOnly}
                  />
                </td>
              )}
              {columns.includes('qty') && (
                <td className="p-0 border border-border">
                  {readOnly ? (
                    <div className="p-2 text-center">{item.quantity}</div>
                  ) : (
                    <div className="relative">
                      <div 
                        className="w-full p-2 text-center bg-transparent outline-none cursor-pointer flex items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
                        onClick={() => setOpenQtyDropdown(openQtyDropdown === index ? null : index)}
                      >
                        <span className="font-medium">{item.quantity}</span>
                        <ChevronDown size={14} className="text-muted-foreground print:hidden" />
                      </div>
                      
                      {openQtyDropdown === index && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenQtyDropdown(null)}></div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-20 bg-card border border-border shadow-lg rounded-md z-50 max-h-44 overflow-y-auto no-print text-sm">
                            {Array.from({ length: 100 }, (_, i) => i + 1).map((val) => (
                              <div 
                                key={val} 
                                className={`p-2 text-center cursor-pointer hover:bg-muted transition-colors ${item.quantity === val ? 'bg-primary text-primary-foreground font-medium' : ''}`}
                                onClick={() => {
                                  updateLineItem(index, 'quantity', val);
                                  setOpenQtyDropdown(null);
                                }}
                              >
                                {val}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
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
        <div className="mt-4 flex items-center justify-between no-print">
          <button 
            onClick={() => addLineItem()}
            className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm px-4 py-2 bg-primary/10 rounded-md"
          >
            <Plus size={16} /> Add Row
          </button>
          <BarcodeScanIndicator active={!readOnly} />
        </div>
      )}
    </div>
  );
};
