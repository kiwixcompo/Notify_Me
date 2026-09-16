import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';
import Layout from '../components/Layout';
import { PlusIcon, TrashIcon, PencilIcon, BriefcaseIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function Preferences() {
  const router = useRouter();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('token')) {
        window.location.href = '/login';
      }
    }
  }, []);

  const [websiteLinks, setWebsiteLinks] = useState([]);
  const [newLink, setNewLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('jobs');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [predefinedCategories, setPredefinedCategories] = useState([
    {
      name: 'Tech Jobs',
      feeds: [
        { _id: '1', name: 'Remote Tech Jobs', source: 'RemoteOK' },
        { _id: '2', name: 'Startup Jobs', source: 'AngelList' },
      ]
    },
    {
      name: 'Scholarships',
      feeds: [
        { _id: '3', name: 'Undergraduate Scholarships', source: 'ScholarshipPortal' },
        { _id: '4', name: 'Graduate Fellowships', source: 'ProFellow' },
      ]
    }
  ]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFeeds, setCategoryFeeds] = useState([]);
  const [addedFeeds, setAddedFeeds] = useState(new Set());
  const [feeds, setFeeds] = useState([]);
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedApi, setNewFeedApi] = useState('');
  const [editingFeed, setEditingFeed] = useState(null);
  const [editName, setEditName] = useState('');
  const [editApi, setEditApi] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkCsvFile, setBulkCsvFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [alertKeywords, setAlertKeywords] = useState('');
  const [alertKeywordsSaved, setAlertKeywordsSaved] = useState(false);

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      const response = await api.get(`/feeds/search?q=${encodeURIComponent(searchQuery)}&type=${activeTab}`);
      setSearchResults(response.data);
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Load user's website links on component mount
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching website links...');
        const response = await api.get('/api/feeds/website-links');
        console.log('Fetched links:', response.data);
        setWebsiteLinks(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to load website links';
        setError(errorMessage);
        console.error('Error fetching website links:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [router]);

  // Add a new website link
  const addWebsiteLink = async (e) => {
    e.preventDefault();
    if (!newLink.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Adding new link:', { url: newLink, type: activeTab });
      const response = await api.post('/api/feeds/website-links', { 
        url: newLink.trim(),
        type: activeTab === 'jobs' ? 'job' : 'scholarship'
      });
      
      console.log('Link added successfully:', response);
      setWebsiteLinks(prevLinks => [...prevLinks, response.data]);
      setNewLink('');
      setSuccess('Website link added successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                         err.response?.data?.message || 
                         'Failed to add website link. Please try again.';
      setError(errorMessage);
      console.error('Error adding website link:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove a website link
  const removeWebsiteLink = async (id) => {
    if (!window.confirm('Are you sure you want to remove this website?')) return;
    
    try {
      await api.delete(`/api/feeds/website-links/${id}`);
      setWebsiteLinks(prevLinks => prevLinks.filter(link => link._id !== id));
      setSuccess('Website link removed successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to remove website link';
      setError(errorMessage);
      console.error('Error removing website link:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    }
  };
  // State for feed keywords
  const [feedKeywords, setFeedKeywords] = useState('');
  const [activeFeedId, setActiveFeedId] = useState(null);
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);

  // Update a website link
  const updateWebsiteLink = async (e) => {
    e.preventDefault();
    if (!editUrl.trim() || !editingLink) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.put(
        `/api/feeds/website-links/${editingLink._id}`,
        { 
          url: editUrl,
          type: activeTab === 'jobs' ? 'job' : 'scholarship'
        }
      );
      
      setWebsiteLinks(websiteLinks.map(link => 
        link._id === editingLink._id ? response.data : link
      ));
      
      setEditingLink(null);
      setEditUrl('');
      setSuccess('Website link updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update website link');
      console.error('Error updating website link:', err);
    } finally {
      setSaving(false);
    }
  };
  
  // Start editing a link
  const startEditing = (link) => {
    setEditingLink(link);
    setEditUrl(link.url);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingLink(null);
    setEditUrl('');
  };

  // Handle category selection
  const fetchCategoryFeeds = (category) => {
    setSelectedCategory(category);
    setCategoryFeeds(category.feeds);
  };

  // Handle adding predefined feed
  const handleAddPredefinedFeed = async (feedId, feedUrl) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/feeds/website-links',
        { url: feedUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setWebsiteLinks([...websiteLinks, response.data]);
      setAddedFeeds(new Set([...addedFeeds, feedUrl]));
      setSuccess('Feed added successfully!');
    } catch (err) {
      setError('Failed to add feed');
      console.error('Error adding feed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle adding new feed
  const handleAddFeed = async () => {
    if (!newFeedUrl) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/feeds/website-links',
        { 
          url: newFeedUrl,
          name: newFeedName || undefined,
          apiBackupUrl: newFeedApi || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFeeds([...feeds, response.data]);
      setNewFeedUrl('');
      setNewFeedName('');
      setNewFeedApi('');
      setSuccess('Feed added successfully!');
    } catch (err) {
      setError('Failed to add feed');
      console.error('Error adding feed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle editing feed
  const startEditFeed = (feed) => {
    setEditingFeed(feed._id);
    setEditUrl(feed.url);
    setEditName(feed.name || '');
    setEditApi(feed.apiBackupUrl || '');
  };

  // Handle saving edited feed
  const handleEditFeed = async (feedId) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/feeds/website-links/${feedId}`,
        { 
          url: editUrl,
          name: editName || undefined,
          apiBackupUrl: editApi || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFeeds(feeds.map(feed => 
        feed._id === feedId ? response.data : feed
      ));
      setEditingFeed(null);
      setSuccess('Feed updated successfully!');
    } catch (err) {
      setError('Failed to update feed');
      console.error('Error updating feed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting feed
  const handleDeleteFeed = async (feedId) => {
    if (!window.confirm('Are you sure you want to delete this feed?')) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/feeds/website-links/${feedId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeeds(feeds.filter(feed => feed._id !== feedId));
      setSelectedFeeds(selectedFeeds.filter(id => id !== feedId));
      setSuccess('Feed deleted successfully!');
    } catch (err) {
      setError('Failed to delete feed');
      console.error('Error deleting feed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    // Implementation for bulk upload
    console.log('Bulk upload not implemented yet');
  };

  // Handle export feeds
  const handleExportFeeds = () => {
    // Implementation for exporting feeds
    console.log('Export feeds not implemented yet');
  };

  // Handle bulk delete feeds
  const handleBulkDeleteFeeds = async () => {
    if (selectedFeeds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedFeeds.length} selected feeds?`)) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await Promise.all(
        selectedFeeds.map(feedId => 
          axios.delete(`/api/feeds/website-links/${feedId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      
      setFeeds(feeds.filter(feed => !selectedFeeds.includes(feed._id)));
      setSelectedFeeds([]);
      setSuccess(`Successfully deleted ${selectedFeeds.length} feeds`);
    } catch (err) {
      setError('Failed to delete selected feeds');
      console.error('Error deleting feeds:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle select all feeds
  const handleSelectAllFeeds = (e) => {
    if (e.target.checked) {
      setSelectedFeeds(feeds.map(feed => feed._id));
    } else {
      setSelectedFeeds([]);
    }
  };

  // Handle select feed
  const handleSelectFeed = (feedId) => {
    setSelectedFeeds(prev => 
      prev.includes(feedId)
        ? prev.filter(id => id !== feedId)
        : [...prev, feedId]
    );
  };

  // Handle save alert keywords
  const handleSaveAlertKeywords = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/preferences/alert-keywords',
        { 
          type: activeTab,
          keywords: alertKeywords.split(/[,\n]+/).map(k => k.trim()).filter(Boolean)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAlertKeywordsSaved(true);
      setSuccess('Alert keywords saved successfully!');
      setTimeout(() => setAlertKeywordsSaved(false), 3000);
    } catch (err) {
      setError('Failed to save alert keywords');
      console.error('Error saving alert keywords:', err);
    } finally {
      setSaving(false);
    }
  };

  // Render the component
  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-6">Preferences</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p>Loading your preferences...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-slate-800 to-slate-900 px-4 pt-5 pb-4 text-white mb-2">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Configuration</p>
        <h1 className="text-xl font-extrabold">Sources &amp; Settings</h1>
        <p className="text-slate-300 text-xs mt-0.5">RSS feeds · Keywords · Notifications · API keys</p>
      </div>

      <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
        <h1 className="hidden md:block text-2xl font-bold mb-6">Website Feeds</h1>
        <p className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Feed Sources</p>
        
        {/* Success/Error Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Add New Website Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add New Website</h2>
          <form onSubmit={addWebsiteLink} className="flex flex-col space-y-4">
            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <input
                type="url"
                id="websiteUrl"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the URL of the website you want to track for job postings.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || !newLink.trim()}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                saving || !newLink.trim()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {saving ? 'Adding...' : 'Add Website'}
            </button>
          </form>
        </div>

        {/* Website Links List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Your Tracked Websites</h2>
          </div>
          
          {websiteLinks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>You haven't added any websites yet.</p>
              <p className="mt-1">Add a website above to start tracking job postings.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {websiteLinks.map((link) => (
                <li key={link._id} className="p-4 hover:bg-gray-50">
                  {editingLink?._id === link._id ? (
                    <form onSubmit={updateWebsiteLink} className="flex items-center space-x-4">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !editUrl.trim()}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {link.name || 'Untitled Feed'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{link.url}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(link)}
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => removeWebsiteLink(link._id)}
                          className="p-1 text-red-400 hover:text-red-600 focus:outline-none"
                          title="Remove"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg mr-2 ${
                activeTab === 'jobs'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('jobs')}
            >
              <BriefcaseIcon className="w-5 h-5 mr-2" />
              Jobs
            </button>
            <button
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg ${
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
                placeholder={activeTab === 'jobs' ? 'Search for jobs...' : 'Search for scholarships...'}
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
            {(searchQuery && searchResults.length === 0 && !searching) && (
              <div className="text-center py-4 text-gray-500">
                No {activeTab} found matching "{searchQuery}". Try different keywords.
              </div>
            )}
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
