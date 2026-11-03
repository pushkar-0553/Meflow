import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ScrollText,
  Search,
  Filter,
  User,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Code,
  X,
  FileText,
} from 'lucide-react';

export const AuditLedgerPage = () => {
  const [logs, setLogs] = useState([]);
  const [actionsCatalog, setActionsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [inspectMetadata, setInspectMetadata] = useState(null);
  const toast = useToast();

  const fetchCatalog = async () => {
    try {
      const res = await apiClient.get('/audit/actions-catalog');
      if (res.success && res.data) {
        setActionsCatalog(res.data.actions || []);
      }
    } catch (err) {
      console.warn('Failed to load actions catalog:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (selectedAction) params.append('action', selectedAction);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient.get(`/audit?${params.toString()}`);
      if (res.success) {
        setLogs(res.data || []);
        setMeta(res.meta || null);
      }
    } catch (err) {
      toast.error('Failed to load audit ledger records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, selectedAction]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadge = (action) => {
    if (action.includes('SUBMIT') || action.includes('GATE')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (action.includes('COMPLETE') || action.includes('APPROV')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('REJECT') || action.includes('CHANGES') || action.includes('ROLLBACK')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('PROOF') || action.includes('UPLOAD')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Governance & Traceability
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {meta?.totalCount || 0} Immutable Entries
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            System Activity & Audit Ledger
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Complete tamper-resistant activity ledger tracking logins, role modifications, stage transitions, reviews, and asset submissions.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, employee name, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 w-full md:w-56"
          >
            <option value="">All Action Types</option>
            {actionsCatalog.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner text="Reading immutable security audit entries..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No Activity Logs Found</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Try widening your search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => {
                  const date = new Date(log.created_at);
                  const isSystem = !log.actor_name;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {date.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isSystem ? (
                          <span className="font-bold text-slate-400 italic">SYSTEM ENGINE</span>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900">{log.actor_name}</div>
                            <div className="text-[10px] text-slate-400">{log.actor_role_name}</div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-bold">{log.entity}</span>
                        <span className="text-[10px] text-slate-400 ml-1">#{log.entity_id}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ip_address || 'Internal'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {log.metadata ? (
                          <button
                            onClick={() => setInspectMetadata({ ...log, parsed: log.metadata })}
                            className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 border border-slate-200 shadow-2xs"
                          >
                            <Code className="w-3 h-3" />
                            Data
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Page {meta.page} of {meta.totalPages} ({meta.totalCount} total events)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Inspector Modal */}
      {inspectMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Metadata: {inspectMetadata.action}
                </h3>
              </div>
              <button
                onClick={() => setInspectMetadata(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 overflow-y-auto">
              <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                {typeof inspectMetadata.parsed === 'string'
                  ? JSON.stringify(JSON.parse(inspectMetadata.parsed), null, 2)
                  : JSON.stringify(inspectMetadata.parsed, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
