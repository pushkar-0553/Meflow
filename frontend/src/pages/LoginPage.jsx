import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role?.is_system_admin || loggedUser.role?.code === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl shadow-lg shadow-blue-500/30 mb-4">
            V
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">VCube MeFlow</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Digital Marketing Operations & Production HRMS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@vcube.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
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
        </form>

        {/* Quick Demo Credentials for Fast Local Verification */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Default System Accounts</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleFillDemo('admin@vcube.com', 'Admin@12345')}
              className="text-left text-xs bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-colors flex justify-between items-center"
            >
              <div>
                <span className="font-bold text-slate-800">Administrator</span>
                <span className="text-slate-500 ml-1.5">(admin@vcube.com)</span>
              </div>
              <span className="text-blue-600 font-bold text-[11px]">Auto Fill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
