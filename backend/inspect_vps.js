const { Client } = require('pg');

async function inspectDb() {
  const client = new Client({
    connectionString: 'postgres://npbilling_user:Aritradutta%402005@72.61.231.155/npsoftwaredatabase',
  });

  try {
    await client.connect();
    console.log('Connected to VPS Database successfully!');

    // Check tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\n--- TABLES IN DATABASE ---');
    console.log(res.rows.map(r => r.table_name).join(', '));

    // Check foreign keys
    const fkRes = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `);

    console.log('\n--- FOREIGN KEY CONSTRAINTS (Crucial for CASCADE) ---');
    fkRes.rows.forEach(r => {
      console.log(`${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name} (ON DELETE ${r.delete_rule})`);
    });

    console.log('\nDatabase looks fully healthy!');

  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await client.end();
  }
}

inspectDb();
