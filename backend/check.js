const { Client } = require('pg');
const DB_URL = 'postgres://npbilling_user:Aritradutta%402005@72.61.231.155:5432/npsoftwaredatabase';

async function testFetch() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const res = await client.query('SELECT id, name, category, price, stock, "lowStockThreshold", "bindingVariant", hsn, barcode FROM "Product"');
  console.log('Products:', res.rows);
  await client.end();
}
testFetch();
