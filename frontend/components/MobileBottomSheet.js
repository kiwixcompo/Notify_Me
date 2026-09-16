import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * MobileBottomSheet
 * 
 * A native-feeling bottom sheet with:
 * - Drag handle
 * - Swipe-to-dismiss
 * - Backdrop blur
 * - Safe area bottom padding
 * - Animated entrance/exit
 * 
 * Props:
 *   isOpen: bool
 *   onClose: fn
 *   title: string (optional)
 *   children: ReactNode
 *   snapPoints: ['fit', 'half', 'full'] (default: 'fit')
 *   showHandle: bool (default: true)
 */
export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoint = 'fit',
  showHandle = true,
  className = '',
}) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);
  const startY = useRef(null);
  const currentY = useRef(0);

  // Mount/unmount with animation
  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setVisible(true);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    } else {
      triggerClose();
    }
    return () => {
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      document.body.style.overflow = '';
    }, 260);
  }, []);

  // Touch drag-to-dismiss
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) return; // Don't allow dragging up past initial position
    currentY.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    // Dismiss if dragged more than 120px or 30% of height
    const threshold = sheetRef.current
      ? Math.min(120, sheetRef.current.offsetHeight * 0.3)
      : 120;
    if (currentY.current > threshold) {
      onClose();
    }
    startY.current = null;
    currentY.current = 0;
  };

  // Keyboard dismiss
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!visible && !isOpen) return null;

  const heightClass = {
    fit: 'max-h-[90vh]',
    half: 'h-[50vh]',
    full: 'h-[92vh]',
  }[snapPoint] || 'max-h-[90vh]';

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-240 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Options'}
        className={`relative w-full ${heightClass} bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden ${
          closing ? 'animate-[slideDown_0.26s_ease-in_forwards]' : 'sheet-enter'
        } ${className}`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-slate-100 shrink-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * BottomSheetActionList
 * Standard action list inside a bottom sheet
 * 
 * Usage:
 * <BottomSheetActionList actions={[
 *   { icon: '🗑️', label: 'Delete', onClick: fn, destructive: true },
 *   { icon: '📋', label: 'Copy link', onClick: fn },
 * ]} />
 */
export function BottomSheetActionList({ actions = [], onClose }) {
  return (
    <div className="px-4 py-3 space-y-1">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => {
            action.onClick?.();
            onClose?.();
          }}
          disabled={action.disabled}
          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-colors min-h-[52px] ${
            action.destructive
              ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
              : 'text-slate-800 hover:bg-slate-50 active:bg-slate-100'
          } ${action.disabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {action.icon && (
            <span className="text-xl w-7 text-center shrink-0" aria-hidden="true">
              {action.icon}
            </span>
          )}
          <span className="text-[15px] font-semibold">{action.label}</span>
          {action.badge && (
            <span className="ml-auto text-xs font-bold text-slate-400">{action.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
