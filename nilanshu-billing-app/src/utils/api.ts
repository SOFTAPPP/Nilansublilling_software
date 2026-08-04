import Database from '@tauri-apps/plugin-sql';

const DB_URL = import.meta.env.VITE_DATABASE_URL || 'postgres://postgres:postgres@localhost/npsoftwaredatabase';

let dbInstance: Database | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    try {
      console.log('[DB] Connecting to:', DB_URL.replace(/\/\/.*@/, '//***@'));
      dbInstance = await Database.load(DB_URL);
      console.log('[DB] Connected successfully');
    } catch (err: any) {
      console.error('Database connection failed:', err);
      throw new Error(`DB connection failed: ${err?.message || err?.toString() || 'Unknown error'}`);
    }
  }
  return dbInstance;
};

// Helper to check authentication
export const isAuthenticated = () => {
  return sessionStorage.getItem('token') !== null;
};
