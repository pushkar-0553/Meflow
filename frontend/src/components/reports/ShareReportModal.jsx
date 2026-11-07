import React, { useState } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Share2,
  Copy,
  Check,
  Calendar,
  Shield,
  Phone,
  Clock,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const ShareReportModal = ({
  isOpen,
  onClose,
  reportType = 'DAILY',
  reportConfig = {},
  reportTitle = 'Production Report',
}) => {
  const toast = useToast();
  const [reportName, setReportName] = useState(reportTitle);
  const [accessMode, setAccessMode] = useState('PUBLIC_LINK');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [includeContacts, setIncludeContacts] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post('/reports/share', {
        report_name: reportName.trim() || reportTitle,
        report_type: reportType,
        report_configuration: reportConfig,
        access_mode: accessMode,
        include_contact_details: includeContacts,
        expires_in_days: parseInt(expiresInDays, 10),
      });

      if (res.success && res.data) {
        const fullUrl = `${window.location.origin}/shared-report/${res.data.shareToken}`;
        setGeneratedLink({
          ...res.data,
          fullUrl,
        });
        toast.success('Live report link generated! Opening it always shows the latest data.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate share link.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink?.fullUrl) return;
    try {
      await navigator.clipboard.writeText(generatedLink.fullUrl);
      setCopied(true);
      toast.success('Shareable link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-neutral-900 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black">Share Live Dynamic Report</h3>
              <p className="text-[11px] text-neutral-300">
                Recipients always see up-to-date data when opening or refreshing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {generatedLink ? (
            /* Generated Link Result View */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-vcube-orange flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Live Dynamic Report URL
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink.fullUrl}
                    className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-2 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Report Type:</span>
                  <strong className="text-slate-800">{reportType} Report</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Access Mode:</span>
                  <strong className="text-slate-800">
                    {accessMode === 'PUBLIC_LINK' ? 'Secret Link (Anyone with URL)' : 'Sign-in Required'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Expires:</span>
                  <strong className="text-slate-800">
                    {generatedLink.expiresAt
                      ? new Date(generatedLink.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Contact Details:</span>
                  <strong className="text-slate-800">
                    {includeContacts ? 'Visible (Phone & Email)' : 'Hidden (Privacy Protected)'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={generatedLink.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Open Shared View
                </a>
                <button
                  onClick={() => setGeneratedLink(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Configure Another
                </button>
              </div>
            </div>
          ) : (
            /* Link Generation Form */
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g. Daily Production Status - Today"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Access Authorization</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessMode('PUBLIC_LINK')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      accessMode === 'PUBLIC_LINK'
                        ? 'bg-orange-50/70 border-orange-300 text-slate-900 ring-1 ring-orange-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-vcube-orange" />
                      Secret Link
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Anyone with the unguessable link can view
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessMode('AUTHENTICATED')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      accessMode === 'AUTHENTICATED'
                        ? 'bg-orange-50/70 border-orange-300 text-slate-900 ring-1 ring-orange-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-vcube-orange" />
                      Sign-in Required
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Only authorized logged-in employees
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Expiry</label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 cursor-pointer"
                  >
                    <option value="1">Expires in 24 Hours</option>
                    <option value="7">Expires in 7 Days</option>
                    <option value="30">Expires in 30 Days</option>
                    <option value="0">Never Expires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Details</label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeContacts}
                      onChange={(e) => setIncludeContacts(e.target.checked)}
                      className="w-4 h-4 text-vcube-orange rounded focus:ring-orange-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Include phone numbers</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{loading ? 'Generating Dynamic Link...' : 'Generate Shareable Link'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

