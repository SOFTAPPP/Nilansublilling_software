import Database from '@tauri-apps/plugin-sql';

const DB_URL = import.meta.env.VITE_DATABASE_URL || 'postgres://postgres:postgres@localhost/npsoftwaredatabase';

let dbInstance: Database | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    try {
      dbInstance = await Database.load(DB_URL);
    } catch (err) {
      console.error('Database connection failed:', err);
      throw new Error('Failed to connect to database. Please check your database configuration.');
    }
  }
  return dbInstance;
};

// Helper to check authentication
export const isAuthenticated = () => {
  return sessionStorage.getItem('token') !== null;
};
