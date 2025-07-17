import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { BriefcaseIcon, BellAlertIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        router.replace('/dashboard');
      }
    }
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* SVG Pattern */}
      <svg className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none" aria-hidden="true">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="relative z-10 max-w-xl w-full mx-auto px-4">
        <div className="bg-white/90 rounded-2xl shadow-2xl p-10 flex flex-col items-center">
          <div className="flex items-center justify-center mb-6">
            <BellAlertIcon className="w-10 h-10 text-blue-600 drop-shadow-lg" />
            <BriefcaseIcon className="w-7 h-7 text-indigo-400 ml-[-12px] mt-4 rotate-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-800 mb-3 drop-shadow-sm tracking-tight">WWR Notify Me</h1>
          <p className="text-lg md:text-xl text-blue-700 mb-8 font-medium">Get instant email alerts for new remote jobs from <span className='font-semibold'>We Work Remotely</span> that match your interests.</p>
          <div className="flex flex-col md:flex-row justify-center gap-4 mb-6 w-full">
            <a href="/login" className="flex-1 px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 hover:scale-105 active:scale-95 transition font-semibold text-lg text-center">Login</a>
            <a href="/register" className="flex-1 px-8 py-3 bg-white text-blue-700 border border-blue-600 rounded-lg shadow hover:bg-blue-50 hover:scale-105 active:scale-95 transition font-semibold text-lg text-center">Register</a>
          </div>
          <div className="text-xs text-gray-500 mt-4">Not affiliated with We Work Remotely. For job discovery only.</div>
        </div>
      </div>
    </div>
  );
} 