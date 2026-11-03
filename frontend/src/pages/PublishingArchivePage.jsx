import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RecordPublicationModal } from '../components/publishing/RecordPublicationModal';
import {
  Share2,
  ExternalLink,
  Plus,
  Video,
  Clock,
  User,
  CheckCircle,
  Globe,
} from 'lucide-react';

export const PublishingArchivePage = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { user, isAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const url = selectedPlatform
        ? `/publishing?platform=${selectedPlatform}`
        : '/publishing';
      const res = await apiClient.get(url);
      if (res.success) {
        setPublications(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load published content archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, [selectedPlatform]);

  const canPublish = isAdmin || hasPermission('publishing.publish');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Distribution & Live Assets
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
              {publications.length} Live Publications
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Published Social Media Archive
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Central repository of all public marketing assets published across YouTube, Instagram, LinkedIn, and Facebook.
          </p>
        </div>

        {canPublish && (
          <div>
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              Record Live Post
            </button>
          </div>
        )}
      </div>

      {/* Platform Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'YOUTUBE', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'X_TWITTER', 'WEBSITE'].map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              selectedPlatform === p
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {p === '' ? 'All Platforms' : p}
          </button>
        ))}
      </div>

      {/* Publications Grid */}
      {loading ? (
        <div className="p-12">
          <LoadingSpinner text="Retrieving published content archive..." />
        </div>
      ) : publications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Publications Recorded</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            When SEO or Social Media managers record live published links, they will be archived here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publications.map((pub) => {
            const date = new Date(pub.published_at);

            return (
              <div
                key={pub.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                      {pub.course_code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                      {pub.platform}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2">
                    {pub.task_title}
                  </h3>

                  {pub.caption && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
                      "{pub.caption}"
                    </p>
                  )}

                  <div className="pt-1">
                    <a
                      href={pub.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors border border-emerald-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Live Post
                    </a>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-slate-600">
                    <User className="w-3 h-3 text-slate-400" />
                    {pub.publisher_name}
                  </span>
                  <span>
                    {date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Publication Modal */}
      {modalOpen && (
        <RecordPublicationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchPublications}
        />
      )}
    </div>
  );
};

