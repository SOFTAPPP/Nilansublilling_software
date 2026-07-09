const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DB_URL = 'postgres://postgres:Aritradutta%402005@localhost:5432/npsoftwaredatabase';

async function test() {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "Admin"');
    console.log(res.rows);
    
    // Test the password
    if (res.rows.length > 0) {
      const match = await bcrypt.compare('Aritradutta@005', res.rows[0].passwordHash);
      console.log('bcrypt.compare result for Aritradutta@005:', match);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
