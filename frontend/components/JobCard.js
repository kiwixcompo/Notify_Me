import { ClockIcon, ExternalLinkIcon } from '@heroicons/react/24/outline';

export default function JobCard({ job, showFeed }) {
  const formatJobDate = (dateString) => {
    if (formatDate) return formatDate(dateString);
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
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
    return {
      name: 'We Work Remotely',
      url: 'https://weworkremotely.com',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    };
  };

  const sourceInfo = getSourceInfo();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        {/* Source Badge */}
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 mb-3">
          RSS
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
          {job.title}
        </h2>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
          {job.description?.substring(0, 150)}
          {job.description?.length > 150 ? '...' : ''}
        </p>
        {showFeed && job.feedUrl && (
          <div className="text-xs text-blue-700 mb-2">
            <span>Feed: </span>
            <a href={job.feedUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {job.feedUrl}
            </a>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            {job.publishedDate && (new Date(job.publishedDate)).toLocaleDateString()}
          </div>
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Apply
          </a>
        </div>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
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