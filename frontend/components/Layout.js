import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.replace('/login');
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow mb-8">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="font-bold text-lg text-blue-700">WWR Notify Me</div>
          <div className="space-x-4">
            <a href="/dashboard" className="text-gray-700 hover:text-blue-700">Dashboard</a>
            <a href="/preferences" className="text-gray-700 hover:text-blue-700">Preferences</a>
            <button onClick={handleLogout} className="text-gray-700 hover:text-red-600 ml-2">Logout</button>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
} 