import { useState } from 'react';
import axios from 'axios';
import { EnvelopeIcon } from '@heroicons/react/24/solid';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.post(`${apiUrl}/api/auth/forgot-password`, { email: email.trim() }, { timeout: 15000 });
      setMessage('A password reset link has been sent to your email.');
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Network error or server unavailable. Please try again.');
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
            <EnvelopeIcon className="w-12 h-12 text-blue-600 drop-shadow-lg" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-blue-800 mb-2 drop-shadow-sm text-center">
            Forgot Password
          </h2>
          <p className="text-blue-700 mb-6 text-center text-sm md:text-base">
            Enter your email and we will send you a reset link.
          </p>
          
          {error && <div className="mb-4 w-full text-center text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
          {message && <div className="mb-4 w-full text-center text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}

          <label className="block mb-2 font-medium w-full text-left">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6 transition"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@email.com"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 hover:scale-105 active:scale-95 transition font-semibold text-lg mb-4 z-10 focus:outline-none focus:ring-4 focus:ring-blue-300"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <div className="text-center w-full">
            <a href="/login" className="text-blue-600 hover:underline font-semibold">Back to Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
