const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DB_URL = 'postgres://postgres:Aritradutta%402005@localhost:5432/npsoftwaredatabase';
const username = 'aritradatt39@gmail.com';
const password = 'Aritradutta@005';

async function seedAdmin() {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert or update admin
    const query = `
      INSERT INTO "Admin" (username, "passwordHash", "createdAt", "updatedAt") 
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE 
      SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = NOW()
    `;
    
    await client.query(query, [username, passwordHash]);
    console.log('Successfully inserted/updated admin user:', username);
  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    await client.end();
  }
}

seedAdmin();
