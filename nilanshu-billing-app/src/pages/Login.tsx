import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';
import { getDb } from '../utils/api';
import { Lock, User } from 'lucide-react';

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
      const res = await db.select<{ id: number, username: string, passwordHash: string }[]>('SELECT * FROM "Admin" WHERE username = $1', [username]);
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
          navigate('/');
          return;
        }
        console.error(`[LOGIN FAILED] Passwords did not match!`);
        setError(`Invalid credentials`);
        return;
      }
      console.error(`[LOGIN FAILED] User not found in database.`);
      setError('Invalid credentials');
    } catch (err) {
      console.error(err);
      setError('Database error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Admin Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
