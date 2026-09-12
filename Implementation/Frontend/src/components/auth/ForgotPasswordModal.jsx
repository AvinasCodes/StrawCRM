import React, { useState, useRef, useEffect } from 'react';
import {
  Mail, ArrowLeft, Loader2, CheckCircle2, Lock,
  Eye, EyeOff, RefreshCw, ShieldCheck, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { verifyResetCode, confirmNewPassword } from '../../services/auth';
import AuthError from './AuthError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

// ─── Password strength meter ─────────────────────────────────────────────────
function strengthScore(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];

function PasswordStrength({ password }) {
  const score = strengthScore(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              n <= score ? STRENGTH_COLORS[score] : 'bg-slate-100'
            }`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-semibold ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-amber-500' : score === 3 ? 'text-blue-500' : 'text-emerald-600'}`}>
        {STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ForgotPasswordModal({ onBack, turnstileToken }) {
  const { requestPasswordReset } = useAuth();

  // 'email' | 'check_email' | 'new_password' | 'done'
  const [view, setView] = useState('email');
  const [email, setEmail] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const timerRef = useRef(null);

  // Check URL on mount for oobCode (e.g. user clicked link from reset email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oobCode');
    const mode = params.get('mode');

    if (code && (mode === 'resetPassword' || !mode)) {
      setIsVerifyingLink(true);
      setError('');
      verifyResetCode(code)
        .then((res) => {
          if (res.success) {
            setVerifiedCode(code);
            setVerifiedEmail(res.email || '');
            setView('new_password');
          } else {
            setError(res.error || 'This reset link has expired or is invalid. Please request a new one.');
            setView('email');
          }
        })
        .catch(() => {
          setError('Could not verify the reset link. Please request a new one.');
          setView('email');
        })
        .finally(() => {
          setIsVerifyingLink(false);
        });
    }
  }, []);

  // Countdown timer for resending email
  useEffect(() => {
    if (view === 'check_email') {
      setResendCountdown(RESEND_SECONDS);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setResendCountdown((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [view]);

  // ── Step 1: Send Reset Link ────────────────────────────────────────────────
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) return setError('Please enter your email address.');
    if (!EMAIL_REGEX.test(trimmed)) return setError('Please enter a valid email address.');

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(trimmed);
      if (!res.success) return setError(res.error || 'Failed to send reset link.');
      setView('check_email');
    } catch {
      setError('Something went wrong. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend Reset Link ──────────────────────────────────────────────────────
  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);
    try {
      const res = await requestPasswordReset(email.trim());
      if (res.success) {
        setResendSuccess(true);
        setResendCountdown(RESEND_SECONDS);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setResendCountdown((s) => {
            if (s <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      } else {
        setError(res.error || 'Resend failed.');
      }
    } catch {
      setError('Resend failed. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // ── Step 2: Confirm New Password (when oobCode is available) ────────────────
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword) return setError('Please enter a new password.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setIsSubmitting(true);
    try {
      const res = await confirmNewPassword(verifiedCode, newPassword);
      if (!res.success) return setError(res.error || 'Failed to reset password.');
      setView('done');
      // Clean up URL query params
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state while verifying link from URL ────────────────────────────
  if (isVerifyingLink) {
    return (
      <div className="w-full text-center py-8">
        <Loader2 className="w-8 h-8 text-brand-electric animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Verifying reset link...</p>
        <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
      </div>
    );
  }

  // ── Done Screen ────────────────────────────────────────────────────────────
  if (view === 'done') {
    return (
      <div className="w-full animate-fade-in text-center py-2">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4 shadow-sm">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Password reset successfully!</h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-6 max-w-xs mx-auto">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2.5 px-4 bg-brand-electric hover:bg-[#0952D0] text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Back button row */}
      <div className="mb-4">
        <button
          type="button"
          onClick={view === 'check_email' ? () => { setView('email'); setError(''); } : onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-electric transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4">
          <AuthError message={error} onDismiss={() => setError('')} />
        </div>
      )}

      {/* ─── VIEW: Request Reset Link ────────────────────────────────────────── */}
      {view === 'email' && (
        <>
          <div className="mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-electric flex items-center justify-center mb-3 shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Reset your password</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Enter your account email and we'll send a secure password reset link to your inbox.
            </p>
          </div>

          <form onSubmit={handleSendEmail} noValidate className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder="name@company.com"
                  disabled={isSubmitting}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:border-brand-electric focus:ring-2 focus:ring-brand-electric/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-brand-electric hover:bg-[#0952D0] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending reset link...</span></>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        </>
      )}

      {/* ─── VIEW: Check Email Confirmation ──────────────────────────────────── */}
      {view === 'check_email' && (
        <div className="space-y-4">
          <div className="text-center pt-1 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-electric flex items-center justify-center mx-auto mb-3 shadow-sm ring-4 ring-blue-50/50">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Check your email</h2>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              We've sent a password reset link to:
            </p>
            <p className="mt-1 text-xs font-semibold text-brand-navy bg-slate-100 px-3 py-1.5 rounded-lg inline-block break-all max-w-full">
              {email}
            </p>
          </div>

          {/* Instructions Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-electric/10 text-brand-electric text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Open the email sent from <strong>StrawCRM</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-electric/10 text-brand-electric text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Click the <strong>Reset Password</strong> button or link.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-electric/10 text-brand-electric text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Choose your new secure password.</span>
            </div>
          </div>

          {/* Spam Warning Callout */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold text-amber-950">Email not showing up?</strong>
              <p className="mt-0.5 text-amber-800">
                Please check your <strong>Spam or Junk folder</strong>. Open the message and click <em>"Report not spam"</em> so future emails arrive directly in your inbox.
              </p>
            </div>
          </div>

          {resendSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 text-center font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>A fresh reset link has been sent to your email!</span>
            </div>
          )}

          {/* Resend actions */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-slate-400">Didn't receive the email?</span>
              {resendCountdown > 0 ? (
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  Resend in {resendCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-electric hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Resend link
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      )}

      {/* ─── VIEW: Set New Password (activated via email link) ──────────────── */}
      {view === 'new_password' && (
        <>
          <div className="mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create new password</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Set a strong new password for{' '}
              <span className="font-semibold text-slate-700">{verifiedEmail || 'your account'}</span>.
            </p>
          </div>

          <form onSubmit={handleSetPassword} noValidate className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); if (error) setError(''); }}
                  placeholder="Min 6 characters"
                  disabled={isSubmitting}
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:border-brand-electric focus:ring-2 focus:ring-brand-electric/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                  placeholder="Repeat password"
                  disabled={isSubmitting}
                  required
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border text-slate-900 text-sm rounded-xl focus:ring-2 focus:outline-none transition-all ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200/50'
                      : 'border-slate-200 focus:border-brand-electric focus:ring-brand-electric/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-[10px] font-medium text-red-500">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full py-2.5 px-4 bg-brand-electric hover:bg-[#0952D0] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Resetting password...</span></>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
