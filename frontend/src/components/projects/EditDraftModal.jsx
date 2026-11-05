import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { X, Edit3, Calendar, Clock, MapPin, User } from 'lucide-react';

export const EditDraftModal = ({ isOpen, draft, onClose, onSuccess }) => {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [category, setCategory] = useState('PROJECT_EXPLANATION');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [proposedShootDate, setProposedShootDate] = useState('');
  const [proposedShootTime, setProposedShootTime] = useState('09:30');
  const [locationType, setLocationType] = useState('STUDIO');
  const [locationDetails, setLocationDetails] = useState('VCube Studio Main Floor');
  const [tentativeAnchorId, setTentativeAnchorId] = useState('');

  useEffect(() => {
    if (!isOpen || !draft) return;

    setTitle(draft.title || '');
    setCourseId(draft.course_id || '');
    setCategory(draft.category || 'PROJECT_EXPLANATION');
    setDescription(draft.description || '');
    setPriority(draft.priority || 'MEDIUM');
    setProposedShootDate(draft.proposed_shoot_date ? draft.proposed_shoot_date.slice(0, 10) : '');
    setProposedShootTime(draft.proposed_shoot_time ? draft.proposed_shoot_time.slice(0, 5) : '09:30');
    setLocationType(draft.location_type || 'STUDIO');
    setLocationDetails(draft.location_details || 'VCube Studio Main Floor');
    setTentativeAnchorId(draft.tentative_anchor_id || '');

    const loadFormData = async () => {
      try {
        const [coursesRes, usersRes] = await Promise.all([
          apiClient.get('/courses'),
          apiClient.get('/users?status=ACTIVE'),
        ]);

        if (coursesRes.success && coursesRes.data) {
          setCourses(coursesRes.data);
        }

        if (usersRes.success && usersRes.data) {
          setUsers(usersRes.data);
        }
      } catch (err) {
        toast.error('Failed to load form options.');
      }
    };

    loadFormData();
  }, [isOpen, draft]);

  if (!isOpen || !draft) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !courseId) {
      toast.error('Please enter a video title and choose a course.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.put(`/projects/drafts/${draft.id}`, {
        title: title.trim(),
        course_id: parseInt(courseId, 10),
        category,
        description: description.trim() || null,
        priority,
        proposed_shoot_date: proposedShootDate || null,
        proposed_shoot_time: proposedShootTime || null,
        location_type: locationType,
        location_details: locationDetails.trim(),
        tentative_anchor_id: tentativeAnchorId ? parseInt(tentativeAnchorId, 10) : null,
      });

      if (res.success) {
        toast.success(`Video Draft updated successfully!`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update video draft.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Video Draft</h2>
              <p className="text-xs text-slate-500">{draft.project_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Video Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Course / Campaign *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Video Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="PROJECT_EXPLANATION">Project Explanation</option>
                <option value="COURSE_PROMO">Course Promo</option>
                <option value="REEL_SHORT">Reel / YouTube Short</option>
                <option value="STUDENT_SUCCESS_STORY">Student Success Story</option>
                <option value="WEBINAR_TEASER">Webinar Teaser</option>
                <option value="EVENT_COVERAGE">Event Coverage</option>
                <option value="TUTORIAL_CONCEPT">Tutorial Concept</option>
                <option value="FACULTY_INSIGHT">Faculty Insight</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Shoot Date
              </label>
              <input
                type="date"
                value={proposedShootDate}
                onChange={(e) => setProposedShootDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Shoot Time
              </label>
              <input
                type="time"
                value={proposedShootTime}
                onChange={(e) => setProposedShootTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent ⚡</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location Details
              </label>
              <div className="flex gap-2">
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium shrink-0"
                >
                  <option value="STUDIO">Studio</option>
                  <option value="EXTERNAL">External</option>
                </select>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> Tentative Anchor
              </label>
              <select
                value={tentativeAnchorId}
                onChange={(e) => setTentativeAnchorId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="">Not decided yet</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Video Description & Brief
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

