import { ClockIcon, DocumentTextIcon, CodeBracketIcon, TableCellsIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export default function JobCard({ job, showFeed }) {
  const formatJobDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const getFormatBadge = () => {
    if (job.isCodeBased) {
      return {
        label: 'XML Code',
        icon: CodeBracketIcon,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
    if (job.isXML) {
      return {
        label: 'XML',
        icon: DocumentTextIcon,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }
    if (job.isJSON) {
      return {
        label: 'JSON',
        icon: CodeBracketIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    if (job.isCSV) {
      return {
        label: 'CSV',
        icon: TableCellsIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
    return {
      label: 'RSS',
      icon: DocumentTextIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    };
  };

  const getSourceInfo = () => {
    if (job.source === 'twitter') {
      return {
        name: 'Twitter',
        url: 'https://twitter.com/JobFound5',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    
    // Extract source from feedName or feedUrl
    const feedName = job.feedName || '';
    const feedUrl = job.feedUrl || '';
    
    if (feedName.toLowerCase().includes('himalayas') || feedUrl.includes('himalayas.app')) {
      return {
        name: 'Himalayas',
        url: 'https://himalayas.app',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
    
    if (feedName.toLowerCase().includes('jobicy') || feedUrl.includes('jobicy.com')) {
      return {
        name: 'Jobicy',
        url: 'https://jobicy.com',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    
    if (feedName.toLowerCase().includes('jobs found') || feedUrl.includes('rss.app')) {
      return {
        name: 'Jobs Found',
        url: feedUrl,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
    
    return {
      name: feedName || 'Remote Jobs',
      url: feedUrl || '#',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const formatBadge = getFormatBadge();
  const sourceInfo = getSourceInfo();
  const FormatIcon = formatBadge.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Format Badge */}
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${formatBadge.bgColor} ${formatBadge.color} mb-2 sm:mb-3`}>
          <FormatIcon className="w-3 h-3 mr-1" />
          {formatBadge.label}
        </div>
        
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 leading-tight break-words line-clamp-3 sm:line-clamp-2">
          {job.title}
        </h2>
        
        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed break-words line-clamp-5 sm:line-clamp-3">
          {job.description?.substring(0, 250)}
          {job.description?.length > 250 ? '...' : ''}
        </p>
        
        {/* Categories */}
        {Array.isArray(job.categories) && job.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {job.categories.slice(0, 3).map((category, index) => (
              <span key={`category-${index}`} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                {category}
              </span>
            ))}
            {job.categories.length > 3 && (
              <span key="more-categories" className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                +{job.categories.length - 3} more
              </span>
            )}
          </div>
        )}
        
        {showFeed && job.feedUrl && (
          <div className="text-xs text-blue-700 mb-2 break-all">
            <span className="font-medium">Feed: </span>
            <a href={job.feedUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
              {job.feedName || job.feedUrl}
            </a>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon className="w-3 h-3 mr-1" />
            {formatJobDate(job.publishedDate || job.pubDate)}
          </div>
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
            Apply
          </a>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-50 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Job posted on{' '}
          <a 
            href={sourceInfo.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`${sourceInfo.color} hover:underline font-medium`}
          >
            {sourceInfo.name}
          </a>
          {job.author && job.source === 'twitter' && (
            <span className="ml-1">by @{job.author}</span>
          )}
        </div>
      </div>
    </div>
  );
} 