import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { CreateDraftModal } from '../components/projects/CreateDraftModal';
import { EditDraftModal } from '../components/projects/EditDraftModal';
import {
  Film,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowRight,
  Send,
  Edit2,
  Lock,
  Layers,
  Sparkles,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const DraftsPage = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [drafts, setDrafts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDraftForEdit, setSelectedDraftForEdit] = useState(null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const params = { tab: activeTab };
      if (search.trim()) params.search = search.trim();
      if (selectedCourse) params.course_id = selectedCourse;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedPriority) params.priority = selectedPriority;

      const [draftsRes, coursesRes] = await Promise.all([
        apiClient.get('/projects/drafts', { params }),
        apiClient.get('/courses'),
      ]);

      if (draftsRes.success) setDrafts(draftsRes.data || []);
      if (coursesRes.success) setCourses(coursesRes.data || []);
    } catch (err) {
      toast.error('Failed to load video drafts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [activeTab, selectedCourse, selectedCategory, selectedPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDrafts();
  };

  const handleSubmitForContent = async (draft) => {
    const confirmed = window.confirm(
      `Submit draft '${draft.title}' for content writing? This will unlock the scriptwriting pool for writers.`
    );
    if (!confirmed) return;

    try {
      const res = await apiClient.post(`/projects/drafts/${draft.id}/submit`);
      if (res.success) {
        toast.success(res.message);
        fetchDrafts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit draft.');
    }
  };

  const isManager = Boolean(
    isAdmin ||
    user?.role_code === 'DM_HEAD' ||
    user?.role_code === 'PRODUCTION_MGR'
  );

  const tabs = [
    { id: 'all', label: 'All Drafts' },
    { id: 'my_drafts', label: 'My Drafts' },
    { id: 'upcoming_shoots', label: 'Upcoming Shoots' },
    { id: 'pending_content', label: 'Pending Content' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'published', label: 'Published' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Video Production Drafts</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              Stage 1 Shared Workspace
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse all shared team concepts, plan shoot dates, and conceive new video projects.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Conceive Video Draft</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 overflow-x-auto no-scrollbar pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, project code, course or creator..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Course filter */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="PROJECT_EXPLANATION">Project Explanation</option>
            <option value="COURSE_PROMO">Course Promo</option>
            <option value="REEL_SHORT">Reel Short</option>
            <option value="STUDENT_SUCCESS_STORY">Success Story</option>
            <option value="WEBINAR_TEASER">Webinar Teaser</option>
            <option value="EVENT_COVERAGE">Event Coverage</option>
            <option value="TUTORIAL_CONCEPT">Tutorial Concept</option>
            <option value="FACULTY_INSIGHT">Faculty Insight</option>
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent ⚡</option>
          </select>

          {(search || selectedCourse || selectedCategory || selectedPriority) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCourse('');
                setSelectedCategory('');
                setSelectedPriority('');
              }}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner text="Synchronizing video drafts catalog..." />
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Video Drafts in this View</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by conceiving a new video draft for upcoming course campaigns and projects.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Conceive First Draft
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drafts.map((draft) => {
            const isCreator = draft.created_by === user?.id;
            const canEdit = isCreator || isManager;
            const isSubmitted = draft.is_submitted_for_content;

            return (
              <div
                key={draft.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-[10px] tracking-wide uppercase">
                      {draft.course_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={draft.priority} />
                      <StatusBadge status={draft.current_stage} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">
                      {draft.project_code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {draft.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {draft.description || 'No detailed brief added.'}
                    </p>
                  </div>

                  {/* Shoot and location details */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{draft.proposed_shoot_date ? draft.proposed_shoot_date.slice(0, 10) : 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{draft.proposed_shoot_time ? draft.proposed_shoot_time.slice(0, 5) : '09:30'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{draft.location_details || 'Studio'}</span>
                    </div>
                  </div>

                  {/* Creator and Anchor tags */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-700">{draft.creator_name}</span>
                      {isCreator && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                          You
                        </span>
                      )}
                    </div>
                    {draft.anchor_name && (
                      <span className="text-[10px] text-slate-400">Anchor: {draft.anchor_name}</span>
                    )}
                  </div>
                </div>

                {/* Card Footer / Action Bar */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Edit Draft Button */}
                    {canEdit ? (
                      <button
                        onClick={() => {
                          setSelectedDraftForEdit(draft);
                          setEditModalOpen(true);
                        }}
                        disabled={isSubmitted && !isManager}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-40"
                        title={isSubmitted && !isManager ? 'Draft locked after submission' : 'Edit Draft'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span title="Read-only: Only creator can edit">
                        <Lock className="w-3.5 h-3.5 text-slate-300" />
                      </span>
                    )}

                    {/* Submit for content button */}
                    {!isSubmitted && canEdit && (
                      <button
                        onClick={() => handleSubmitForContent(draft)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Submit for Script</span>
                      </button>
                    )}

                    {isSubmitted && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Scripting Active
                      </span>
                    )}
                  </div>

                  {/* Open Project Workspace */}
                  <button
                    onClick={() => navigate(`/projects/${draft.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <span>Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Draft Modal */}
      {createModalOpen && (
        <CreateDraftModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => fetchDrafts()}
        />
      )}

      {/* Edit Draft Modal */}
      {editModalOpen && selectedDraftForEdit && (
        <EditDraftModal
          isOpen={editModalOpen}
          draft={selectedDraftForEdit}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedDraftForEdit(null);
          }}
          onSuccess={() => fetchDrafts()}
        />
      )}
    </div>
  );
};

