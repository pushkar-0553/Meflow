import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  X,
  Mail,
  Phone,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
  const toast = useToast();

  // Recovery steps: 'VERIFY_ACCOUNT' | 'VERIFY_OTP' | 'SET_PASSWORD' | 'SUCCESS'
  const [step, setStep] = useState('VERIFY_ACCOUNT');

  // Step 1: Account identification
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Step 2: 6-digit OTP
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: Password Reset
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & error feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Countdown timer for 5-minute OTP expiry
  useEffect(() => {
    let timer;
    if (step === 'VERIFY_OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Resend cooldown timer (45 seconds)
  useEffect(() => {
    let cooldownTimer;
    if (resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('VERIFY_ACCOUNT');
    setPhone('');
    setOtpDigits(['', '', '', '', '', '']);
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setLoading(false);
    onClose();
  };

  // STEP 1: Account Verification (Email + Phone)
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !phone.trim()) {
      setErrorMsg('Please enter both your registered email and phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', {
        email: email.trim(),
        phone: phone.trim(),
      });

      if (res.success) {
        setMaskedEmail(res.data?.maskedEmail || email);
        setStep('VERIFY_OTP');
        setCountdown(300);
        setCanResend(false);
        setResendCooldown(45);
        toast.success('Verification code dispatched to your registered email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Account verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Handle OTP input & auto-focus
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setErrorMsg('');

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.post('/auth/verify-reset-otp', {
        email: email.trim(),
        otp,
      });

      if (res.success && res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setStep('SET_PASSWORD');
        toast.success('Code verified. Please set your new password.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend && resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.post('/auth/resend-reset-otp', { email: email.trim() });
      if (res.success) {
        setCountdown(300);
        setCanResend(false);
        setResendCooldown(45);
        toast.info('A new verification code has been dispatched.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Password Strength Evaluation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isMatch = password && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && isMatch;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isPasswordValid) {
      setErrorMsg('Please ensure all password security requirements are fulfilled.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        token: resetToken,
        password,
      });

      if (res.success) {
        setStep('SUCCESS');
        toast.success('Password updated successfully!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EAEAEA] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA] bg-[#F8F8F7]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#171717]">Account Recovery</h2>
              <p className="text-[11px] font-medium text-[#737373]">2-Factor Secure Verification</p>
            </div>
          </div>
          <button
            onClick={resetState}
            className="p-1.5 text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#EAEAEA]/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: VERIFY ACCOUNT */}
          {step === 'VERIFY_ACCOUNT' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="text-left mb-2">
                <h3 className="text-base font-bold text-[#171717]">Verify Your Identity</h3>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                  Enter your registered work email and phone number. An OTP verification code will be sent to your registered email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5">
                  Registered Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@vcube.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5">
                  Registered Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or +91..."
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#737373] mt-1">
                  Used solely for identity cross-verification. OTP is sent to your email.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-brand flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[46px]"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Verifying...
                    </span>
                  ) : (
                    <>
                      Verify Account & Send Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === 'VERIFY_OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-left mb-2">
                <button
                  type="button"
                  onClick={() => setStep('VERIFY_ACCOUNT')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#737373] hover:text-[#171717] mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h3 className="text-base font-bold text-[#171717]">Enter Verification Code</h3>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                  We sent a 6-digit code to <strong className="text-[#171717]">{maskedEmail}</strong>.
                </p>
              </div>

              {/* 6 Individual Inputs */}
              <div>
                <label className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-2 text-center">
                  6-Digit OTP Code
                </label>
                <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                      className="w-11 h-13 text-center text-xl font-bold bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <div className="flex items-center gap-1.5 text-[#737373]">
                  <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Expires in: <strong>{formatTimer(countdown)}</strong></span>
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend && resendCooldown > 0}
                  className="font-bold text-[#FF6B00] hover:text-[#EA580C] disabled:text-[#737373] disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-brand flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[46px]"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Validating Code...
                    </span>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === 'SET_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-left mb-2">
                <h3 className="text-base font-bold text-[#171717]">Create New Password</h3>
                <p className="text-xs text-[#737373] mt-1">
                  Choose a secure password for your VCUBE MediaFlow account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
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
                <label className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F8F8F7] border border-[#EAEAEA] rounded-xl text-sm font-medium text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Checklist Requirements */}
              <div className="p-3 bg-[#F8F8F7] rounded-xl border border-[#EAEAEA] text-[11px] space-y-1 text-left">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#16A36A] font-bold' : 'text-[#737373]'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Minimum 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-[#16A36A] font-bold' : 'text-[#737373]'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uppercase & lowercase letters
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber && hasSpecial ? 'text-[#16A36A] font-bold' : 'text-[#737373]'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> At least one number & special character
                </div>
                <div className={`flex items-center gap-1.5 ${isMatch && password ? 'text-[#16A36A] font-bold' : 'text-[#737373]'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !isPasswordValid}
                  className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-brand flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[46px]"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Updating Password...
                    </span>
                  ) : (
                    <>
                      Save New Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-[#16A36A]/10 text-[#16A36A] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#171717]">Password Changed!</h3>
                <p className="text-xs text-[#737373] mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Your password has been changed successfully. You can now sign in with your new credentials.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetState}
                  className="w-full py-3 px-4 bg-[#171717] hover:bg-[#242424] text-white font-bold text-sm rounded-xl shadow-md transition-all min-h-[46px]"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

