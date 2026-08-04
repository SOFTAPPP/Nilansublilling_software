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
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[LOGIN ATTEMPT] Username: ${username}, Password length: ${password.length}`);
    try {
      const db = await getDb();
      const res = await db.select<{ id: number, username: string, passwordHash: string }[]>(
        'SELECT id, username, "passwordHash" FROM "Admin" WHERE username = $1', [username]
      );
      if (res && res.length > 0) {
        const user = res[0] as any; 
        const hash = user.passwordHash || user.passwordhash || user.password_hash; 
        console.log(`[LOGIN DEBUG] Found user in DB. Hash starts with: ${hash ? hash.substring(0, 4) : 'none'}`);
        
        const match = hash ? await bcrypt.compare(password.trim(), hash) : false;
        console.log(`[LOGIN DEBUG] Password match result: ${match}`);
        
        if (match) {
          console.log('[LOGIN SUCCESS] Passwords matched. Redirecting...');
          sessionStorage.setItem('token', 'tauri-local-auth-token');
          sessionStorage.setItem('admin', JSON.stringify({ username: user.username, id: user.id }));
          
          // CRITICAL: Update global store so App.tsx knows we are logged in, and fetch data!
          const store = useStore.getState();
          useStore.setState({ token: 'tauri-local-auth-token', isAuthenticated: true });
          store.fetchProducts();
          store.fetchParties();
          store.fetchBills();
          store.fetchTransporters();
          store.fetchSettings();

          navigate('/');
          return;
        }
        console.error(`[LOGIN FAILED] Passwords did not match!`);
        setError(`Invalid credentials`);
        return;
      }
      console.error(`[LOGIN FAILED] User not found in database.`);
      setError('Invalid credentials');
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      const msg = err?.message || err?.toString() || 'Unknown database error';
      setError(`Database error: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
