import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, Film, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter both work email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login(email.trim(), password);
      const isUserAdmin = Boolean(
        loggedUser.is_system_admin ||
        loggedUser.role_code === 'ADMIN' ||
        loggedUser.role?.is_system_admin ||
        loggedUser.role?.code === 'ADMIN'
      );
      if (isUserAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      {/* Subtle brand ambient accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-[#EAEAEA] overflow-hidden z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Side: Brand Visual Panel (Desktop only, hidden on mobile for clean vertical flow) */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#171717] p-10 flex-col justify-between relative text-white">
          {/* Subtle glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF6B00]/20 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#FFC400] text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
              Enterprise Production HRMS
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white leading-snug">
              Orchestrate Video Production With Deterministic Precision.
            </h2>
            <p className="text-xs text-[#A3A3A3] mt-3 leading-relaxed">
              From script creation and 4K shoots to multi-version editing, thumbnail design, and multi-channel publishing.
            </p>
          </div>

          <div className="space-y-3.5 z-10">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Production Stage Control</h4>
                <p className="text-[11px] text-[#A3A3A3]">8-stage deterministic approval gates</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-[#16A36A]/20 text-[#16A36A] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Audited Proof of Work</h4>
                <p className="text-[11px] text-[#A3A3A3]">Cloudinary photos, Drive links & logs</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#737373] border-t border-white/10 pt-4 z-10">
            VCUBE MediaFlow • Operations Management
          </div>
        </div>

        {/* Right Side / Mobile Main Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          {/* Brand Logo Header */}
          <div className="text-center lg:text-left mb-8">
            <div className="flex justify-center lg:justify-start mb-4">
              <img
                src="/logo.png"
                alt="VCUBE MediaFlow"
                className="h-10 sm:h-12 w-auto object-contain max-w-[280px]"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none' }} className="items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00] flex items-center justify-center text-white font-black text-xl">
                  V
                </div>
                <span className="font-extrabold text-xl tracking-tight text-[#171717]">VCUBE MediaFlow</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs font-medium text-[#737373] mt-1">
              Access your daily production queue, task bucket, and team calendar.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#242424] mb-1.5 text-left">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vcube.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all min-h-[46px]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#242424]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-bold text-[#FF6B00] hover:text-[#EA580C] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all min-h-[46px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717] p-1 rounded-md"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-[#FF6B00] hover:bg-[#EA580C] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-brand flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 min-h-[48px]"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Authenticating...
                  </span>
                ) : (
                  <>
                    Sign In to Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secure Environment Badge */}
          <div className="mt-8 pt-6 border-t border-[#EAEAEA] flex items-center justify-center gap-2 text-xs font-semibold text-[#737373]">
            <ShieldCheck className="w-4 h-4 text-[#16A36A]" />
            <span>256-bit Encrypted Work Session</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (2-Factor Verification) */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
