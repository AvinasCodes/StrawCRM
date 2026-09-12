import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, fallback = null }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F9FC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-navy p-2 shadow-lg flex items-center justify-center">
            <img
              src="/brand-logo.png"
              alt="StrawCRM"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-brand-electric" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback;
  }

  return children;
}
