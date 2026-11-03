import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      } catch (err) {
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <LoadingSpinner text="Validating invitation credentials..." />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invalid or Expired Invitation</h2>
          <p className="text-sm text-slate-500 mt-2">
            This invitation link has expired or has already been used. Please ask your administrator to send a new invitation.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Onboarding</h1>
          {invitee && (
            <p className="text-sm text-slate-500 mt-1">
              Welcome, <strong className="text-slate-800">{invitee.name}</strong> ({invitee.role_name})
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Choose Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type password"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? 'Setting Password...' : 'Save Password & Enter Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};
