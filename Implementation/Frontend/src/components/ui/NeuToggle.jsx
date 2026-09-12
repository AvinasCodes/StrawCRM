import React from 'react';

/**
 * High-End Neumorphic Soft UI Toggle Switch
 * Directly modeled from Dribbble reference:
 * - Raised outer white/soft-slate pill bezel with dual drop-shadows
 * - Recessed sunken inner trench:
 *     • Inactive: Soft slate-gray well (#D2DCE8 with deep inset shadows)
 *     • Active: Vibrant seafoam/mint green well (#72DFAB with deep inset shadows)
 * - Flat, clean circular off-white knob disc with micro drop-shadow
 */
export default function NeuToggle({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  title,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      className={`group relative inline-flex items-center cursor-pointer select-none focus:outline-none shrink-0 transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
      }`}
    >
      {/* Outer Elevated Neumorphic Bezel (White Lip with Soft Ambient Drop Shadow) */}
      <span className="relative inline-flex h-[32px] w-[58px] rounded-full p-[3px] bg-[#E8EEF5] shadow-[4px_4px_10px_rgba(166,180,200,0.55),-3px_-3px_8px_rgba(255,255,255,0.95)] border border-white/90 transition-all duration-300 group-hover:shadow-[5px_5px_12px_rgba(166,180,200,0.65),-4px_-4px_10px_rgba(255,255,255,1)]">
        {/* Inner Sunken Trench (Trough) */}
        <span
          className={`relative flex items-center h-full w-full rounded-full px-[3px] transition-colors duration-300 ease-in-out ${
            checked
              ? 'bg-[#6FE2B2] shadow-[inset_3px_3px_5px_rgba(20,110,65,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]'
              : 'bg-[#D3DEEA] shadow-[inset_3px_3px_5px_rgba(140,155,175,0.55),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]'
          }`}
        >
          {/* Concentric Flat Circular Knob Disc */}
          <span
            className={`pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-[#EBF1F7] shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_2px_rgba(255,255,255,0.85)] transform transition-transform duration-300 ease-in-out ${
              checked ? 'translate-x-[26px]' : 'translate-x-0'
            }`}
          />
        </span>
      </span>
    </button>
  );
}
