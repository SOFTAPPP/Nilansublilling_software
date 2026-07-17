const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Postgres Connection configurations
const PG_USER = 'postgres';
const PG_PASSWORD = 'Aritradutta%402005'; // URL Encoded password
const PG_PASSWORD_DECODED = 'Aritradutta@2005'; // Plain text password
const DB_HOST = 'localhost';
const DB_PORT = '5432';
const DB_NAME = 'npsoftwaredatabase';

const backendDir = path.join(__dirname, 'backend');

async function runSetup() {
  console.log('====================================================');
  console.log('    NILANSHU BILLING SOFTWARE DATABASE SETUP        ');
  console.log('====================================================\n');

  // Step 1: Install Backend Dependencies first
  console.log('Step 1: Installing backend NPM dependencies...');
  try {
    execSync('npm install', { cwd: backendDir, stdio: 'inherit' });
    console.log('✔ Dependencies installed successfully.');
  } catch (err) {
    console.error('✖ Failed to install backend dependencies.');
    process.exit(1);
  }

  // Step 2: Dynamically load pg from backend node_modules
  console.log('\nStep 2: Connecting to PostgreSQL local server...');
  const pgPath = path.join(backendDir, 'node_modules', 'pg');
  if (!fs.existsSync(pgPath)) {
    console.error('✖ pg module not found in backend node_modules. Please run npm install manually inside backend/ folder.');
    process.exit(1);
  }
  
  const { Client } = require(pgPath);
  const defaultDbUrl = `postgres://${PG_USER}:${PG_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres`;
  const client = new Client({ connectionString: defaultDbUrl });
  
  try {
    await client.connect();
    console.log('✔ Connected successfully to PostgreSQL.');
  } catch (err) {
    console.error('\n✖ Connection Failed! Please check:');
    console.error('  1. PostgreSQL is installed and running on this computer.');
    console.error(`  2. The password for the default "postgres" user is "${PG_PASSWORD_DECODED}".`);
    console.error('  3. PostgreSQL is listening on port 5432.\n');
    console.error('Error Details:', err.message);
    process.exit(1);
  }

  // Step 3: Check and Create npsoftwaredatabase
  try {
    console.log(`\nStep 3: Checking if database "${DB_NAME}" exists...`);
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    
    if (res.rows.length === 0) {
      console.log(`-> Database "${DB_NAME}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✔ Database "${DB_NAME}" created successfully.`);
    } else {
      console.log(`✔ Database "${DB_NAME}" already exists.`);
    }
  } catch (err) {
    console.error('✖ Failed check/create database:', err.message);
    await client.end();
    process.exit(1);
  } finally {
    await client.end();
  }

  // Step 4: Push Prisma Schema to Database
  console.log('\nStep 4: Creating database tables (Prisma db push)...');
  try {
    execSync('npx prisma db push', { cwd: backendDir, stdio: 'inherit' });
    console.log('✔ Database tables synchronized successfully.');
  } catch (err) {
    console.error('✖ Failed to push Prisma schema.');
    process.exit(1);
  }

  // Step 5: Run Database Seed (Stock.json and Default Admin)
  console.log('\nStep 5: Seeding default products and admin users...');
  try {
    execSync('node prisma/seed.js', { cwd: backendDir, stdio: 'inherit' });
    console.log('✔ Database seeded with products and initial admins.');
  } catch (err) {
    console.error('✖ Failed to run Prisma db seed.');
    process.exit(1);
  }

  // Step 6: Apply custom admin password updates
  console.log('\nStep 6: Updating custom admin password (seed.js)...');
  try {
    execSync('node seed.js', { cwd: backendDir, stdio: 'inherit' });
    console.log('✔ Custom admin credentials applied successfully.');
  } catch (err) {
    console.error('✖ Failed to run custom admin password updates.');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('✔ DATABASE SETUP COMPLETED SUCCESSFULLY!            ');
  console.log('====================================================');
  console.log('\nYou can now run the software:');
  console.log('1. Root folder: `npm run dev` to start the app.');
  console.log('2. Backend folder: `npm run dev` to start Express API server.');
}

runSetup();
