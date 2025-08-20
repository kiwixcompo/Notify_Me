import { ClockIcon, DocumentTextIcon, CodeBracketIcon, TableCellsIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export default function ScholarshipCard({ scholarship, showFeed }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const getFormatBadge = () => {
    if (scholarship.isCodeBased) {
      return {
        label: 'XML Code',
        icon: CodeBracketIcon,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      };
    }
    if (scholarship.isXML) {
      return {
        label: 'XML',
        icon: DocumentTextIcon,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      };
    }
    if (scholarship.isJSON) {
      return {
        label: 'JSON',
        icon: CodeBracketIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    }
    if (scholarship.isCSV) {
      return {
        label: 'CSV',
        icon: TableCellsIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }
    return {
      label: 'RSS',
      icon: DocumentTextIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    };
  };

  const getSourceInfo = () => {
    const feedName = scholarship.feedName || '';
    const feedUrl = scholarship.feedUrl || '';
    
    if (feedName.toLowerCase().includes('scholarships region') || feedUrl.includes('scholarshipregion.com')) {
      return {
        name: 'Scholarships Region',
        url: 'https://www.scholarshipregion.com',
        color: 'text-blue-600'
      };
    }
    
    if (feedName.toLowerCase().includes('scholarships and aid') || feedUrl.includes('scholarshipsandaid.org')) {
      return {
        name: 'Scholarships & Aid',
        url: 'https://scholarshipsandaid.org',
        color: 'text-green-600'
      };
    }
    
    return {
      name: feedName || 'Scholarships',
      url: feedUrl || '#',
      color: 'text-gray-600'
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
        
        {/* Amount Badge */}
        {scholarship.amount && (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2 sm:mb-3 ml-2">
            <span className="text-xs mr-1">$</span>
            {scholarship.amount}
          </div>
        )}
        
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 leading-tight break-words line-clamp-3 sm:line-clamp-2">
          {scholarship.title}
        </h2>
        
        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed break-words line-clamp-5 sm:line-clamp-3">
          {scholarship.description?.substring(0, 250)}
          {scholarship.description?.length > 250 ? '...' : ''}
        </p>
        
        {/* Scholarship Details */}
        <div className="flex flex-wrap gap-1 mb-3">
          {scholarship.level && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {scholarship.level}
            </span>
          )}
          {scholarship.country && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
              {scholarship.country}
            </span>
          )}
          {scholarship.field && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
              {scholarship.field}
            </span>
          )}
        </div>
        
        {/* Categories */}
        {Array.isArray(scholarship.categories) && scholarship.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {scholarship.categories.slice(0, 2).map((category, index) => (
              <span key={`category-${index}`} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                {category}
              </span>
            ))}
            {scholarship.categories.length > 2 && (
              <span key="more-categories" className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                +{scholarship.categories.length - 2} more
              </span>
            )}
          </div>
        )}
        
        {/* Deadline */}
        {scholarship.deadline && (
          <div className="text-sm text-red-600 font-medium mb-3 flex items-center">
            <ClockIcon className="w-4 h-4 mr-1" />
            Deadline: {formatDate(scholarship.deadline)}
          </div>
        )}
        
        {showFeed && scholarship.feedUrl && (
          <div className="text-xs text-blue-700 mb-2 break-all">
            <span className="font-medium">Feed: </span>
            <a href={scholarship.feedUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
              {scholarship.feedName || scholarship.feedUrl}
            </a>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon className="w-3 h-3 mr-1" />
            {formatDate(scholarship.pubDate)}
          </div>
          <a
            href={scholarship.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
            View Details
          </a>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-50 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Scholarship posted on{' '}
          <a 
            href={sourceInfo.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`${sourceInfo.color} hover:underline font-medium`}
          >
            {sourceInfo.name}
          </a>
        </div>
      </div>
    </div>
  );
}