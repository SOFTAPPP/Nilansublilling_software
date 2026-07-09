import Database from '@tauri-apps/plugin-sql';

// Connect to the PostgreSQL database directly via Tauri
let dbInstance: Database | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await Database.load('postgres://postgres:Aritradutta%402005@localhost/npsoftwaredatabase');
  }
  return dbInstance;
};

// Helper to check authentication
export const isAuthenticated = () => {
  return sessionStorage.getItem('token') !== null;
};
