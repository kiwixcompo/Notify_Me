import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { getApiBase } from '../utils/apiBase';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== repeatPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const apiUrl = getApiBase();
      const res = await axios.put(`${apiUrl}/api/auth/reset-password/${token}`, { password }, { timeout: 20000 });
      setMessage('Password reset successfully. Redirecting to dashboard...');
      
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        setTimeout(() => router.replace('/dashboard'), 2000);
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Network error or server unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100">
        <p className="text-xl text-blue-800">Invalid or missing reset token.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/90 rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center">
          <div className="flex items-center justify-center mb-6">
            <LockClosedIcon className="w-12 h-12 text-blue-600 drop-shadow-lg" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-blue-800 mb-2 drop-shadow-sm text-center">
            Set New Password
          </h2>
          <p className="text-blue-700 mb-6 text-center text-sm md:text-base">
            Please enter your new password below.
          </p>
          
          {error && <div className="mb-4 w-full text-center text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
          {message && <div className="mb-4 w-full text-center text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}

          <label className="block mb-2 font-medium w-full text-left">New Password</label>
          <div className="relative w-full mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition pr-10"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Your new password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          <label className="block mb-2 font-medium w-full text-left">Repeat New Password</label>
          <div className="relative w-full mb-6">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition pr-10"
              value={repeatPassword}
              onChange={e => setRepeatPassword(e.target.value)}
              required
              placeholder="Repeat new password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 hover:scale-105 active:scale-95 transition font-semibold text-lg mb-4 z-10 focus:outline-none focus:ring-4 focus:ring-blue-300"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
