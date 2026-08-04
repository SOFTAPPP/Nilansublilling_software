const fs = require('fs');
const files = [
  'TransportBill.tsx',
  'QuickBill.tsx',
  'PartyStatement.tsx',
  'CreditBill.tsx',
  'CashBill.tsx'
];
files.forEach(f => {
  const p = 'c:/Users/ARITRA/Desktop/Nilansublilling_software/nilanshu-billing-app/src/pages/' + f;
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(
    /className="mb-6 w-\[210mm\] flex-shrink-0 flex justify-between items-center no-print"/g, 
    'className="mb-6 w-[210mm] flex-shrink-0 flex justify-between items-start no-print"'
  );
  content = content.replace(
    /<h2 className="text-2xl font-bold">/g, 
    '<h2 className="text-2xl font-bold mt-1.5">'
  );
  fs.writeFileSync(p, content);
  console.log('Fixed alignment in ' + f);
});
