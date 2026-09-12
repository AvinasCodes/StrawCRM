import React, { useState } from 'react';
import { Mail, User, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import AuthError from './AuthError';
import TurnstileModal from './TurnstileModal';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterForm({ onSuccess, onToggleMode }) {
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileOpen, setTurnstileOpen] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    // Open Cloudflare bot verification modal before creating account
    setTurnstileOpen(true);
  };

  const handleTurnstileSuccess = async (token) => {
    setTurnstileOpen(false);
    setIsSubmitting(true);
    try {
      const res = await register(email, password, fullName);
      if (!res.success) {
        setServerError(res.error || 'Account creation failed. Please try again.');
        setIsSubmitting(false);
        return;
      }
      if (onSuccess) onSuccess(email.trim());
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium">
          Start collaborating with your support team
        </p>
      </div>

      {serverError && (
        <div className="mb-4">
          <AuthError message={serverError} onDismiss={() => setServerError('')} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full Name */}
        <div>
          <div
            className={`neu-inset-pill px-3 py-2 sm:py-2.5 flex items-center gap-3 ${
              errors.fullName ? 'neu-inset-pill-error' : ''
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 neu-icon-rounded flex items-center justify-center text-slate-400 shrink-0">
              <User className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              id="register-name"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null }));
              }}
              placeholder="Full Name"
              disabled={isSubmitting}
              required
              autoComplete="name"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {errors.fullName && (
            <p className="mt-1.5 ml-4 text-[11px] text-red-600 font-medium">{errors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <div
            className={`neu-inset-pill px-3 py-2 sm:py-2.5 flex items-center gap-3 ${
              errors.email ? 'neu-inset-pill-error' : ''
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 neu-icon-rounded flex items-center justify-center text-slate-400 shrink-0">
              <Mail className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              id="register-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              placeholder="Work Email"
              disabled={isSubmitting}
              required
              autoComplete="email"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 ml-4 text-[11px] text-red-600 font-medium">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div
            className={`neu-inset-pill px-3 py-2 sm:py-2.5 flex items-center gap-3 ${
              errors.password ? 'neu-inset-pill-error' : ''
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 neu-icon-rounded flex items-center justify-center text-slate-400 shrink-0">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              placeholder="Password (min. 6 characters)"
              disabled={isSubmitting}
              required
              autoComplete="new-password"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="pr-2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 ml-4 text-[11px] text-red-600 font-medium">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 sm:py-4 px-6 neu-pill-btn text-white text-xs sm:text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>CREATING ACCOUNT...</span>
            </>
          ) : (
            <>
              <span>CREATE ACCOUNT</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-xs sm:text-sm text-slate-500 font-medium">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-[#2563eb] font-bold hover:underline focus:outline-none"
        >
          Sign in
        </button>
      </p>

      {/* Cloudflare Bot Protection on Sign Up */}
      <TurnstileModal
        isOpen={turnstileOpen}
        onSuccess={handleTurnstileSuccess}
        onClose={() => setTurnstileOpen(false)}
        title="Verify you are human"
        description="Please complete this quick Cloudflare verification before creating your account."
      />
    </div>
  );
}
