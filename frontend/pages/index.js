import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BriefcaseIcon, BellAlertIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        // Check if user has a preference saved
        const userPreference = localStorage.getItem('userPreference');
        if (userPreference) {
          router.replace(`/dashboard?type=${userPreference}`);
        } else {
          // If no preference, show the selection page
          setSelectedType(null);
        }
      }
    }
  }, [router]);

  const handleTypeSelection = (type) => {
    setSelectedType(type);
    localStorage.setItem('userPreference', type);
    router.push(`/dashboard?type=${type}`);
  };

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
      
      <div className="relative z-10 max-w-4xl w-full mx-auto px-4">
        <div className="bg-white/90 rounded-2xl shadow-2xl p-10 flex flex-col items-center">
          <div className="flex items-center justify-center mb-6">
            <BellAlertIcon className="w-10 h-10 text-blue-600 drop-shadow-lg" />
            <BriefcaseIcon className="w-7 h-7 text-indigo-400 ml-[-12px] mt-4 rotate-12" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-800 mb-3 drop-shadow-sm tracking-tight text-center">
            Notify Me
          </h1>
          
          <p className="text-lg md:text-xl text-blue-700 mb-8 font-medium text-center max-w-2xl">
            Find your next opportunity. Get instant alerts for remote jobs and scholarships. 
            Your search, simplified.
          </p>

          {/* Type Selection */}
          <div className="w-full max-w-2xl mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              What are you looking for?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Jobs Card */}
              <div 
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedType === 'job' 
                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
                onClick={() => handleTypeSelection('job')}
              >
                <div className="flex items-center mb-4">
                  <BriefcaseIcon className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-xl font-bold text-gray-800">Remote Jobs</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Discover remote job opportunities from top companies worldwide. 
                  Get notified about the latest openings in your field.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Remote work opportunities</li>
                  <li>• Job alerts and notifications</li>
                  <li>• Filter by skills and location</li>
                  <li>• Direct application links</li>
                </ul>
              </div>

              {/* Scholarships Card */}
              <div 
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedType === 'scholarship' 
                    ? 'border-green-500 bg-green-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
                onClick={() => handleTypeSelection('scholarship')}
              >
                <div className="flex items-center mb-4">
                  <AcademicCapIcon className="w-8 h-8 text-green-600 mr-3" />
                  <h3 className="text-xl font-bold text-gray-800">Scholarships</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Find scholarships and funding opportunities for your education. 
                  Never miss a deadline with our alert system.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Academic scholarships</li>
                  <li>• Research grants</li>
                  <li>• Study abroad funding</li>
                  <li>• Deadline reminders</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="flex flex-col md:flex-row justify-center gap-4 mb-6 w-full max-w-md">
            <a href="/login" className="flex-1 px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 hover:scale-105 active:scale-95 transition font-semibold text-lg text-center">
              Login
            </a>
            <a href="/register" className="flex-1 px-8 py-3 bg-white text-blue-700 border border-blue-600 rounded-lg shadow hover:bg-blue-50 hover:scale-105 active:scale-95 transition font-semibold text-lg text-center">
              Register
            </a>
          </div>
          
          <div className="text-xs text-gray-500 mt-4 text-center">
            Not affiliated with any job board or scholarship provider. For discovery only.
          </div>
        </div>
      </div>
    </div>
  );
} 