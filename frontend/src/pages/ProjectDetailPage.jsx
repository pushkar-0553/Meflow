import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  FileText,
  Video,
  HardDrive,
  Scissors,
  CheckCircle2,
  Image,
  Share2,
  History,
  ExternalLink,
  Send,
  Plus,
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProjectDetails = async () => {
    try {
      const [projRes, timelineRes] = await Promise.all([
        apiClient.get(`/projects/${id}`),
        apiClient.get(`/projects/${id}/timeline`),
      ]);

      if (projRes.success && projRes.data) {
        setProjectData(projRes.data);
      }
      if (timelineRes.success && timelineRes.data) {
        setTimeline(timelineRes.data);
      }
    } catch (err) {
      toast.error('Failed to load project workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  if (loading) {
    return <LoadingSpinner text="Synchronizing video project workspace..." />;
  }

  if (!projectData || !projectData.project) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
        <Film className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Video Project Not Found</h3>
        <button
          onClick={() => navigate('/drafts')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Drafts
        </button>
      </div>
    );
  }

  const { project, script, shoot, footage_handovers, editing, thumbnails, publications } = projectData;

  const isCreator = project.created_by === user?.id;
  const isManager = Boolean(
    isAdmin ||
    user?.role_code === 'DM_HEAD' ||
    user?.role_code === 'PRODUCTION_MGR'
  );

  const handleSubmitDraft = async () => {
    const confirmed = window.confirm('Submit this draft for content writing?');
    if (!confirmed) return;

    try {
      const res = await apiClient.post(`/projects/drafts/${project.id}/submit`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit draft.');
    }
  };

  const STAGES = [
    { key: 'DRAFT_PLANNING', label: '1. Draft' },
    { key: 'CONTENT_WRITING', label: '2. Script' },
    { key: 'CINEMATOGRAPHY', label: '3. Shoot' },
    { key: 'FOOTAGE_HANDOVER', label: '4. Handover' },
    { key: 'VIDEO_EDITING', label: '5. Editing' },
    { key: 'REVIEW_APPROVAL', label: '6. Review' },
    { key: 'THUMBNAIL_PREP', label: '7. Thumbnail' },
    { key: 'PUBLISHING', label: '8. Publish' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === project.current_stage);

  return (
    <div className="space-y-6">
      {/* Back Button & Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/drafts')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Video Drafts
        </button>

        <div className="flex items-center gap-2">
          {project.current_stage === 'DRAFT_PLANNING' && (isCreator || isManager) && (
            <button
              onClick={handleSubmitDraft}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Submit for Scripting
            </button>
          )}
        </div>
      </div>

      {/* Master Project Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {project.project_code}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                {project.course_name}
              </span>
              <StatusBadge status={project.priority} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{project.title}</h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              {project.description || 'No detailed brief added.'}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Current Production Stage:</span>
              <StatusBadge status={project.current_stage} />
            </div>
            <span className="text-[11px] text-slate-500">
              Conceived by <strong className="text-slate-700">{project.creator_name}</strong> on{' '}
              {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* 8-Stage Visual Pipeline Stepper */}
        <div className="pt-4 border-t border-slate-100">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
            {STAGES.map((stg, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div
                  key={stg.key}
                  className={`px-2 py-2 rounded-xl text-center border transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm shadow-blue-500/20'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold'
                      : 'bg-slate-50 text-slate-400 border-slate-200/60 font-medium'
                  }`}
                >
                  <span className="text-[10px] block truncate">{stg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-Consoles Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 overflow-x-auto no-scrollbar pb-px">
        {[
          { id: 'overview', label: '1. Overview & Brief', icon: Film },
          { id: 'script', label: '2. Script & Docs', icon: FileText },
          { id: 'shoot', label: '3. Shoot & Shots', icon: Video },
          { id: 'handover', label: '4. Footage Handover', icon: HardDrive },
          { id: 'editing', label: '5. Editing & Cuts', icon: Scissors },
          { id: 'thumbnail', label: '6. Thumbnail & SEO', icon: Image },
          { id: 'publishing', label: '7. Multi-Platform', icon: Share2 },
          { id: 'timeline', label: '8. Activity Timeline', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Console Content Area */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm min-h-[350px]">
        {/* TAB 1: OVERVIEW & BRIEF */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Production Planning Details</h3>
              <p className="text-xs text-slate-500">Core parameters established during draft conception.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Shoot Date</span>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {project.proposed_shoot_date ? project.proposed_shoot_date.slice(0, 10) : 'Not Scheduled'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled Time</span>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  {project.proposed_shoot_time ? project.proposed_shoot_time.slice(0, 5) : '09:30 AM'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Studio Location</span>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  {project.location_details} ({project.location_type})
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Anchor</span>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  {project.anchor_name || 'Not decided yet'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video Category</span>
                <p className="text-xs font-bold text-slate-900">{project.category}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Draft Status</span>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  {project.is_submitted_for_content ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Submitted to Scripting
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Draft In Planning (Creator Edit Only)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Video Description</span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {project.description || 'No detailed brief specified.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: SCRIPT & CONTENT */}
        {activeTab === 'script' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 2: Content Writing & Scripting</h3>
                <p className="text-xs text-slate-500">Google Docs script URL and content writer management.</p>
              </div>
              {script && (
                <div className="flex items-center gap-2">
                  <StatusBadge status={script.status} />
                </div>
              )}
            </div>

            {script && script.google_docs_url ? (
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Google Docs Master Script (v{script.script_version})</h4>
                      <p className="text-[11px] text-slate-500">Author: {script.writer_name || 'Assigned Writer'}</p>
                    </div>
                  </div>
                  <a
                    href={script.google_docs_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <span>Open in Google Docs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {script.content_notes && (
                  <div className="pt-2 border-t border-blue-200/40 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">Content Notes: </span>
                    {script.content_notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">
                  {project.is_submitted_for_content
                    ? 'Script Writing in Progress'
                    : 'Draft Not Yet Submitted for Scripting'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {project.is_submitted_for_content
                    ? 'Content writers can claim this project from Available Work to link their Google Docs script.'
                    : 'Submit the draft from the Overview tab to make it available to the content writing team.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SHOOT & SHOTS */}
        {activeTab === 'shoot' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 3: Cinematography & Shot Logging</h3>
                <p className="text-xs text-slate-500">Camera crew roster, shoot schedule, and scene-level clip logs.</p>
              </div>
              {shoot && <StatusBadge status={shoot.status} />}
            </div>

            {shoot ? (
              <div className="space-y-4">
                {/* Crew Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Cinematographer</span>
                    <span className="font-bold text-slate-800">{shoot.lead_cameraman_name || 'Unassigned'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Anchor</span>
                    <span className="font-bold text-slate-800">{shoot.confirmed_anchor_name || project.anchor_name || 'Unassigned'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Actual Shoot Date</span>
                    <span className="font-bold text-slate-800">{shoot.actual_shoot_date ? shoot.actual_shoot_date.slice(0, 10) : 'Pending'}</span>
                  </div>
                </div>

                {/* Scenes and Shots List */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900">Recorded Scenes & Shots</h4>
                  {!shoot.scenes || shoot.scenes.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      No scenes or shots logged yet. Cinematographers will log takes chronologically during production.
                    </div>
                  ) : (
                    shoot.scenes.map((scene) => (
                      <div key={scene.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-900">
                            Scene {scene.scene_number}: {scene.title}
                          </h5>
                          <span className="text-[10px] text-slate-500">{scene.shots?.length || 0} shots</span>
                        </div>
                        <div className="space-y-1">
                          {scene.shots?.map((sh) => (
                            <div
                              key={sh.id}
                              className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-slate-200/70 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600">Shot {sh.shot_number}:</span>
                                <span className="font-bold text-slate-800">{sh.clip_file_name}</span>
                                {sh.dialogue_reference && (
                                  <span className="text-slate-500 italic">"{sh.dialogue_reference}"</span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  sh.status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sh.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {sh.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                Cinematography workspace not initialized.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FOOTAGE HANDOVER */}
        {activeTab === 'handover' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 4: Physical Footage Handover</h3>
              <p className="text-xs text-slate-500">Storage media chip identifier, folder name, and editor confirmation.</p>
            </div>

            {!footage_handovers || footage_handovers.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <HardDrive className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">Awaiting Shoot Completion</p>
                <p>After shooting finishes, the camera crew logs the physical chip identifier and hands it over to editing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {footage_handovers.map((fh) => (
                  <div key={fh.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        {fh.storage_media_identifier}
                      </span>
                      <StatusBadge status={fh.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Folder Name</span>
                        <span className="font-bold text-slate-800">{fh.footage_folder_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Handed Over By</span>
                        <span className="font-bold text-slate-800">{fh.handed_over_by_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Received By</span>
                        <span className="font-bold text-slate-800">{fh.received_by_name || 'Pending Confirmation'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Storage URL / Path</span>
                        <span className="font-mono text-slate-700 truncate">{fh.footage_storage_url || 'Physical Media'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: EDITING & CUTS */}
        {activeTab === 'editing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 5: Video Editing & Versioning</h3>
                <p className="text-xs text-slate-500">First Cut, Rework, and Final Cut review links.</p>
              </div>
              {editing && <StatusBadge status={editing.status} />}
            </div>

            {editing && editing.versions && editing.versions.length > 0 ? (
              <div className="space-y-3">
                {editing.versions.map((ver) => (
                  <div key={ver.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          v{ver.version_number} ({ver.cut_type})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Submitted on {new Date(ver.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={ver.cut_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <span>Open Cut Link</span> <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    {ver.review_decision && (
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-700">Reviewer ({ver.reviewer_name}): </span>
                        <span className={ver.review_decision === 'APPROVED' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {ver.review_decision}
                        </span>
                        <p className="text-slate-600">{ver.review_comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <Scissors className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">Editing Queue</p>
                <p>Assigned editor: {editing?.editor_name || 'Pending assignment'}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: THUMBNAIL & SEO */}
        {activeTab === 'thumbnail' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 7: Thumbnail & Publishing Assets</h3>
              <p className="text-xs text-slate-500">High-CTR thumbnail graphics and metadata tags.</p>
            </div>

            {!thumbnails || thumbnails.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <Image className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No Thumbnails Uploaded Yet</p>
                <p>Designers can upload high-CTR thumbnails once final cut is approved.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {thumbnails.map((tn) => (
                  <div key={tn.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <img
                      src={tn.thumbnail_url}
                      alt="Thumbnail preview"
                      className="w-full h-40 object-cover rounded-xl border border-slate-200"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Version {tn.version_number}</span>
                      <StatusBadge status={tn.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: MULTI-PLATFORM PUBLISHING */}
        {activeTab === 'publishing' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 8: Multi-Platform Publishing</h3>
              <p className="text-xs text-slate-500">Independent live URLs for Instagram, Facebook, and YouTube.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['YOUTUBE', 'INSTAGRAM', 'FACEBOOK'].map((platform) => {
                const pubRecord = publications?.find((p) => p.platform === platform);

                return (
                  <div key={platform} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{platform}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          pubRecord?.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}
                      >
                        {pubRecord?.status || 'PENDING'}
                      </span>
                    </div>

                    {pubRecord?.post_url ? (
                      <div className="space-y-1">
                        <a
                          href={pubRecord.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{pubRecord.post_url}</span>
                        </a>
                        <span className="text-[10px] text-slate-400 block">
                          Published on {new Date(pubRecord.published_at).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Not published on this platform yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 8: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Complete Video Lifecycle Timeline</h3>
              <p className="text-xs text-slate-500">Immutable chronological activity stream across all 8 stages.</p>
            </div>

            {timeline.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                No activity records found.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 ml-3">
                {timeline.map((event) => (
                  <div key={event.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{event.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Executed by <strong className="text-slate-800">{event.actor_name}</strong> ({event.actor_role_name || 'Staff'})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
