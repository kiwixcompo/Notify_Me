import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / action states
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Global AI Config states
  const [aiConfig, setAiConfig] = useState({ configured: false, masked: '', source: 'none' });
  const [inputGroqKey, setInputGroqKey] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  const fetchConfig = async () => {
    try {
      const res = await axios.get(API_BASE + '/api/admin/config', { headers: getHeaders() });
      if (res.data?.config) {
        setAiConfig({
          configured: res.data.config.groq_api_key_configured,
          masked: res.data.config.groq_api_key_masked,
          source: res.data.config.groq_api_key_source
        });
      }
    } catch (err) {
      console.warn('Failed to load system config:', err.message);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!inputGroqKey.trim()) {
      alert('Please enter a Groq API key.');
      return;
    }
    setSavingConfig(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.put(API_BASE + '/api/admin/config', {
        groq_api_key: inputGroqKey.trim()
      }, { headers: getHeaders() });
      setSuccess(res.data.message || 'Universal Groq API key updated successfully.');
      setInputGroqKey('');
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update system configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestGroqKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const keyToTest = inputGroqKey.trim() || undefined;
      const res = await axios.post(API_BASE + '/api/job-hunter/test-key', {
        api_key: keyToTest
      }, { headers: getHeaders() });
      setTestResult({ success: true, message: res.data.message || 'Key is valid and active!' });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Authentication with Groq failed. Please check key validity.'
      });
    } finally {
      setTestingKey(false);
    }
  };

  const fetchUsers = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(API_BASE + '/api/admin/users' + (query ? '?search=' + encodeURIComponent(query) : ''), {
        headers: getHeaders()
      });
      setUsers(res.data.users || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied: You do not have administrator permissions.');
      } else if (err.response?.status === 401) {
        router.replace('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load registered users.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/login');
        return;
      }
      fetchUsers();
      fetchConfig();
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    setUpdatingPassword(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.put(API_BASE + '/api/admin/users/' + selectedUser._id + '/password', {
        password: newPassword
      }, { headers: getHeaders() });

      setSuccess(res.data.message || 'Password updated successfully.');
      setSelectedUser(null);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async (user) => {
    if (!confirm('Send a password reset email link to ' + user.email + '?')) return;
    setSendingReset(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(API_BASE + '/api/admin/users/' + user._id + '/send-reset', {}, {
        headers: getHeaders()
      });
      setSuccess(res.data.message || 'Password reset link sent to ' + user.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset link.');
    } finally {
      setSendingReset(false);
    }
  };

  const handleChangeRole = async (user, newRole) => {
    if (!confirm('Change role for ' + user.name + ' to ' + newRole + '?')) return;
    try {
      await axios.put(API_BASE + '/api/admin/users/' + user._id + '/role', {
        role: newRole
      }, { headers: getHeaders() });
      setSuccess('Role for ' + user.name + ' changed to ' + newRole);
      fetchUsers(search);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm('WARNING: Are you sure you want to permanently delete ' + user.name + ' (' + user.email + ')? This will remove their profile and all associated data.')) {
      return;
    }
    setDeletingId(user._id);
    setError('');
    setSuccess('');
    try {
      const res = await axios.delete(API_BASE + '/api/admin/users/' + user._id, {
        headers: getHeaders()
      });
      setSuccess(res.data.message || 'User account deleted successfully.');
      setUsers(users.filter(u => u._id !== user._id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-4 px-3 sm:py-6 sm:px-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🛡️</span>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-300 bg-indigo-900/40 px-2.5 py-0.5 rounded-full border border-indigo-700">
                Administration Panel
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Manage Registered Users
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Search users, reset credentials, dispatch reset links, modify permissions, or remove accounts.
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-2xl font-black">{users.length}</div>
            <div className="text-[11px] text-blue-200 font-medium uppercase tracking-wider">Total Users</div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-500 font-bold ml-4">✕</button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-600 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Global AI & System Configuration */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🤖</span> Universal AI Configuration (Groq API Key)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set the universal Groq API key once here. All regular users can calculate resume scores and generate cover letters without needing to provide their own key.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                aiConfig.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {aiConfig.configured ? `Active (${aiConfig.masked})` : 'Not Configured'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={inputGroqKey}
                onChange={(e) => setInputGroqKey(e.target.value)}
                placeholder="Enter new Groq API Key (gsk_...)"
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTestGroqKey}
                  disabled={testingKey}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50 min-h-[42px]"
                >
                  {testingKey ? 'Testing...' : '⚡ Test Key'}
                </button>
                <button
                  type="submit"
                  disabled={savingConfig || !inputGroqKey.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50 min-h-[42px]"
                >
                  {savingConfig ? 'Saving...' : '💾 Save Universal Key'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.success ? '✅ ' : '⚠️ '}{testResult.message}
              </div>
            )}
          </form>
        </div>

        {/* Search & Actions Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="w-full sm:w-96 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email address..."
              className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow min-h-[44px]"
            >
              Search
            </button>
          </form>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => { setSearch(''); fetchUsers(''); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition min-h-[44px]"
            >
              🔄 Refresh List
            </button>
          </div>
        </div>

        {/* Direct Password Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Change User Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedUser.name} &bull; {selectedUser.email}</p>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setNewPassword(''); }}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password (min 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setNewPassword(''); }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow min-h-[44px]"
                  >
                    {updatingPassword ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="text-sm font-medium">Loading registered users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <span className="text-3xl block">👥</span>
              <p className="font-bold text-slate-700">No users found</p>
              <p className="text-xs text-slate-400">No accounts matched your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Registered</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{u.email}</span>
                          {u.phone && <span className="text-slate-400">&bull; {u.phone}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={u.role || 'user'}
                          onChange={(e) => handleChangeRole(u, e.target.value)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="publisher">Publisher</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell text-xs text-slate-500 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Send Reset Email */}
                          <button
                            onClick={() => handleSendResetEmail(u)}
                            disabled={sendingReset}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition"
                            title="Send password reset link email to user"
                          >
                            ✉️ Send Reset Link
                          </button>

                          {/* Set Password Direct */}
                          <button
                            onClick={() => { setSelectedUser(u); setNewPassword(''); }}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200 transition"
                            title="Change password directly"
                          >
                            🔑 Change Password
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingId === u._id}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition disabled:opacity-50"
                            title="Delete user account permanently"
                          >
                            {deletingId === u._id ? 'Deleting...' : '🗑️ Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
