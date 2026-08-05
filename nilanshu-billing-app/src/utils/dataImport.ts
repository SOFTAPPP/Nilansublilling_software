import { Product, Party } from '../store/useStore';
import * as XLSX from 'xlsx';

export const importStockData = (stockData: any): Product[] => {
  const products: Product[] = [];
  let idCounter = 1;

  for (const [category, items] of Object.entries(stockData)) {
    (items as any[]).forEach((item) => {
      // Determine name and variant
      let name = item.name;
      let variant = undefined;
      
      if (!name) {
        if (item.level !== undefined) {
          name = `${category.replace(/_/g, ' ').toUpperCase()} LEVEL ${item.level}`;
        } else {
          name = category.replace(/_/g, ' ').toUpperCase();
        }
      }

      products.push({
        id: `PROD-${idCounter++}`,
        name: name,
        category: category.replace(/_/g, ' ').toUpperCase(),
        price: item.price || 0,
        stock: 100, // Dummy initial stock
        lowStockThreshold: 10,
        bindingVariant: variant,
        hsn: '48101920', // Default HSN from reference chalan
      });
    });
  }

  return products;
};

export const parseCustomersFile = async (file: File): Promise<Party[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(data as string);
          resolve(mapToParties(jsonData));
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(mapToParties(jsonData));
        } else {
          reject(new Error('Unsupported file format. Please upload .json or .xlsx'));
        }
      } catch (err) {
        reject(new Error('Failed to parse file: ' + (err as Error).message));
      }
    };

    reader.onerror = () => reject(new Error('File reading failed'));

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
};

const mapToParties = (data: any[]): Party[] => {
  return data.map((item, index) => ({
    id: item.id || `PARTY-${Date.now()}-${index}`,
    name: item.name || item.PartyName || item.CustomerName || 'Unknown',
    address: item.address || item.Address || '',
    phone: item.phone?.toString() || item.Phone?.toString() || '',
    email: item.email || item.Email || '',
    gstin: item.gstin || item.GSTIN || '',
    discountPercentage: Number(item.discountPercentage || item.Discount || 0),
    outstandingBalance: Number(item.outstandingBalance || item.Balance || 0),
    proprietorName: item.proprietorName || item.ProprietorName || '',
    bankName: item.bankName || item.BankName || '',
    bankAccountNo: item.bankAccountNo || item.BankAccountNo || '',
    bankIfsc: item.bankIfsc || item.BankIfsc || '',
  }));
};
