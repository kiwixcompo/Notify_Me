import { useRouter } from 'next/router';

/**
 * MobilePageHeader
 * 
 * Consistent top bar for mobile sub-pages and sections.
 * Hidden on desktop (md:hidden).
 * 
 * Props:
 *   title: string — the page/section title
 *   subtitle: string (optional)
 *   showBack: bool — show a back chevron button
 *   onBack: fn — custom back handler (defaults to router.back())
 *   rightAction: ReactNode — optional right side button/element
 *   gradient: bool — use a gradient background (for hero headers)
 *   noBorder: bool — remove bottom border
 */
export default function MobilePageHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  gradient = false,
  noBorder = false,
  className = '',
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div
      className={`md:hidden flex items-center gap-3 px-4 py-3 min-h-[56px] ${
        gradient
          ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white'
          : 'bg-white text-slate-900'
      } ${noBorder ? '' : 'border-b border-slate-200'} ${className}`}
    >
      {/* Back Button */}
      {showBack && (
        <button
          onClick={handleBack}
          className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
            gradient
              ? 'hover:bg-white/20 active:bg-white/30 text-white'
              : 'hover:bg-slate-100 active:bg-slate-200 text-slate-600'
          }`}
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Title + Subtitle */}
      <div className="flex-1 min-w-0">
        <h1
          className={`font-bold truncate ${
            subtitle ? 'text-base leading-tight' : 'text-lg'
          } ${gradient ? 'text-white' : 'text-slate-900'}`}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`text-xs truncate mt-0.5 ${gradient ? 'text-white/70' : 'text-slate-500'}`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Action */}
      {rightAction && (
        <div className="shrink-0">{rightAction}</div>
      )}
    </div>
  );
}

/**
 * MobileSection
 * 
 * A labelled section divider for mobile grouped lists (iOS settings style)
 */
export function MobileSection({ label, children, className = '' }) {
  return (
    <div className={`md:hidden ${className}`}>
      {label && (
        <div className="px-5 pt-5 pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
      )}
      <div className="bg-white rounded-2xl mx-4 overflow-hidden divide-y divide-slate-100 border border-slate-100 shadow-sm">
        {children}
      </div>
    </div>
  );
}

/**
 * MobileSectionRow
 * 
 * A tappable row within a MobileSection
 */
export function MobileSectionRow({
  icon,
  label,
  value,
  chevron = true,
  destructive = false,
  onClick,
  className = '',
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 min-h-[52px] ${className}`}
    >
      {icon && (
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-lg"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className={`flex-1 text-[15px] font-medium ${destructive ? 'text-red-600' : 'text-slate-800'}`}>
        {label}
      </span>
      {value && (
        <span className="text-sm text-slate-400 shrink-0 max-w-[40%] truncate text-right">{value}</span>
      )}
      {chevron && (
        <svg className="w-4 h-4 text-slate-300 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}
