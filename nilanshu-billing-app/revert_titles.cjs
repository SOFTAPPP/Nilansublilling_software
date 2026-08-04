const fs = require('fs');

const replaces = {
  'useStore.ts': [
    { search: /title:\s*'Notice',\s*message:\s*'Failed to load products/g, replace: "title: 'Fetch Error', message: 'Failed to load products" },
    { search: /title:\s*'Notice',\s*message:\s*'Failed to load customers/g, replace: "title: 'Fetch Error', message: 'Failed to load customers" },
    { search: /title:\s*'Notice',\s*message:\s*'Failed to load transporters/g, replace: "title: 'Fetch Error', message: 'Failed to load transporters" },
    { search: /title:\s*'Notice',\s*message:\s*'Failed to load bills/g, replace: "title: 'Fetch Error', message: 'Failed to load bills" },
    { search: /title:\s*'Notice',\s*message:\s*err.message \|\| 'Database error'/g, replace: "title: 'Add Party Failed', message: err.message || 'Database error'" }, // Actually Add Product, Update Product, Add Party, Update Party
    { search: /title:\s*'Notice',\s*message:\s*err.message \|\| 'Failed to update product'/g, replace: "title: 'Update Error', message: err.message || 'Failed to update product'" },
    { search: /title:\s*'Notice',\s*message:\s*'Cannot delete this product/g, replace: "title: 'Delete Failed', message: 'Cannot delete this product" },
    { search: /title:\s*'Notice',\s*message:\s*'Cannot delete this customer/g, replace: "title: 'Delete Failed', message: 'Cannot delete this customer" },
    { search: /title:\s*'Notice',\s*message:\s*'Cannot delete this transporter/g, replace: "title: 'Delete Failed', message: 'Cannot delete this transporter" },
    { search: /title:\s*'Notice',\s*message:\s*err.message \|\| 'Background sync failed'/g, replace: "title: 'Bill Save Error', message: err.message || 'Background sync failed'" },
    { search: /title:\s*'Notice',\s*message:\s*bgErr.message \|\| 'Failed to sync deletion/g, replace: "title: 'Delete Sync Failed', message: bgErr.message || 'Failed to sync deletion" },
    { search: /title:\s*'Notice',\s*message:\s*err.message \|\| 'Failed to delete bill/g, replace: "title: 'Delete Failed', message: err.message || 'Failed to delete bill" },
  ],
  'CashBill.tsx': [
    { search: /title:\s*'Notice',\s*message:\s*'Please add at least one item/g, replace: "title: 'Validation Error', message: 'Please add at least one item" },
    { search: /title:\s*'Notice',\s*message:\s*'Please enter a Memo No/g, replace: "title: 'Validation Error', message: 'Please enter a Memo No" },
    { search: /title:\s*'Notice',\s*message:\s*msg \|\| 'Failed to save bill/g, replace: "title: 'Save Failed', message: msg || 'Failed to save bill" }
  ],
  'CreditBill.tsx': [
    { search: /title:\s*'Notice',\s*message:\s*'Please add at least one item/g, replace: "title: 'Validation Error', message: 'Please add at least one item" },
    { search: /title:\s*'Notice',\s*message:\s*'Please enter an Invoice No/g, replace: "title: 'Validation Error', message: 'Please enter an Invoice No" },
    { search: /title:\s*'Notice',\s*message:\s*'Please select a valid customer/g, replace: "title: 'Validation Error', message: 'Please select a valid customer" },
    { search: /title:\s*'Notice',\s*message:\s*msg \|\| 'Failed to save bill/g, replace: "title: 'Save Failed', message: msg || 'Failed to save bill" },
    { search: /title:\s*'Notice',\s*message:\s*"Please enter customer's phone/g, replace: "title: 'Missing Info', message: \"Please enter customer's phone" },
    { search: /title:\s*'Notice',\s*message:\s*`Could not send SMS/g, replace: "title: 'SMS Failed', message: `Could not send SMS" },
    { search: /title:\s*'Notice',\s*message:\s*'Some technical error happened/g, replace: "title: 'Print Error', message: 'Some technical error happened" }
  ],
  'TransportBill.tsx': [
    { search: /title:\s*'Notice',\s*message:\s*'Please add at least one item/g, replace: "title: 'Validation Error', message: 'Please add at least one item" },
    { search: /title:\s*'Notice',\s*message:\s*'Please enter a Bill No/g, replace: "title: 'Validation Error', message: 'Please enter a Bill No" },
    { search: /title:\s*'Notice',\s*message:\s*msg \|\| 'Failed to save bill/g, replace: "title: 'Save Failed', message: msg || 'Failed to save bill" },
    { search: /title:\s*'Notice',\s*message:\s*'Some technical error happened/g, replace: "title: 'Print Error', message: 'Some technical error happened" }
  ],
  'PartyStatement.tsx': [
    { search: /title:\s*'Notice',\s*message:\s*'Some technical error happened/g, replace: "title: 'Print Error', message: 'Some technical error happened" }
  ],
  'QuickBill.tsx': [
    { search: /title:\s*'Notice',\s*message:\s*'Please add at least one item/g, replace: "title: 'Validation Error', message: 'Please add at least one item" },
    { search: /title:\s*'Notice',\s*message:\s*'Please enter a Bill No/g, replace: "title: 'Validation Error', message: 'Please enter a Bill No" },
    { search: /title:\s*'Notice',\s*message:\s*msg \|\| 'Failed to save bill/g, replace: "title: 'Save Failed', message: msg || 'Failed to save bill" },
    { search: /title:\s*'Notice',\s*message:\s*'Some technical error happened/g, replace: "title: 'Print Error', message: 'Some technical error happened" }
  ]
};

for (const [file, rules] of Object.entries(replaces)) {
  const p = 'c:/Users/ARITRA/Desktop/Nilansublilling_software/nilanshu-billing-app/src/' + (file === 'useStore.ts' ? 'store/' : 'pages/') + file;
  let content = fs.readFileSync(p, 'utf8');
  for (const rule of rules) {
    content = content.replace(rule.search, rule.replace);
  }
  
  // Blanket catch for any missed ones (like Add Product DB Error)
  content = content.replace(/title:\s*'Notice'/g, "title: 'Error'"); 
  
  fs.writeFileSync(p, content);
  console.log('Reverted titles in ' + file);
}
