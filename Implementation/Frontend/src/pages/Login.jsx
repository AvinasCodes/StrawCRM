import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import NeumorphicBrandPanel from '../components/auth/NeumorphicBrandPanel';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import TurnstileModal from '../components/auth/TurnstileModal';

export default function Login({ onNavigate }) {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot_password'
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [turnstileOpen, setTurnstileOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState('');

  // Check for reset password action code in URL
  React.useEffect(() => {
    window.scrollTo(0, 0);
    const params = new URLSearchParams(window.location.search);
    if (params.get('oobCode')) {
      setAuthView('forgot_password');
    }
  }, []);

  // If already authenticated and not loading, redirect to dashboard (unless completing a reset or registering)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!loading && isAuthenticated && !params.get('oobCode') && authView !== 'register') {
      if (onNavigate) {
        onNavigate('/dashboard');
      }
    }
  }, [isAuthenticated, loading, onNavigate, authView]);

  const handleLoginSuccess = () => {
    if (onNavigate) {
      onNavigate('/dashboard');
    }
  };

  const handleRegisterSuccess = (email) => {
    setRegisteredEmail(email || '');
    setRegistrationMessage('Account created successfully! Please sign in with your email and password.');
    setAuthView('login');
  };

  const handleTurnstileSuccess = (token) => {
    setTurnstileToken(token);
    setTurnstileOpen(false);
    setAuthView('forgot_password');
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full flex flex-col lg:flex-row text-slate-900 selection:bg-[#2563eb] selection:text-white bg-[#f7fafd] overflow-x-hidden lg:overflow-hidden">
      {/* Full-Screen Left Side: Neumorphic Brand Showcase Panel */}
      <div className="w-full lg:w-1/2 min-h-screen lg:min-h-0 lg:h-full flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/60 bg-gradient-to-br from-[#f8fafd] via-[#f1f6fb] to-[#eaf0f8] relative overflow-hidden">
        <NeumorphicBrandPanel />
      </div>

      {/* Full-Screen Right Side: Clean Neumorphic Authentication Experience */}
      <div className="w-full lg:w-1/2 min-h-screen lg:min-h-0 lg:h-full flex flex-col justify-center items-center p-6 sm:p-8 lg:p-8 xl:p-12 bg-[#f7fafd] relative overflow-y-auto">
        {/* Active Sub-component Form */}
        <div className="w-full max-w-md mx-auto my-auto py-3">
          {authView === 'login' && (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onForgotPassword={() => setTurnstileOpen(true)}
              onToggleMode={() => {
                setRegistrationMessage('');
                setAuthView('register');
              }}
              initialEmail={registeredEmail}
              successMessage={registrationMessage}
              onClearSuccessMessage={() => setRegistrationMessage('')}
            />
          )}

          {authView === 'register' && (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onToggleMode={() => {
                setRegistrationMessage('');
                setAuthView('login');
              }}
            />
          )}

          {authView === 'forgot_password' && (
            <ForgotPasswordModal
              onBack={() => {
                setAuthView('login');
                setTurnstileToken(null);
              }}
              turnstileToken={turnstileToken}
            />
          )}
        </div>
      </div>

      {/* Quick Support Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f7fafd] rounded-3xl p-6 max-w-sm w-full border border-white/80 shadow-2xl animate-slide-up">
            <h2 className="text-base font-bold text-slate-900 mb-2">StrawCRM Support</h2>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              For assistance with your agent credentials or deployment setup, email our team:
            </p>
            <div className="p-3 neu-inset-pill text-xs font-mono text-[#2563eb] font-bold text-center mb-4">
              support@strawcrm.com
            </div>
            <button
              type="button"
              onClick={() => setSupportModalOpen(false)}
              className="w-full py-2.5 neu-pill-btn-secondary text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Cloudflare Turnstile Bot Verification Modal for Password Reset */}
      <TurnstileModal
        isOpen={turnstileOpen}
        onSuccess={handleTurnstileSuccess}
        onClose={() => setTurnstileOpen(false)}
        title="Verify you are human"
        description="Please complete this quick verification before resetting your account password."
      />
    </div>
  );
}
