import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [invitee, setInvitee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await apiClient.get(`/auth/verify-invite?token=${token}`);
        if (res.success) {
          setTokenValid(true);
          setInvitee(res.data?.user || null);
        } else {
          setTokenValid(false);
        }
      } catch {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/auth/complete-invite', {
        token,
        password,
      });

      if (res.success) {
        toast.success('Password created successfully! Please sign in.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to set password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-4">
        <LoadingSpinner text="Validating invitation credentials..." />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-[#EAEAEA]">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-[#171717]">Invalid or Expired Link</h2>
          <p className="text-xs text-[#737373] mt-2 leading-relaxed">
            This onboarding invitation link has expired or has already been used. Please contact your administrator to request a new link.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 px-6 py-3 bg-[#171717] text-white rounded-xl text-xs font-bold hover:bg-[#242424] transition-colors"
          >
            Return to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-[#EAEAEA]">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="VCUBE MediaFlow" className="h-10 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-[#171717]">Complete Your Onboarding</h1>
          {invitee && (
            <p className="text-xs text-[#737373] mt-1">
              Welcome, <strong className="text-[#171717]">{invitee.name}</strong> ({invitee.role_name})
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#242424] mb-1.5 text-left">
              Choose Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                className="w-full px-4 py-3 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#242424] mb-1.5 text-left">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type password"
              required
              className="w-full px-4 py-3 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-brand flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[48px]"
          >
            {submitting ? 'Setting Password...' : 'Save Password & Enter Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};
