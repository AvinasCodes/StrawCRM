import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function AuthError({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 p-3.5 bg-red-50/90 border border-red-200/80 rounded-xl text-red-700 text-sm animate-fade-in shadow-sm"
    >
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 font-medium leading-relaxed">{message}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 p-0.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
