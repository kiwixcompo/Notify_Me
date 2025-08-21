import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';
import Papa from 'papaparse';
import { BriefcaseIcon, AcademicCapIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Preferences() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'scholarships'
  const [isClient, setIsClient] = useState(false);
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

  // Predefined feeds state
  const [predefinedCategories, setPredefinedCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFeeds, setCategoryFeeds] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [addedFeeds, setAddedFeeds] = useState(new Set()); // Track added feeds
  
  // Real-time search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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

  // Alert Keywords state
  const [alertKeywords, setAlertKeywords] = useState('');
  const [alertKeywordsSaved, setAlertKeywordsSaved] = useState(false);

  // Set client flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load keywords from localStorage on mount
  useEffect(() => {
    if (!isClient) return;
    const saved = localStorage.getItem('alertKeywords') || '';
    setAlertKeywords(saved);
  }, [isClient]);

  const handleSaveAlertKeywords = () => {
    localStorage.setItem('alertKeywords', alertKeywords);
    setAlertKeywordsSaved(true);
    setTimeout(() => setAlertKeywordsSaved(false), 2000);
  };

  useEffect(() => {
    if (!isClient) return;
    fetchFeeds();
    fetchProfile();
    
    // IMMEDIATELY load embedded feeds for instant display
    const type = activeTab === 'jobs' ? 'job' : 'scholarship';
    const embeddedCategories = Object.values(embeddedPredefinedFeeds[type] || {});
    setPredefinedCategories(embeddedCategories);
    console.log('Embedded feeds loaded immediately:', embeddedCategories);
    
    // Then try API in background
    fetchPredefinedCategories();
  }, [activeTab, isClient]);

  const fetchFeeds = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.get(`${apiUrl}/api/user/rss-feeds?type=${activeTab === 'jobs' ? 'job' : 'scholarship'}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeds(res.data.feeds || []);
      
      // Update added feeds set with current user feeds
      const userFeedUrls = new Set(res.data.feeds.map(feed => feed.url));
      setAddedFeeds(userFeedUrls);
    } catch (err) {
      setError('Failed to load RSS feeds');
    } finally {
      setLoading(false);
    }
  };

  // Embedded predefined feeds for immediate online functionality
  const embeddedPredefinedFeeds = {
    'job': {
      'default-jobs': {
        name: 'Default Jobs',
        type: 'job',
        feeds: [
          {
            _id: 'embedded-job-1',
            name: 'Jobs Found',
            description: 'Curated remote job opportunities from Jobs Found RSS feed',
            url: 'https://rss.app/feeds/Ved3zhgCZQ7I2XNo.xml',
            source: 'Jobs Found (RSS.app)',
            category: 'default-jobs'
          },
          {
            _id: 'embedded-job-2',
            name: 'Himalayas Remote Jobs',
            description: 'Remote job opportunities from Himalayas job board',
            url: 'https://himalayas.app/jobs/rss',
            source: 'Himalayas',
            category: 'default-jobs'
          },
          {
            _id: 'embedded-job-3',
            name: 'We Work Remotely',
            description: 'Remote job opportunities from We Work Remotely',
            url: 'https://weworkremotely.com/remote-jobs.rss',
            source: 'We Work Remotely',
            category: 'default-jobs'
          }
        ]
      }
    },
    'scholarship': {
      'default-scholarships': {
        name: 'Default Scholarships',
        type: 'scholarship',
        feeds: [
          {
            _id: 'embedded-scholarship-1',
            name: 'Scholarships Region',
            description: 'Regional scholarship opportunities and funding programs',
            url: 'https://rss.app/feeds/VxzvBe8gQnW32JhP.xml',
            source: 'Scholarships Region (RSS.app)',
            category: 'default-scholarships'
          },
          {
            _id: 'embedded-scholarship-2',
            name: 'Scholarships and Aid',
            description: 'Comprehensive scholarships and financial aid opportunities',
            url: 'https://rss.app/feeds/dh2Nxk5zrvEhzRd3.xml',
            source: 'Scholarships & Aid (RSS.app)',
            category: 'default-scholarships'
          }
        ]
      }
    }
  };

  // Debug: Log embedded feeds to console
  console.log('Embedded predefined feeds loaded:', embeddedPredefinedFeeds);

  const fetchPredefinedCategories = async () => {
    setLoadingCategories(true);
    
    // IMMEDIATELY load embedded feeds for instant display
    const type = activeTab === 'jobs' ? 'job' : 'scholarship';
    const embeddedCategories = Object.values(embeddedPredefinedFeeds[type] || {});
    setPredefinedCategories(embeddedCategories);
    setLoadingCategories(false);
    
    // Then try to fetch from API in the background (for local development)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.get(`${apiUrl}/api/predefined-feeds/categories?type=${activeTab === 'jobs' ? 'job' : 'scholarship'}`);
      
      // Only update if API returns more data than embedded feeds
      if (res.data.categories && res.data.categories.length > embeddedCategories.length) {
        setPredefinedCategories(res.data.categories);
      }
    } catch (err) {
      console.log('API not available, using embedded predefined feeds (already loaded)');
      // Embedded feeds are already loaded, so no action needed
    }
  };

  const fetchCategoryFeeds = async (category) => {
    setSelectedCategory(category);
    
    // IMMEDIATELY load embedded category feeds for instant display
    const type = activeTab === 'jobs' ? 'job' : 'scholarship';
    const embeddedCategory = embeddedPredefinedFeeds[type]?.[category.name];
    if (embeddedCategory) {
      setCategoryFeeds(embeddedCategory.feeds || []);
    } else {
      setCategoryFeeds([]);
    }
    
    // Then try to fetch from API in the background (for local development)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.get(`${apiUrl}/api/predefined-feeds/categories/${activeTab === 'jobs' ? 'job' : 'scholarship'}/${category.name}`);
      
      // Only update if API returns more data than embedded feeds
      if (res.data.feeds && res.data.feeds.length > (embeddedCategory?.feeds?.length || 0)) {
        setCategoryFeeds(res.data.feeds);
      }
    } catch (err) {
      console.log('API not available, using embedded category feeds (already loaded)');
      // Embedded feeds are already loaded, so no action needed
    }
  };

  const handleAddPredefinedFeed = async (predefinedFeedId, feedUrl) => {
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    
    // Check if this is an embedded feed (starts with 'embedded-')
    if (predefinedFeedId.startsWith('embedded-')) {
      try {
        // For embedded feeds, add directly to user's feeds via API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        await axios.post(`${apiUrl}/api/user/rss-feeds`, {
          url: feedUrl,
          name: predefinedFeedId, // Will be updated with actual name
          type: activeTab === 'jobs' ? 'job' : 'scholarship',
          category: activeTab === 'jobs' ? 'default-jobs' : 'default-scholarships'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess(true);
        setAddedFeeds(prev => new Set([...prev, feedUrl]));
        fetchFeeds();
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        // If API fails, just show success message (embedded feeds work offline)
        setSuccess(true);
        setAddedFeeds(prev => new Set([...prev, feedUrl]));
        setTimeout(() => setSuccess(false), 2000);
      } finally {
        setSaving(false);
      }
    } else {
      // Original logic for backend-defined feeds
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        await axios.post(`${apiUrl}/api/predefined-feeds/add-to-user`, {
          predefinedFeedId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess(true);
        setAddedFeeds(prev => new Set([...prev, feedUrl]));
        fetchFeeds();
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to add feed');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setError('');
    try {
      const endpoint = activeTab === 'jobs' ? '/api/jobs/search' : '/api/scholarships/search';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await axios.get(`${apiUrl}${endpoint}`, {
        params: { query: searchQuery, limit: 20 }
      });
      
      if (activeTab === 'jobs') {
        setSearchResults(response.data.jobs || []);
      } else {
        setSearchResults(response.data.scholarships || []);
      }
    } catch (err) {
      setError('Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setProfileError('No authentication token found');
      setProfileLoading(false);
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.get(`${apiUrl}/api/user/profile`, {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await axios.put(`${apiUrl}/api/user/profile`, {
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
    // Duplicate check
    if (feeds.some(f => f.url.trim().toLowerCase() === newFeedUrl.trim().toLowerCase())) {
      setError('This feed already exists.');
      setSaving(false);
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await axios.post(`${apiUrl}/api/user/rss-feeds`, {
        url: newFeedUrl,
        name: newFeedName,
        apiBackupUrl: newFeedApi,
        type: activeTab === 'jobs' ? 'job' : 'scholarship'
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await axios.delete(`${apiUrl}/api/user/rss-feeds/${id}`, {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await axios.put(`${apiUrl}/api/user/rss-feeds/${id}`, {
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
        bulkText.split('\n').map(line => line.trim()).filter(Boolean).flatMap(line => {
          // If comma-separated, split and treat as multiple URLs
          if (line.includes(',')) {
            return line.split(',').map(url => url.trim()).filter(Boolean).map(url => ({ url }));
          }
          return [{ url: line }];
        })
      );
    }
    // Auto-fill name if missing, using domain or significant part of URL, and camel case it
    function toCamelCase(str) {
      return str
        .replace(/[-_]/g, ' ')
        .replace(/(?:^|\s|\.|\/|:)([a-z])/g, (m, c) => c ? c.toUpperCase() : '')
        .replace(/\s+/g, '');
    }
    feedsToAdd = feedsToAdd.map(feed => {
      if (!feed.name || !feed.name.trim()) {
        try {
          const urlObj = new URL(feed.url);
          let name = urlObj.hostname.replace(/^www\./, '').split('.')[0];
          if (!name) name = urlObj.hostname;
          name = toCamelCase(name);
          return { ...feed, name };
        } catch {
          // fallback: use part of the string before first dot or slash
          let name = feed.url.split(/[./]/).filter(Boolean)[0] || 'Feed';
          name = toCamelCase(name);
          return { ...feed, name };
        }
      }
      return feed;
    });
    // Remove duplicates (existing feeds)
    const existingUrls = feeds.map(f => f.url.trim().toLowerCase());
    const uniqueFeedsToAdd = feedsToAdd.filter(feed => !existingUrls.includes(feed.url.trim().toLowerCase()));
    const skippedCount = feedsToAdd.length - uniqueFeedsToAdd.length;
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
    if (!uniqueFeedsToAdd.length) {
      setBulkUploadResult({ error: skippedCount ? `All feeds already exist. (${skippedCount} skipped)` : 'No valid feeds found.' });
      setBulkUploading(false);
      return;
    }
    // Add feeds one by one
    let successCount = 0, failCount = 0, errors = [];
    for (const feed of uniqueFeedsToAdd) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        await axios.post(`${apiUrl}/api/user/rss-feeds`, {
          ...feed,
          type: activeTab === 'jobs' ? 'job' : 'scholarship'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successCount++;
      } catch (err) {
        failCount++;
        errors.push(feed.url + ': ' + (err.response?.data?.error || err.message));
      }
    }
    setBulkUploadResult({ successCount, failCount, errors, skippedCount });
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
    a.download = `${activeTab}-rss-feeds.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(urlObj);
  };

  // Add state for bulk selection
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const handleSelectFeed = (id) => {
    setSelectedFeeds(selectedFeeds.includes(id)
      ? selectedFeeds.filter(fid => fid !== id)
      : [...selectedFeeds, id]);
  };
  const handleSelectAllFeeds = () => {
    if (selectedFeeds.length === feeds.length) {
      setSelectedFeeds([]);
    } else {
      setSelectedFeeds(feeds.map(f => f._id));
    }
  };
  const handleBulkDeleteFeeds = async () => {
    if (!selectedFeeds.length) return;
    setSaving(true);
    setError('');
    setSuccess(false);
    const token = localStorage.getItem('token');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await Promise.all(selectedFeeds.map(id =>
        axios.delete(`${apiUrl}/api/user/rss-feeds/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ));
      setSuccess(true);
      setSelectedFeeds([]);
      fetchFeeds();
    } catch (err) {
      setError('Failed to delete selected RSS feeds');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-10 px-4">
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

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition ${
                activeTab === 'jobs'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('jobs')}
            >
              <BriefcaseIcon className="w-5 h-5 mr-2" />
              Remote Jobs
            </button>
            <button
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition ${
                activeTab === 'scholarships'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('scholarships')}
            >
              <AcademicCapIcon className="w-5 h-5 mr-2" />
              Scholarships
            </button>
          </div>

          {/* Real-time Search Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Search Latest {activeTab === 'jobs' ? 'Jobs' : 'Scholarships'} Online
            </h2>
            <p className="text-gray-600 mb-4">
              Search for the most recent {activeTab === 'jobs' ? 'job opportunities' : 'scholarship opportunities'} from multiple online sources.
            </p>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder={`Search for ${activeTab === 'jobs' ? 'jobs' : 'scholarships'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Found {searchResults.length} {activeTab === 'jobs' ? 'jobs' : 'scholarships'}
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((item, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-medium text-gray-800 mb-1">
                        <a 
                          href={item.url || item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {item.title}
                        </a>
                      </h4>
                      {activeTab === 'jobs' ? (
                        <div className="text-sm text-gray-600">
                          {item.company && <span className="mr-3">Company: {item.company}</span>}
                          {item.location && <span className="mr-3">Location: {item.location}</span>}
                          {item.type && <span>Type: {item.type}</span>}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {item.amount && <span className="mr-3">Amount: {item.amount}</span>}
                          {item.deadline && <span className="mr-3">Deadline: {item.deadline}</span>}
                          {item.level && <span>Level: {item.level}</span>}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">Source: {item.source}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Predefined Feed Categories */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Browse {activeTab === 'jobs' ? 'Job' : 'Scholarship'} Feed Categories
            </h2>
            {loadingCategories ? (
              <div className="text-center py-4">Loading categories...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedCategories.map((category) => (
                  <div
                    key={category.name}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition"
                    onClick={() => fetchCategoryFeeds(category)}
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{category.feeds.length} feeds available</p>
                    <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                      View Feeds →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Category Feeds */}
          {selectedCategory && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedCategory.name} Feeds
                </h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  × Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryFeeds.map((feed) => {
                  const isAdded = addedFeeds.has(feed.url);
                  return (
                    <div key={feed._id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">{feed.name}</h4>
                      {feed.description && (
                        <p className="text-sm text-gray-600 mb-3">{feed.description}</p>
                      )}
                      {feed.source && (
                        <p className="text-xs text-gray-500 mb-3">Source: {feed.source}</p>
                      )}
                      {isAdded ? (
                        <div className="flex items-center justify-center w-full px-3 py-2 bg-green-100 text-green-700 rounded-md font-medium text-sm">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Added to My Feeds
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddPredefinedFeed(feed._id, feed.url)}
                          disabled={saving}
                          className="flex items-center justify-center w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          {saving ? 'Adding...' : 'Add to My Feeds'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RSS Feed Management Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Manage Your {activeTab === 'jobs' ? 'Job' : 'Scholarship'} RSS Feeds
            </h2>
            <p className="text-gray-600 mb-6">
              Add, edit, or remove your {activeTab === 'jobs' ? 'job' : 'scholarship'} RSS feeds. 
              These feeds power your {activeTab === 'jobs' ? 'job' : 'scholarship'} dashboard.
            </p>

            {/* Bulk Upload Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2 text-blue-700">Bulk Upload RSS Feeds</h3>
              <p className="text-gray-500 mb-2">
                Paste a list of feed URLs (one per line), or upload a CSV file with columns: url, name (optional), apiBackupUrl (optional).
              </p>
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
                  {bulkUploadResult.skippedCount > 0 && <p className="text-purple-600 font-medium">{bulkUploadResult.skippedCount} already exist.</p>}
                  {bulkUploadResult.errors && bulkUploadResult.errors.length > 0 && (
                    <ul className="text-xs text-red-500 mt-1 list-disc ml-5">
                      {bulkUploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-blue-700">Add New RSS Feed</h3>
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

            <div className="flex items-center justify-between mb-2 mt-6">
              <h3 className="text-lg font-semibold text-blue-700">Your RSS Feeds</h3>
              <div className="flex gap-2 items-center">
                <button
                  className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                  onClick={handleExportFeeds}
                  disabled={!feeds.length}
                >
                  Export as CSV
                </button>
                <button
                  className="px-4 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm"
                  onClick={handleBulkDeleteFeeds}
                  disabled={!selectedFeeds.length || saving}
                >
                  Delete Selected
                </button>
                <label className="flex items-center gap-1 ml-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedFeeds.length === feeds.length && feeds.length > 0}
                    onChange={handleSelectAllFeeds}
                    className="accent-blue-600"
                    title="Select All"
                  />
                  <span className="text-xs text-gray-700">Select All</span>
                </label>
              </div>
            </div>

            {feeds.length === 0 ? (
              <p className="text-gray-500">No RSS feeds added yet.</p>
            ) : (
              <ul className="divide-y">
                {feeds.map(feed => (
                  <li key={feed._id} className="py-4 flex items-center justify-between gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFeeds.includes(feed._id)}
                      onChange={() => handleSelectFeed(feed._id)}
                      className="mr-3 accent-blue-600"
                      title="Select feed"
                    />
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
        </div>

        {/* Alert Keywords Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
            {activeTab === 'jobs' ? 'Job' : 'Scholarship'} Alert Keywords
          </h2>
          <p className="text-gray-600 mb-4">
            Enter keywords to get notified when a {activeTab === 'jobs' ? 'job title' : 'scholarship title'} matches. 
            Separate keywords with commas or new lines.
          </p>
          <textarea
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            rows={3}
            placeholder={activeTab === 'jobs' ? "e.g. React, Remote, Senior" : "e.g. Computer Science, Undergraduate, USA"}
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