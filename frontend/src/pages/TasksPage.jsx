import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import {
  Layers,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Video,
  Scissors,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedCourse) params.course_code = selectedCourse;
      if (selectedStatus) params.status = selectedStatus;

      const res = await apiClient.get('/tasks', { params });
      if (res.success) {
        setTasks(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load production tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [searchTerm, selectedCourse, selectedStatus]);

  const handleCancelTask = async (taskId, taskTitle) => {
    const confirmed = window.confirm(`Are you sure you want to cancel '${taskTitle}'?`);
    if (!confirmed) return;

    try {
      const res = await apiClient.post(`/tasks/${taskId}/cancel`);
      if (res.success) {
        toast.info(res.message);
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel task.');
    }
  };

  const courses = ['ITNIK', 'FULLSTACK', 'DEVOPS', 'DATA_SCIENCE', 'TESTING'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Content Production Orchestration
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {tasks.length} Active Tasks
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Production Tasks & Pipeline
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Conceive video tasks, monitor stage unlocks, inspect review cut submissions, and track publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Production Task
          </button>
        </div>
      </div>

      {/* Course Filter Pills & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by task title, course or notes..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setSelectedCourse('')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              !selectedCourse
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Courses
          </button>
          {courses.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCourse(c)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                selectedCourse === c
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="p-12">
          <LoadingSpinner text="Loading production tasks..." />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Production Tasks Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by creating your first promotional video or reel task to initialize the production pipeline.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Create First Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row: Course & Priority */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-100/80 text-blue-800 text-[11px] font-extrabold uppercase tracking-wide">
                    {task.course_code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                  {task.title}
                </h3>

                {/* Metadata details */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-500 font-medium">
                  {task.scheduled_start && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {new Date(task.scheduled_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{task.location || 'Studio Set'}</span>
                  </div>
                </div>

                {/* Current Active Pipeline Stage */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Stage
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {task.completed_stages || 0} / {task.total_stages || 6} Done
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-800">
                      {task.active_stage_type || 'COMPLETED'}
                    </span>
                    {task.active_stage_status && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        {task.active_stage_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleCancelTask(task.id, task.title)}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors font-medium"
                >
                  Cancel Task
                </button>

                <button
                  onClick={() => navigate(`/admin/tasks/${task.id}`)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>View Pipeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTaskCreated={() => fetchTasks()}
      />
    </div>
  );
};

