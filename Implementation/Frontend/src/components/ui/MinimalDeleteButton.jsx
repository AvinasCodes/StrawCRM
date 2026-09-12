import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * MinimalDeleteButton
 * Micro-interaction reference: Dribbble "Minimal hover effect | Delete button with confirmation" by domussab
 * Exact colors sampled from video:
 * - Text/Icon resting: #8C1728 (Burgundy/Crimson)
 * - Hovered pill background: #B4303F (Rich Crimson)
 * - Knob background: #FFFFFF
 */
export default function MinimalDeleteButton({
  onConfirm,
  deleting = false,
  disabled = false,
  className = '',
  label = 'Delete',
  confirmLabel = 'Are you sure?',
  deletingLabel = 'Deleting...',
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isArmed, setIsArmed] = useState(false);

  // Expanded if hovered or explicitly armed (for touch/click interaction)
  const isExpanded = isHovered || isArmed;

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled || deleting) return;

    if (isExpanded) {
      // Confirmed delete!
      onConfirm && onConfirm();
      setIsArmed(false);
    } else {
      // Arm confirmation on first tap/click
      setIsArmed(true);
    }
  };

  const currentExpandedText = deleting ? deletingLabel : confirmLabel;
  const minRestingWidth = label.length > 8 ? `${Math.max(108, label.length * 8 + 36)}px` : '108px';
  const minExpandedWidth = currentExpandedText.length > 12 ? `${Math.max(156, currentExpandedText.length * 8 + 48)}px` : '156px';

  return (
    <button
      type="button"
      disabled={disabled || deleting}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsArmed(false);
      }}
      onClick={handleClick}
      aria-label={isExpanded ? currentExpandedText : label}
      className={`group relative inline-flex items-center select-none overflow-hidden rounded-full font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        isExpanded
          ? 'bg-[#B4303F] text-white shadow-[0_4px_14px_rgba(180,48,63,0.35)] pl-1.5 pr-4 py-1.5'
          : 'bg-white text-[#8C1728] border border-[#B4303F]/25 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[#B4303F]/50 px-4 py-2'
      } ${className}`}
      style={{
        height: '38px',
        minWidth: isExpanded ? minExpandedWidth : minRestingWidth,
      }}
    >
      {/* Circular white knob that appears on left when expanded */}
      <div
        className={`absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isExpanded
            ? 'w-7 h-7 bg-white shadow-sm opacity-100 scale-100'
            : 'w-0 h-0 opacity-0 scale-75 pointer-events-none'
        }`}
      >
        {deleting ? (
          <Loader2 className="w-3.5 h-3.5 text-[#8C1728] animate-spin" />
        ) : (
          <svg
            className="w-3.5 h-3.5 text-[#8C1728]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        )}
      </div>

      {/* Content wrapper */}
      <div className="relative w-full flex items-center justify-center px-1">
        {/* Resting state: label + trash icon */}
        <div
          className={`flex items-center gap-2 text-xs font-semibold tracking-wide transition-all duration-250 ease-out ${
            isExpanded
              ? 'opacity-0 -translate-x-3 pointer-events-none absolute'
              : 'opacity-100 translate-x-0'
          }`}
        >
          <span>{label}</span>
          <svg
            className="w-3.5 h-3.5 text-[#8C1728] transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Expanded state: confirmLabel or deletingLabel */}
        <div
          className={`flex items-center pl-7 text-xs font-semibold tracking-wide transition-all duration-300 ease-out whitespace-nowrap ${
            isExpanded
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-3 pointer-events-none absolute'
          }`}
        >
          <span>{currentExpandedText}</span>
        </div>
      </div>
    </button>
  );
}
