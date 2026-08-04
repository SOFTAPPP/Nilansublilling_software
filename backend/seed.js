const { Client } = require('pg');
const bcryptjs = require('bcryptjs');

const DB_URL = 'postgres://npbilling_user:Aritradutta%402005@72.61.231.155:5432/npsoftwaredatabase';

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    
    const saltRounds = 10;
    const password = 'Aritradutta@2005';
    const hash = bcryptjs.hashSync(password, saltRounds);
    
    await client.query(`
      INSERT INTO "Admin" (username, "passwordHash", "createdAt", "updatedAt") 
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE 
      SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = NOW()
    `, ['aritradatt39@gmail.com', hash]);

    console.log('Successfully updated aritradatt39@gmail.com to use Aritradutta@2005');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

seed();
