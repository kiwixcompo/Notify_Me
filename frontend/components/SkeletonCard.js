/**
 * Skeleton Loading Components
 * 
 * Animated shimmer placeholders to prevent blank white screens during data loading.
 * All components use the .skeleton CSS class from globals.css.
 */

/** Generic skeleton box */
export function SkeletonBox({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/** Job card skeleton — mimics a job list-row on mobile */
export function SkeletonJobCard() {
  return (
    <div className="flex items-start gap-3 p-4 bg-white border-b border-slate-100">
      {/* Company logo placeholder */}
      <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        {/* Job title */}
        <div className="skeleton h-4 w-3/4 rounded" />
        {/* Company name */}
        <div className="skeleton h-3 w-1/2 rounded" />
        {/* Tags row */}
        <div className="flex gap-2">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      </div>
      {/* Time ago */}
      <div className="skeleton h-3 w-10 rounded shrink-0" />
    </div>
  );
}

/** Scholarship card skeleton */
export function SkeletonScholarshipCard() {
  return (
    <div className="p-4 bg-white border-b border-slate-100 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
        {/* Score badge */}
        <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Dashboard stat card skeleton */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
      <div className="skeleton h-8 w-8 rounded-lg" />
      <div className="skeleton h-7 w-16 rounded" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  );
}

/** Feed item skeleton */
export function SkeletonFeedItem() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-slate-100">
      <div className="skeleton h-4 w-4 rounded shrink-0 mt-1" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

/** Generic list skeleton — renders N skeleton rows */
export function SkeletonList({ count = 5, SkeletonItem = SkeletonJobCard }) {
  return (
    <div role="status" aria-label="Loading content">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/** Full-page loading state */
export function SkeletonPage({ message = 'Loading...' }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6" role="status">
      <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
}

/** Mobile empty state with CTA */
export function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-5">{description}</p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[48px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Mobile error state */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-5">{description}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-slate-800 text-white text-sm font-bold rounded-2xl hover:bg-slate-700 active:bg-slate-900 transition-colors min-h-[48px]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
