import React, { useState, useEffect } from 'react';
import { Bell, Mail, X, Volume2, ShieldAlert, UserCheck } from 'lucide-react';

export default function NotificationToastContainer({ onOpenTicket }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const detail = e.detail;
      if (!detail) return;
      setToasts((prev) => [detail, ...prev].slice(0, 3));

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 6000);
    };

    window.addEventListener('strawcrm-notification-toast', handleToast);
    return () => window.removeEventListener('strawcrm-notification-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isAssignment = toast.type === 'assignment';
        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-4 animate-in slide-in-from-top-3 fade-in duration-200 text-xs transition-all hover:shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                    isAssignment
                      ? 'bg-sky-50 border-sky-200/60 text-sky-600'
                      : 'bg-rose-50 border-rose-200/60 text-rose-600'
                  }`}
                >
                  {isAssignment ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 tracking-tight">
                      {isAssignment
                        ? 'Agent Assigned & Notified'
                        : toast.type === 'test'
                        ? 'Test Alert Dispatched'
                        : 'Urgent Ticket Notification'}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        isAssignment
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isAssignment ? toast.agentName || 'Assigned' : toast.priority || 'Urgent'}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800 mt-1 truncate">
                    #{toast.ticketId}: {toast.subject}
                  </p>

                  {/* Badges for active notification actions */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex-wrap">
                    {toast.emailDispatched && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        <Mail className="w-3 h-3 text-emerald-600" />
                        <span>Email sent to {toast.recipientEmail}</span>
                      </span>
                    )}
                    {toast.soundPlayed && (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                        <Volume2 className="w-3 h-3 text-blue-600" />
                        <span>Chime</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>


            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

