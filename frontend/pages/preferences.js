import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';
import Papa from 'papaparse';

export default function Preferences() {
  const router = useRouter();
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedApi, setNewFeedApi] = useState('');
  const [error, setError] = useState('');
  const [editingFeed, setEditingFeed] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editApi, setEditApi] = useState('');

  // Profile state
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // Bulk upload state
  const [bulkText, setBulkText] = useState('');
  const [bulkCsvFile, setBulkCsvFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);

  // Job Alert Keywords state
  const [alertKeywords, setAlertKeywords] = useState('');
  const [alertKeywordsSaved, setAlertKeywordsSaved] = useState(false);

  // Load keywords from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('alertKeywords') || '';
    setAlertKeywords(saved);
  }, []);

  const handleSaveAlertKeywords = () => {
    localStorage.setItem('alertKeywords', alertKeywords);
    setAlertKeywordsSaved(true);
    setTimeout(() => setAlertKeywordsSaved(false), 2000);
  };

  useEffect(() => {
    fetchFeeds();
    fetchProfile();
  }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeds(res.data.feeds || []);
    } catch (err) {
      setError('Failed to load RSS feeds');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile({ name: res.data.name, email: res.data.email });
    } catch (err) {
      setProfileError('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
        name: profile.name,
        email: profile.email,
        password: profilePassword || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileSuccess(true);
      setProfilePassword('');
    } catch (err) {
      setProfileError('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddFeed = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds`, {
        url: newFeedUrl,
        name: newFeedName,
        apiBackupUrl: newFeedApi
      }, {
      headers: { Authorization: `Bearer ${token}` }
      });
      setNewFeedUrl('');
      setNewFeedName('');
      setNewFeedApi('');
      setSuccess(true);
      fetchFeeds();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add RSS feed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeed = async (id) => {
    setSaving(true);
    setError('');
    setSuccess(false);
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      fetchFeeds();
    } catch (err) {
      setError('Failed to delete RSS feed');
    } finally {
      setSaving(false);
    }
  };

  const startEditFeed = (feed) => {
    setEditingFeed(feed._id);
    setEditUrl(feed.url);
    setEditName(feed.name || '');
    setEditApi(feed.apiBackupUrl || '');
  };

  const handleEditFeed = async (id) => {
    setSaving(true);
    setError('');
      setSuccess(false);
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds/${id}`, {
        url: editUrl,
        name: editName,
        apiBackupUrl: editApi
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingFeed(null);
      setSuccess(true);
      fetchFeeds();
    } catch (err) {
      setError('Failed to edit RSS feed');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    setBulkUploading(true);
    setBulkUploadResult(null);
    const token = localStorage.getItem('token');
    let feedsToAdd = [];
    // Parse text area
    if (bulkText.trim()) {
      feedsToAdd = feedsToAdd.concat(
        bulkText.split('\n').map(line => line.trim()).filter(Boolean).map(url => ({ url }))
      );
    }
    // Parse CSV
    if (bulkCsvFile) {
      await new Promise((resolve, reject) => {
        Papa.parse(bulkCsvFile, {
          header: true,
          skipEmptyLines: true,
          complete: results => {
            if (results.errors.length) {
              setBulkUploadResult({ error: 'CSV parse error: ' + results.errors[0].message });
              resolve();
              return;
            }
            feedsToAdd = feedsToAdd.concat(
              results.data.map(row => ({
                url: row.url || row.URL || '',
                name: row.name || row.Name || '',
                apiBackupUrl: row.apiBackupUrl || row.APIBackupUrl || row['API Backup URL'] || ''
              })).filter(f => f.url)
            );
            resolve();
          },
          error: err => {
            setBulkUploadResult({ error: 'CSV parse error: ' + err.message });
            resolve();
          }
        });
      });
    }
    if (!feedsToAdd.length) {
      setBulkUploadResult({ error: 'No valid feeds found.' });
      setBulkUploading(false);
      return;
    }
    // Add feeds one by one
    let successCount = 0, failCount = 0, errors = [];
    for (const feed of feedsToAdd) {
      try {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds`, feed, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successCount++;
      } catch (err) {
        failCount++;
        errors.push(feed.url + ': ' + (err.response?.data?.error || err.message));
      }
    }
    setBulkUploadResult({ successCount, failCount, errors });
    setBulkText('');
    setBulkCsvFile(null);
    fetchFeeds();
    setBulkUploading(false);
  };

  const handleExportFeeds = () => {
    if (!feeds.length) return;
    const csv = Papa.unparse(feeds.map(({ url, name, apiBackupUrl }) => ({ url, name, apiBackupUrl })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const urlObj = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = 'rss-feeds.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(urlObj);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10 px-4">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
            Profile Details
          </h2>
          <p className="text-gray-600 mb-6">Update your profile information and password.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <input
            type="password"
            placeholder="New Password (leave blank to keep current)"
            value={profilePassword}
            onChange={e => setProfilePassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
          />
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold mt-2"
            onClick={handleProfileSave}
            disabled={profileLoading}
          >
            {profileLoading ? 'Saving...' : 'Save Profile'}
          </button>
          {profileError && <p className="text-red-600 mt-2 font-medium">{profileError}</p>}
          {profileSuccess && <p className="text-green-600 mt-2 font-medium">Profile updated!</p>}
        </div>
        {/* End Profile Section */}
        {/* Settings Placeholder Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
            Settings
          </h2>
          <p className="text-gray-600 mb-4">More settings coming soon! Let us know what you'd like to see here.</p>
        </div>
        {/* End Settings Placeholder Section */}
        {/* RSS Feed Management Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-extrabold text-blue-800 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
            Manage RSS Feeds
          </h1>
          <p className="text-gray-600 mb-6">Add, edit, or remove your job RSS feeds. These feeds power your job dashboard. You can also add an API backup URL for more reliable fetching.</p>
          {/* Bulk Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-blue-700">Bulk Upload RSS Feeds</h2>
            <p className="text-gray-500 mb-2">Paste a list of feed URLs (one per line), or upload a CSV file with columns: url, name (optional), apiBackupUrl (optional).</p>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
              rows={4}
              placeholder="https://example.com/feed1.rss\nhttps://example.com/feed2.rss"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              disabled={bulkUploading}
            />
            <div className="flex items-center gap-4 mb-2">
              <input
                type="file"
                accept=".csv"
                onChange={e => setBulkCsvFile(e.target.files[0])}
                disabled={bulkUploading}
                className=""
              />
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold"
                onClick={handleBulkUpload}
                disabled={bulkUploading || (!bulkText.trim() && !bulkCsvFile)}
              >
                {bulkUploading ? 'Uploading...' : 'Bulk Add Feeds'}
              </button>
            </div>
            {bulkUploadResult && (
              <div className="mt-2">
                {bulkUploadResult.error && <p className="text-red-600 font-medium">{bulkUploadResult.error}</p>}
                {bulkUploadResult.successCount > 0 && <p className="text-green-600 font-medium">{bulkUploadResult.successCount} feeds added!</p>}
                {bulkUploadResult.failCount > 0 && <p className="text-yellow-600 font-medium">{bulkUploadResult.failCount} failed.</p>}
                {bulkUploadResult.errors && bulkUploadResult.errors.length > 0 && (
                  <ul className="text-xs text-red-500 mt-1 list-disc ml-5">
                    {bulkUploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 text-blue-700">Add New RSS Feed</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <input
                type="text"
                placeholder="Feed URL (e.g. https://example.com/jobs.rss)"
                value={newFeedUrl}
                onChange={e => setNewFeedUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Feed Name (optional)"
                value={newFeedName}
                onChange={e => setNewFeedName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="API Backup URL (optional)"
                value={newFeedApi}
                onChange={e => setNewFeedApi(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold mt-2"
              onClick={handleAddFeed}
              disabled={saving || !newFeedUrl}
            >
              {saving ? 'Adding...' : 'Add Feed'}
            </button>
            {error && <p className="text-red-600 mt-2 font-medium">{error}</p>}
            {success && <p className="text-green-600 mt-2 font-medium">Success!</p>}
          </div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-blue-700">Your RSS Feeds</h2>
            <button
              className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
              onClick={handleExportFeeds}
              disabled={!feeds.length}
            >
              Export as CSV
            </button>
          </div>
          {feeds.length === 0 ? (
            <p className="text-gray-500">No RSS feeds added yet.</p>
          ) : (
            <ul className="divide-y">
              {feeds.map(feed => (
                <li key={feed._id} className="py-4 flex items-center justify-between">
                  {editingFeed === feed._id ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        type="text"
                        value={editApi}
                        onChange={e => setEditApi(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <div className="flex gap-2 mt-2 md:mt-0 md:col-span-3">
                        <button
                          className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                          onClick={() => handleEditFeed(feed._id)}
                          disabled={saving}
                        >Save</button>
                        <button
                          className="px-4 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold"
                          onClick={() => setEditingFeed(null)}
                          disabled={saving}
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-medium text-lg text-gray-900">{feed.name || feed.url}</div>
                        <div className="text-xs text-gray-500">{feed.url}</div>
                        {feed.apiBackupUrl && <div className="text-xs text-blue-700">API: {feed.apiBackupUrl}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-4 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
                          onClick={() => startEditFeed(feed)}
                          disabled={saving}
                        >Edit</button>
                        <button
                          className="px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                          onClick={() => handleDeleteFeed(feed._id)}
                          disabled={saving}
                        >Delete</button>
                      </div>
          </>
        )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Job Alert Keywords Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
            Job Alert Keywords
          </h2>
          <p className="text-gray-600 mb-4">Enter keywords to get notified when a job title matches. Separate keywords with commas or new lines.</p>
          <textarea
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            rows={3}
            placeholder="e.g. React, Remote, Senior"
            value={alertKeywords}
            onChange={e => setAlertKeywords(e.target.value)}
          />
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold mt-2"
            onClick={handleSaveAlertKeywords}
          >
            Save Keywords
          </button>
          {alertKeywordsSaved && <p className="text-green-600 mt-2 font-medium">Keywords saved!</p>}
        </div>
      </div>
    </Layout>
  );
} 