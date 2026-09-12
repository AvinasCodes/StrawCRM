import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, RefreshCw, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';

export default function TicketActionMenu({ ticket, onView, onStatusChange, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (callback) => {
    setIsOpen(false);
    if (callback) callback();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        aria-label={`Actions for ticket ${ticket.ticket_id}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/30"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="origin-top-right absolute right-0 mt-1 w-48 rounded-xl shadow-lg bg-white border border-slate-200 divide-y divide-slate-100 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onView && onView(ticket))}
              className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-electric transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>View Details</span>
            </button>
          </div>

          <div className="py-1">
            <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Change Status
            </div>

            {ticket.status !== 'Open' && (
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  handleAction(() => onStatusChange && onStatusChange(ticket.ticket_id, 'Open'))
                }
                className="w-full text-left flex items-center gap-2 px-3.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Mark Open</span>
              </button>
            )}

            {ticket.status !== 'In Progress' && (
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  handleAction(() => onStatusChange && onStatusChange(ticket.ticket_id, 'In Progress'))
                }
                className="w-full text-left flex items-center gap-2 px-3.5 py-1.5 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Mark In Progress</span>
              </button>
            )}

            {ticket.status !== 'Closed' && (
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  handleAction(() => onStatusChange && onStatusChange(ticket.ticket_id, 'Closed'))
                }
                className="w-full text-left flex items-center gap-2 px-3.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mark Resolved</span>
              </button>
            )}
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onDelete && onDelete(ticket))}
              className="w-full text-left flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete Ticket</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

