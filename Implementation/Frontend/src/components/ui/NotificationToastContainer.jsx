import React, { useState, useEffect } from 'react';
import { Bell, Mail, X, Volume2, ShieldAlert, UserCheck } from 'lucide-react';

export default function NotificationToastContainer({ onOpenTicket }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const detail = e.detail;
      if (!detail) return;
      setToasts((prev) => [detail, ...prev].slice(0, 3));

      // Auto dismiss after 9 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 9000);
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

                  {/* Badges and Sandbox Policy Notice for active notification actions */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      {toast.emailDispatched && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <Mail className="w-3 h-3 text-emerald-600" />
                          <span>
                            {toast.recipientEmail?.toLowerCase() === 'avinash48as@gmail.com'
                              ? `Direct mail delivered to ${toast.recipientEmail}`
                              : `Assigned to ${toast.recipientEmail}`}
                          </span>
                        </span>
                      )}
                      {toast.soundPlayed && (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                          <Volume2 className="w-3 h-3 text-blue-600" />
                          <span>Chime</span>
                        </span>
                      )}
                    </div>

                    {/* Resend Sandbox Alert Banner */}
                    {toast.emailDispatched && toast.recipientEmail?.toLowerCase() !== 'avinash48as@gmail.com' && (
                      <div className="bg-amber-50/95 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-950 shadow-xs animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1.5">
                          <span className="text-xs">⚠️</span>
                          <span className="tracking-tight uppercase text-[10px] font-extrabold">Resend Sandbox Policy Active</span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          Email redirected to verified account owner (<strong className="text-slate-950 font-bold">avinash48as@gmail.com</strong>) tagged with <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono text-[10px] font-bold">[For {toast.recipientEmail}]</code>.
                        </p>
                        <div className="text-[10.5px] text-amber-900 font-medium mt-2 border-t border-amber-200/70 pt-1.5 space-y-1">
                          <div>
                            <strong>Delivery Criteria:</strong> Resend free tier restricts outbound delivery strictly to the registered account owner until a custom domain is verified.
                          </div>
                          <div className="text-[10px] text-amber-800">
                            <strong>To deliver directly to any agent inbox:</strong> Add &amp; verify your custom domain at <span className="font-mono underline font-semibold">resend.com/domains</span>.
                          </div>
                        </div>
                      </div>
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

