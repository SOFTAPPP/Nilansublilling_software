const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:Aritradutta%402005@localhost/npsoftwaredatabase'
});

async function migrate() {
  try {
    await client.connect();
    
    // Create Transporter Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Transporter" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Transporter table created or already exists.');

    // Add transporterId to Bill table if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE "Bill" ADD COLUMN "transporterId" TEXT;
      `);
      console.log('transporterId column added to Bill table.');
    } catch (err) {
      if (err.code === '42701') { // 42701 = duplicate_column
        console.log('transporterId column already exists in Bill table.');
      } else {
        throw err;
      }
    }

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
