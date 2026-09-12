import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, X, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import AuthError from './AuthError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm({
  onSuccess,
  onForgotPassword,
  onToggleMode,
  initialEmail = '',
  successMessage = '',
  onClearSuccessMessage,
}) {
  const { login, loginAsDemo, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sync initialEmail if set
  React.useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Field validation errors
  const [errors, setErrors] = useState({});
  // General/Server auth error
  const [serverError, setServerError] = useState('');
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        setServerError(res.error || 'Email or password is incorrect.');
        setIsSubmitting(false);
        return;
      }
      if (onSuccess) onSuccess(res.user);
    } catch {
      setServerError('Something went wrong. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setServerError('');
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setServerError(res.error || 'Unable to sign in with Google. Please try again.');
        setIsGoogleLoading(false);
        return;
      }
      if (onSuccess) onSuccess();
    } catch {
      setServerError('Google authentication failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const isDisabled = isSubmitting || isGoogleLoading;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header matching image */}
      <div className="text-center mb-5 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome Back
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 font-medium">
          Login to your StrawCRM account
        </p>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
          {onClearSuccessMessage && (
            <button
              type="button"
              onClick={onClearSuccessMessage}
              className="text-emerald-500 hover:text-emerald-700 p-0.5 rounded cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* General Server Error Banner */}
      {serverError && (
        <div className="mb-4">
          <AuthError message={serverError} onDismiss={() => setServerError('')} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5 sm:space-y-4">
        {/* Email Field - Neumorphic Inset Pill */}
        <div>
          <div
            className={`neu-inset-pill px-3 py-1.5 sm:py-2 flex items-center gap-3 ${
              errors.email ? 'neu-inset-pill-error' : ''
            }`}
          >
            {/* Soft Raised Icon Box */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 neu-icon-rounded flex items-center justify-center text-slate-400 shrink-0">
              <Mail className="w-4 h-4" aria-hidden="true" />
            </div>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              placeholder="Email"
              disabled={isDisabled}
              required
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          {errors.email && (
            <p id="email-error" className="mt-1 ml-4 text-[11px] text-red-600 font-medium animate-fade-in">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field - Neumorphic Inset Pill */}
        <div>
          <div
            className={`neu-inset-pill px-3 py-1.5 sm:py-2 flex items-center gap-3 ${
              errors.password ? 'neu-inset-pill-error' : ''
            }`}
          >
            {/* Soft Raised Icon Box */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 neu-icon-rounded flex items-center justify-center text-slate-400 shrink-0">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>

            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              placeholder="Password"
              disabled={isDisabled}
              required
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
            />

            {/* Password toggle button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isDisabled}
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
            <p id="password-error" className="mt-1 ml-4 text-[11px] text-red-600 font-medium animate-fade-in">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me Checkbox & Forgot Password */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => !isDisabled && setRememberMe(!rememberMe)}
              className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                rememberMe
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'bg-[#ebf1f8] border border-slate-300'
              }`}
            >
              {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="text-xs sm:text-sm text-slate-600 font-medium">
              Remember me
            </span>
          </label>

          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={isDisabled}
              className="text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] hover:underline focus:outline-none transition-colors"
            >
              Forgot Password?
            </button>
          )}
        </div>

        {/* Primary Action: LOGIN Button matching the blue pill in image */}
        <button
          type="submit"
          id="sign-in-button"
          disabled={isDisabled}
          className="w-full mt-1.5 py-3 sm:py-3.5 px-6 neu-pill-btn text-white text-xs sm:text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>LOGGING IN...</span>
            </>
          ) : (
            <>
              <span>LOGIN</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Divider matching design image */}
      <div className="relative my-5 sm:my-6 flex items-center justify-center">
        <div className="w-full border-t border-slate-200/90" />
        <span className="absolute bg-[#f7fafd] px-4 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          OR
        </span>
      </div>

      {/* Account Creation Toggle directly matching image */}
      {onToggleMode && (
        <p className="text-center text-xs sm:text-sm text-slate-500 font-medium">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-[#2563eb] font-bold hover:underline focus:outline-none"
          >
            Register here
          </button>
        </p>
      )}

      {/* Google Sign In option */}
      <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-center">
        <button
          type="button"
          id="google-sign-in-button"
          onClick={handleGoogleLogin}
          disabled={isDisabled}
          title="Sign in with Google"
          className="px-5 py-2 neu-pill-btn-secondary text-slate-600 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}
