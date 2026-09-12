import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

/**
 * DragDeleteDustbin
 * Precious interactive Neumorphic Dustbin with an animated mechanical hinged lid.
 * When a ticket card is dragged anywhere on screen:
 * - Glides up into the bottom-right corner.
 * - The lid lifts open smoothly with an energetic inner danger glow.
 * - Dragging directly over the bin opens the lid wider with a pulsating crimson aura.
 * - Releasing snaps the lid shut, triggers an eating/crunching shake, and fires onDropDelete.
 */
export default function DragDeleteDustbin({
  isDragging,
  draggedTicket,
  onDropDelete,
}) {
  const [isOver, setIsOver] = useState(false);
  const [isSwallowing, setIsSwallowing] = useState(false);

  // Reset states when drag ends
  useEffect(() => {
    if (!isDragging) {
      setIsOver(false);
    }
  }, [isDragging]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsOver(false);
    setIsSwallowing(true);

    // Play mouth snap shut & shake animation before calling delete
    setTimeout(() => {
      if (draggedTicket && onDropDelete) {
        onDropDelete(draggedTicket);
      }
      setTimeout(() => {
        setIsSwallowing(false);
      }, 400);
    }, 280);
  };

  if (!isDragging && !isSwallowing) {
    return null;
  }

  // Mouth state:
  // swallowing -> lid snapped hard shut (0deg)
  // isOver -> wide open (-62deg)
  // isDragging -> open ready (-36deg)
  const lidRotation = isSwallowing
    ? 'rotate-0 translate-y-0 scale-95'
    : isOver
    ? '-rotate-[62deg] -translate-y-3 -translate-x-1.5'
    : '-rotate-[36deg] -translate-y-2';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 select-none ${
        isDragging || isSwallowing
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-24 opacity-0 scale-90 pointer-events-none'
      }`}
    >
      <div
        className={`relative flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-200 cursor-pointer ${
          isOver
            ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-[0_12px_40px_rgba(225,29,72,0.65),0_0_20px_rgba(244,63,94,0.8)] scale-110 ring-4 ring-rose-300'
            : isSwallowing
            ? 'bg-red-700 text-white scale-105 animate-bounce shadow-2xl'
            : 'bg-[#E8EEF5] text-slate-700 shadow-[8px_8px_24px_rgba(165,182,206,0.55),-6px_-6px_20px_rgba(255,255,255,0.95)] border-2 border-rose-300/80'
        }`}
        style={{ width: '136px', height: '148px' }}
      >
        {/* Swallowing Laser Core Glow */}
        <div
          className={`absolute inset-3 rounded-2xl pointer-events-none transition-opacity duration-200 ${
            isOver
              ? 'opacity-100 bg-rose-400/30 blur-md animate-pulse'
              : 'opacity-0'
          }`}
        />

        {/* ─────────────────────────────────────────────────────────────
            ANIMATED VECTOR MECHANICAL DUSTBIN
           ───────────────────────────────────────────────────────────── */}
        <div
          className={`relative w-20 h-20 flex flex-col items-center justify-center transition-transform ${
            isSwallowing ? 'animate-dustbin-chomp' : ''
          }`}
        >
          {/* Animated Hinged Lid */}
          <div
            className={`w-14 h-4.5 origin-bottom-left transition-transform duration-200 ease-out z-20 ${lidRotation}`}
            style={{ willChange: 'transform' }}
          >
            {/* Top Handle */}
            <div
              className={`mx-auto w-4 h-1 rounded-t-full -mb-0.5 shadow-xs ${
                isOver || isSwallowing
                  ? 'bg-white'
                  : 'bg-rose-500'
              }`}
            />
            {/* Lid Plate */}
            <div
              className={`w-full h-3 rounded-t-xl border flex items-center justify-center shadow-md ${
                isOver || isSwallowing
                  ? 'bg-white text-rose-600 border-white'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400'
              }`}
            >
              <div className="w-8 h-0.5 bg-black/20 rounded-full" />
            </div>
          </div>

          {/* Inner Trash Can Mouth Glow when Open */}
          <div
            className={`w-11 h-2 -my-1 rounded-full z-10 transition-all duration-200 ${
              isSwallowing
                ? 'opacity-0 scale-50'
                : isOver
                ? 'bg-amber-300 shadow-[0_0_12px_#fde047] scale-110 opacity-100'
                : 'bg-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.6)] opacity-90'
            }`}
          />

          {/* Ribbed Dustbin Body */}
          <div
            className={`w-12 h-13 rounded-b-2xl border flex flex-col items-center justify-between p-1.5 z-10 shadow-inner transition-colors duration-200 ${
              isOver || isSwallowing
                ? 'bg-rose-700 border-rose-300/40 text-white'
                : 'bg-gradient-to-b from-[#E2E9F2] to-[#cbd5e1] border-white/80 text-rose-500'
            }`}
          >
            {/* Vertical Ribbed Grooves */}
            <div className="flex items-center justify-center gap-1.5 w-full mt-1 opacity-60">
              <div className="w-1 h-7 rounded-full bg-current opacity-40" />
              <div className="w-1 h-7 rounded-full bg-current opacity-40" />
              <div className="w-1 h-7 rounded-full bg-current opacity-40" />
            </div>

            {/* Micro Flame / Danger Stamp */}
            <div className="flex items-center justify-center -mt-2">
              <Flame
                className={`w-3.5 h-3.5 transition-transform ${
                  isOver ? 'scale-125 text-amber-300 animate-bounce' : 'opacity-70'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Contextual Guidance Label */}
        <div className="text-center mt-1 z-20">
          <p
            className={`text-[10px] font-black uppercase tracking-wider leading-tight ${
              isOver || isSwallowing
                ? 'text-white'
                : 'text-rose-600'
            }`}
          >
            {isSwallowing
              ? 'Munching...'
              : isOver
              ? 'Release to Trash!'
              : 'Drop to Delete'}
          </p>
          <span
            className={`text-[8px] font-bold block opacity-75 ${
              isOver || isSwallowing ? 'text-rose-100' : 'text-slate-500'
            }`}
          >
            {draggedTicket ? `#${draggedTicket.ticket_id}` : 'Drag card here'}
          </span>
        </div>
      </div>
    </div>
  );
}
