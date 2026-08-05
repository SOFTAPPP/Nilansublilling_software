import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';
import { getDb } from '../utils/api';
import { Lock, User } from 'lucide-react';
import { useStore } from '../store/useStore';
const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log(`[LOGIN ATTEMPT] Username: ${username}, Password length: ${password.length}`);
    try {
      const db = await getDb();
      const res = await db.select<{ id: number, username: string, passwordHash: string }[]>(
        'SELECT id, username, "passwordHash" FROM "Admin" WHERE username = $1', [username]
      );
      if (res && res.length > 0) {
        const user = res[0] as any; 
        const hash = user.passwordHash || user.passwordhash || user.password_hash; 
        
        const match = hash ? await bcrypt.compare(password.trim(), hash) : false;
        
        if (match) {
          sessionStorage.setItem('token', 'tauri-local-auth-token');
          sessionStorage.setItem('admin', JSON.stringify({ username: user.username, id: user.id }));
          
          useStore.setState({ token: 'tauri-local-auth-token', isAuthenticated: true });
          const store = useStore.getState();
          
          // CRITICAL FIX: Fetch sequentially to prevent Tauri sqlx from opening 5 concurrent TLS connections
          // which causes massive latency and connection timeouts over remote VPS links
          await store.fetchSettings();
          await store.fetchProducts();
          await store.fetchParties();
          await store.fetchBills();
          await store.fetchTransporters();

          navigate('/');
          return;
        }
        setError(`Invalid credentials`);
        setIsLoading(false);
        return;
      }
      setError('Invalid credentials');
      setIsLoading(false);
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      const msg = err?.message || err?.toString() || 'Unknown database error';
      setError(`Database error: ${msg}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 mb-4 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
             <img src="/logo.png" alt="NP-Billing Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">NP-Billing</h1>
          <h2 className="mt-2 text-center text-lg text-gray-600 font-medium">
            Admin Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating & Fetching Data...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Sign in to Dashboard
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
