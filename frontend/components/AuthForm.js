import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/solid';

export default function AuthForm({ mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, { email, password, name, phone });
        // Auto-login after registration
      }
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      router.replace('/dashboard');
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.message && err.message.includes('Network')) {
        setError('Network error: Please check your connection and API URL.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/90 rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center">
          <div className="flex items-center justify-center mb-6">
            <LockClosedIcon className="w-12 h-12 text-blue-600 drop-shadow-lg" />
            <EnvelopeIcon className="w-8 h-8 text-indigo-400 ml-[-12px] mt-6 rotate-12" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-blue-800 mb-2 drop-shadow-sm text-center">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="text-blue-700 mb-6 text-center text-sm md:text-base">
            {mode === 'login' ? 'Welcome back! Please enter your credentials.' : 'Register to get instant job alerts.'}
          </p>
          {error && <div className="mb-4 w-full text-center text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
          {mode === 'register' && (
            <>
              <label className="block mb-2 font-medium w-full text-left">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 transition"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your name"
              />
              <label className="block mb-2 font-medium w-full text-left">Phone</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 transition"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="Your phone (optional)"
              />
            </>
          )}
          <label className="block mb-2 font-medium w-full text-left">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 transition"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@email.com"
          />
          <label className="block mb-2 font-medium w-full text-left">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6 transition"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Your password"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 hover:scale-105 active:scale-95 transition font-semibold text-lg mb-2 z-10 focus:outline-none focus:ring-4 focus:ring-blue-300"
            disabled={loading}
          >
            {loading ? (mode === 'login' ? 'Logging in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
          </button>
          <div className="mt-4 text-center w-full">
            {mode === 'login' ? (
              <span>Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline font-semibold">Register</a></span>
            ) : (
              <span>Already have an account? <a href="/login" className="text-blue-600 hover:underline font-semibold">Login</a></span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 