import Database from '@tauri-apps/plugin-sql';

const DB_URL = import.meta.env.VITE_DATABASE_URL || 'postgres://postgres:postgres@localhost/npsoftwaredatabase';

let dbInstance: Database | null = null;
let connectingPromise: Promise<Database> | null = null;

export const getDb = async () => {
  if (dbInstance) return dbInstance;
  
  if (!connectingPromise) {
    connectingPromise = (async () => {
      try {
        console.log('[DB] Connecting to:', DB_URL.replace(/\/\/.*@/, '//***@'));
        const db = await Database.load(DB_URL);
        console.log('[DB] Connected successfully');
        return db;
      } catch (err: any) {
        console.error('Database connection failed:', err);
        connectingPromise = null; // allow retries
        throw new Error(`DB connection failed: ${err?.message || err?.toString() || 'Unknown error'}`);
      }
    })();
  }
  
  dbInstance = await connectingPromise;
  return dbInstance;
};

// Helper to check authentication
export const isAuthenticated = () => {
  return sessionStorage.getItem('token') !== null;
};
