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
  Trash2,
  Edit3,
  UploadCloud,
  CheckSquare,
  Sparkles,
  Phone,
  PhoneOff,
  Mail,
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);

  // Stage 2 Script Workspace states
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');
  const [scriptVersion, setScriptVersion] = useState(1);
  const [scriptNotes, setScriptNotes] = useState('');
  const [reviewComments, setReviewComments] = useState('');

  // Stage 3 Shoot Workspace states
  const [shootDate, setShootDate] = useState('');
  const [shootStartTime, setShootStartTime] = useState('');
  const [shootEndTime, setShootEndTime] = useState('');
  const [studioDetails, setStudioDetails] = useState('');
  const [cameraGearNotes, setCameraGearNotes] = useState('');
  const [shootNotes, setShootNotes] = useState('');

  // Crew & Scene modals
  const [showAddCrewModal, setShowAddCrewModal] = useState(false);
  const [newCrewUserId, setNewCrewUserId] = useState('');
  const [newCrewRole, setNewCrewRole] = useState('SECOND_CAMERA');

  const [showAddSceneModal, setShowAddSceneModal] = useState(false);
  const [newSceneNumber, setNewSceneNumber] = useState(1);
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newSceneDesc, setNewSceneDesc] = useState('');

  const [activeSceneForShot, setActiveSceneForShot] = useState(null);
  const [newShotNumber, setNewShotNumber] = useState(1);
  const [newClipName, setNewClipName] = useState('');
  const [newDialogueRef, setNewDialogueRef] = useState('');
  const [newTakeNumber, setNewTakeNumber] = useState(1);
  const [newShotStatus, setNewShotStatus] = useState('CONFIRMED');
  const [newShotNotes, setNewShotNotes] = useState('');

  // Stage 4 Footage Handover states
  const [mediaChipId, setMediaChipId] = useState('');
  const [footageFolder, setFootageFolder] = useState('');
  const [footageStorageUrl, setFootageStorageUrl] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Stage 5 & 6 Editing Workspace states
  const [cutType, setCutType] = useState('FIRST_CUT');
  const [cutVideoUrl, setCutVideoUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [editorCutNotes, setEditorCutNotes] = useState('');
  const [selectedVersionForReview, setSelectedVersionForReview] = useState(null);
  const [versionReviewDecision, setVersionReviewDecision] = useState('APPROVED');
  const [versionReviewComments, setVersionReviewComments] = useState('');
  const [versionReworkNotes, setVersionReworkNotes] = useState('');

  // Stage 7 Thumbnail states
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailNotes, setThumbnailNotes] = useState('');
  const [selectedThumbnailForReview, setSelectedThumbnailForReview] = useState(null);
  const [thumbReviewFeedback, setThumbReviewFeedback] = useState('');

  // Stage 8 Publishing states
  const [pubPlatform, setPubPlatform] = useState('YOUTUBE');
  const [postUrl, setPostUrl] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [proofScreenshotUrl, setProofScreenshotUrl] = useState('');
  const [pubNotes, setPubNotes] = useState('');

  const fetchProjectDetails = async () => {
    try {
      const [projRes, timelineRes, usersRes] = await Promise.all([
        apiClient.get(`/projects/${id}`),
        apiClient.get(`/projects/${id}/timeline`),
        apiClient.get('/users?status=ACTIVE'),
      ]);

      if (projRes.success && projRes.data) {
        setProjectData(projRes.data);
        const { project, script, shoot, footage_handovers } = projRes.data;

        if (script) {
          setGoogleDocsUrl(script.google_docs_url || '');
          setScriptVersion(script.script_version || 1);
          setScriptNotes(script.content_notes || '');
        }

        if (shoot) {
          setShootDate(shoot.actual_shoot_date ? shoot.actual_shoot_date.slice(0, 10) : '');
          setShootStartTime(shoot.actual_start_time ? shoot.actual_start_time.slice(0, 5) : '');
          setShootEndTime(shoot.actual_end_time ? shoot.actual_end_time.slice(0, 5) : '');
          setStudioDetails(shoot.studio_details || '');
          setCameraGearNotes(shoot.camera_gear_notes || '');
          setShootNotes(shoot.shoot_notes || '');
        }

        if (footage_handovers && footage_handovers.length > 0) {
          const latestHandover = footage_handovers[0];
          setMediaChipId(latestHandover.storage_media_identifier || '');
          setFootageFolder(latestHandover.footage_folder_name || '');
          setFootageStorageUrl(latestHandover.footage_storage_url || '');
          setHandoverNotes(latestHandover.notes || '');
        }
      }

      if (timelineRes.success && timelineRes.data) {
        setTimeline(timelineRes.data);
      }

      if (usersRes.success && usersRes.data) {
        setUsersList(usersRes.data);
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

  // STAGE 1: SUBMIT DRAFT
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

  // STAGE 2: SCRIPT ACTIONS
  const handleAcceptScriptWork = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/content/${project.id}/accept`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to claim scriptwriting.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveScriptDoc = async (e) => {
    e.preventDefault();
    if (!googleDocsUrl.trim()) {
      toast.error('Please enter a valid Google Docs URL.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.put(`/content/${project.id}/script`, {
        google_docs_url: googleDocsUrl.trim(),
        script_version: parseInt(scriptVersion, 10) || 1,
        content_notes: scriptNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save Google Docs link.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitScriptForApproval = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/content/${project.id}/submit`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit script for review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewScriptDecision = async (decision) => {
    if (!reviewComments.trim()) {
      toast.error('Please enter review feedback notes before submitting decision.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/content/${project.id}/review`, {
        decision,
        comments: reviewComments.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setReviewComments('');
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record script decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // STAGE 3: SHOOT ACTIONS
  const handleAcceptShoot = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/shoots/${project.id}/accept`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to claim shoot.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartShoot = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/shoots/${project.id}/start`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start shoot.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateShootDetails = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await apiClient.put(`/shoots/${project.id}/details`, {
        actual_shoot_date: shootDate || null,
        actual_start_time: shootStartTime || null,
        actual_end_time: shootEndTime || null,
        studio_details: studioDetails || null,
        camera_gear_notes: cameraGearNotes || null,
        shoot_notes: shootNotes || null,
      });
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update shoot parameters.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!newCrewUserId) {
      toast.error('Select a team member to assign.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/shoots/${shoot.id}/team`, {
        user_id: parseInt(newCrewUserId, 10),
        team_role: newCrewRole,
      });
      if (res.success) {
        toast.success(res.message);
        setShowAddCrewModal(false);
        setNewCrewUserId('');
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add crew member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    try {
      const res = await apiClient.delete(`/shoots/${shoot.id}/team/${memberId}`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove crew member.');
    }
  };

  const handleAddScene = async (e) => {
    e.preventDefault();
    if (!newSceneTitle.trim()) {
      toast.error('Scene title is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/shoots/${shoot.id}/scenes`, {
        scene_number: parseInt(newSceneNumber, 10) || 1,
        title: newSceneTitle.trim(),
        description: newSceneDesc.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        setShowAddSceneModal(false);
        setNewSceneTitle('');
        setNewSceneDesc('');
        setNewSceneNumber((prev) => prev + 1);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add scene.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogShot = async (e) => {
    e.preventDefault();
    if (!newClipName.trim() || !activeSceneForShot) {
      toast.error('Clip filename is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/shoots/scenes/${activeSceneForShot.id}/shots`, {
        shot_number: parseInt(newShotNumber, 10) || 1,
        clip_file_name: newClipName.trim(),
        dialogue_reference: newDialogueRef.trim() || null,
        take_number: parseInt(newTakeNumber, 10) || 1,
        status: newShotStatus,
        notes: newShotNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        setActiveSceneForShot(null);
        setNewClipName('');
        setNewDialogueRef('');
        setNewShotNotes('');
        setNewShotNumber((prev) => prev + 1);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to log shot.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleShotStatus = async (shotId, currentStatus) => {
    const cycle = {
      RECORDED: 'CONFIRMED',
      CONFIRMED: 'REJECTED',
      REJECTED: 'RETAKE_REQUIRED',
      RETAKE_REQUIRED: 'RECORDED',
      UNUSABLE: 'CONFIRMED',
    };
    const nextStatus = cycle[currentStatus] || 'CONFIRMED';

    try {
      const res = await apiClient.patch(`/shoots/shots/${shotId}/status`, {
        status: nextStatus,
      });
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update shot status.');
    }
  };

  const handleDeleteShot = async (shotId) => {
    if (!window.confirm('Delete this shot entry?')) return;
    try {
      const res = await apiClient.delete(`/shoots/shots/${shotId}`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete shot.');
    }
  };

  const handleCompleteShoot = async () => {
    if (!window.confirm('Mark shoot as completed and advance to Stage 4: Footage Handover?')) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/shoots/${project.id}/complete`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
        setActiveTab('handover');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete shoot.');
    } finally {
      setActionLoading(false);
    }
  };

  // STAGE 4: FOOTAGE HANDOVER ACTIONS
  const handleRecordHandover = async (e) => {
    e.preventDefault();
    if (!mediaChipId.trim() || !footageFolder.trim()) {
      toast.error('Media chip identifier and folder name are required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/footage/${project.id}/handover`, {
        storage_media_identifier: mediaChipId.trim(),
        footage_folder_name: footageFolder.trim(),
        footage_storage_url: footageStorageUrl.trim() || null,
        notes: handoverNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record footage handover.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/footage/${project.id}/receive`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to confirm receipt.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCopied = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/footage/${project.id}/copied`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark footage copied.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReadyForEditing = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/footage/${project.id}/ready`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
        setActiveTab('editing');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to advance to video editing.');
    } finally {
      setActionLoading(false);
    }
  };

  // STAGE 5 & 6: EDITING ACTIONS
  const handleAcceptEditing = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/editing/${project.id}/accept`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to claim editing assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditing = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/editing/${project.id}/start`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start editing.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitCutVersion = async (e) => {
    e.preventDefault();
    if (!cutVideoUrl.trim()) {
      toast.error('Video review URL is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/editing/${project.id}/versions`, {
        cut_type: cutType,
        cut_video_url: cutVideoUrl.trim(),
        duration_seconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
        editor_notes: editorCutNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        setCutVideoUrl('');
        setEditorCutNotes('');
        setDurationSeconds('');
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit cut version.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewCutDecision = async (versionId) => {
    if (!versionReviewComments.trim()) {
      toast.error('Review feedback is required before recording decision.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/editing/versions/${versionId}/review`, {
        decision: versionReviewDecision,
        comments: versionReviewComments.trim(),
        rework_notes: versionReworkNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        setSelectedVersionForReview(null);
        setVersionReviewComments('');
        setVersionReworkNotes('');
        fetchProjectDetails();
        if (versionReviewDecision === 'APPROVED' && cutType === 'FINAL_CUT') {
          setActiveTab('thumbnail');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record cut decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // STAGE 7: THUMBNAIL ACTIONS
  const handleSubmitThumbnail = async (e) => {
    e.preventDefault();
    if (!thumbnailUrl.trim()) {
      toast.error('Valid thumbnail URL is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/thumbnails/${project.id}`, {
        thumbnail_url: thumbnailUrl.trim(),
        feedback_notes: thumbnailNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        setThumbnailUrl('');
        setThumbnailNotes('');
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit thumbnail.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewThumbnail = async (thumbnailId, decision) => {
    if (!thumbReviewFeedback.trim()) {
      toast.error('Review feedback is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/thumbnails/${thumbnailId}/review`, {
        decision,
        feedback_notes: thumbReviewFeedback.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setSelectedThumbnailForReview(null);
        setThumbReviewFeedback('');
        fetchProjectDetails();
        if (decision === 'APPROVED') {
          setActiveTab('publishing');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to review thumbnail.');
    } finally {
      setActionLoading(false);
    }
  };

  // STAGE 8: PUBLISHING ACTIONS
  const handlePublishPlatform = async (e) => {
    e.preventDefault();
    if (!postUrl.trim()) {
      toast.error('Valid live post URL is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/publishing/projects/${project.id}/platform`, {
        platform: pubPlatform,
        post_url: postUrl.trim(),
        caption: postCaption.trim() || null,
        hashtags: postHashtags.trim() || null,
        proof_screenshot_url: proofScreenshotUrl.trim() || null,
        notes: pubNotes.trim() || null,
      });
      if (res.success) {
        toast.success(res.message);
        setPostUrl('');
        setPostCaption('');
        setPostHashtags('');
        setProofScreenshotUrl('');
        setPubNotes('');
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record platform publish.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm('Mark this video project as fully published and completed?')) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/publishing/projects/${project.id}/complete`);
      if (res.success) {
        toast.success(res.message);
        fetchProjectDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete project.');
    } finally {
      setActionLoading(false);
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
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      {/* Top Bar */}
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

          {project.current_stage === 'PUBLISHING' && (isManager || isAdmin) && (
            <button
              onClick={handleCompleteProject}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> Mark Project Live & Complete
            </button>
          )}
        </div>
      </div>

      {/* Master Project Header Card */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4 md:space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold text-vcube-orange bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-lg">
                {project.project_code}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                {project.course_name}
              </span>
              <StatusBadge status={project.priority} />
            </div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{project.title}</h1>
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
        <div className="pt-3 border-t border-slate-100">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
            {STAGES.map((stg, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div
                  key={stg.key}
                  className={`px-2 py-2 rounded-xl text-center border transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-vcube-orange to-orange-500 text-white border-vcube-orange font-bold shadow-sm shadow-orange-500/20'
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
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === tab.id
                  ? 'border-vcube-orange text-vcube-orange bg-orange-50/50'
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

            {/* Part 5.2: Video Production Team & Direct Quick Calling */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-vcube-orange" />
                    <span>Assigned Production Team ({projectData?.production_team?.length || 0})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Direct contacts for team members currently assigned to stages of this video project.
                  </p>
                </div>
              </div>

              {(!projectData?.production_team || projectData.production_team.length === 0) ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400 text-center">
                  No specialized assignees have claimed or been assigned to this video yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3.5">Employee</th>
                        <th className="py-2.5 px-3.5">Role</th>
                        <th className="py-2.5 px-3.5">Stage Assignment</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5 text-right">Quick Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {projectData.production_team.map((member, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-orange-100 text-vcube-orange font-bold text-xs flex items-center justify-center shrink-0">
                                {member.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">{member.name}</span>
                                {member.phone && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" /> {member.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 font-bold text-slate-700">
                            {member.role}
                          </td>

                          <td className="py-2.5 px-3.5 text-slate-600">
                            {member.assignment}
                          </td>

                          <td className="py-2.5 px-3.5">
                            <StatusBadge status={member.status} />
                          </td>

                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {member.phone ? (
                                <a
                                  href={`tel:${member.phone}`}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs border border-emerald-200/80 cursor-pointer min-h-[32px]"
                                  title={`Call ${member.name} directly`}
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>Call</span>
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="px-2.5 py-1.5 bg-slate-50 text-slate-400 rounded-xl font-semibold text-[11px] inline-flex items-center gap-1 border border-slate-200 opacity-60 cursor-not-allowed"
                                  title="Phone number unavailable"
                                >
                                  <PhoneOff className="w-3 h-3" />
                                  <span>No Phone</span>
                                </button>
                              )}

                              {member.email && (
                                <a
                                  href={`mailto:${member.email}`}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
                                  title={`Email ${member.email}`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

            {/* Script Status Banner & Review / Edit Interface */}
            {script && script.status === 'APPROVED' ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Script Approved & Locked</p>
                      <p className="text-[11px] text-emerald-700">Video has progressed to Stage 3: Cinematography.</p>
                    </div>
                  </div>
                  {script.google_docs_url && (
                    <a
                      href={script.google_docs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <span>Open in Google Docs</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {script.reviewer_feedback && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">Reviewer Notes: </span>
                    {script.reviewer_feedback}
                  </div>
                )}
              </div>
            ) : script && script.status === 'AVAILABLE' ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <FileText className="w-10 h-10 text-blue-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Script Writing Ready for Pickup</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This video draft has been submitted and is ready for a Content Writer to claim. Click below to take responsibility and prepare the Google Docs draft.
                </p>
                <button
                  onClick={handleAcceptScriptWork}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Claiming Work...' : 'Claim Scriptwriting Task'}
                </button>
              </div>
            ) : script && script.status === 'SUBMITTED' ? (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <p className="font-bold">Script Submitted & Awaiting Review</p>
                      <p className="text-[11px] text-purple-700">
                        Version {script.script_version} authored by <strong>{script.writer_name}</strong>.
                      </p>
                    </div>
                  </div>
                  {script.google_docs_url && (
                    <a
                      href={script.google_docs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <span>Review in Google Docs</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Review Gate Decision Box (Manager or Content Creator) */}
                {(isManager || isCreator) && (
                  <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Manager Script Review & Sign-Off Gate
                    </h4>
                    <textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={2}
                      placeholder="Add review feedback, mandatory dialogue adjustments, or approval remarks..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleReviewScriptDecision('APPROVED')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" /> Approve Script & Advance to Shoot (Stage 3)
                      </button>
                      <button
                        onClick={() => handleReviewScriptDecision('CHANGES_REQUESTED')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" /> Request Rework / Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : script && (script.status === 'ACCEPTED' || script.status === 'IN_PROGRESS' || script.status === 'SCRIPT_READY' || script.status === 'CHANGES_REQUESTED') ? (
              <div className="space-y-4">
                {script.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-800">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Changes Requested by Reviewer:
                    </span>
                    <p>{script.reviewer_feedback}</p>
                  </div>
                )}

                <form onSubmit={handleSaveScriptDoc} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Google Docs Script Integration</h4>
                      <p className="text-[11px] text-slate-500">
                        Assigned Writer: <strong className="text-slate-700">{script.writer_name || user?.name}</strong>
                      </p>
                    </div>
                    {script.google_docs_url && (
                      <a
                        href={script.google_docs_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Google Docs URL *
                      </label>
                      <input
                        type="url"
                        value={googleDocsUrl}
                        onChange={(e) => setGoogleDocsUrl(e.target.value)}
                        placeholder="https://docs.google.com/document/d/..."
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Version #
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={scriptVersion}
                        onChange={(e) => setScriptVersion(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Content Notes & Hook Summary
                    </label>
                    <textarea
                      value={scriptNotes}
                      onChange={(e) => setScriptNotes(e.target.value)}
                      rows={2}
                      placeholder="Outline target word count, estimated duration, key anchor cues, or graphics prompts..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Script Details'}
                    </button>

                    {script.google_docs_url && (
                      <button
                        type="button"
                        onClick={handleSubmitScriptForApproval}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit Script for Approval
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">Draft Not Submitted for Scripting</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Submit the video draft from the Overview tab to make it available to the content writing team.
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
                <p className="text-xs text-slate-500">Camera crew roster, shoot parameters, and scene-level clip logs.</p>
              </div>
              {shoot && <StatusBadge status={shoot.status} />}
            </div>

            {shoot ? (
              <div className="space-y-6">
                {/* Shoot Claim / Status Bar */}
                {shoot.status === 'AVAILABLE' && (
                  <div className="p-6 bg-blue-50/60 rounded-2xl border border-blue-200 text-center space-y-3">
                    <Video className="w-10 h-10 text-blue-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-900">Shoot Ready for Cameraman Claim</h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Script has been approved. The Lead Cinematographer can now accept this video production shoot.
                    </p>
                    <button
                      onClick={handleAcceptShoot}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 disabled:opacity-50"
                    >
                      {actionLoading ? 'Claiming...' : 'Claim Lead Cinematographer Role'}
                    </button>
                  </div>
                )}

                {shoot.status === 'ACCEPTED' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-bold text-amber-900">Lead Cinematographer Assigned: {shoot.lead_cameraman_name}</p>
                        <p className="text-amber-700">Gear up and click "Start Shoot" when cameras roll.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleStartShoot}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Active Shoot
                    </button>
                  </div>
                )}

                {/* Shoot Header & Parameter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Cinematographer</span>
                    <span className="font-bold text-slate-800">{shoot.lead_cameraman_name || 'Unassigned'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Anchor</span>
                    <span className="font-bold text-slate-800">{shoot.confirmed_anchor_name || project.anchor_name || 'Unassigned'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Shoot Date</span>
                    <span className="font-bold text-slate-800">{shoot.actual_shoot_date ? shoot.actual_shoot_date.slice(0, 10) : 'Pending'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Studio / Gear</span>
                    <span className="font-bold text-slate-800 truncate block">{shoot.studio_details || shoot.camera_gear_notes || 'VCube Studio Main'}</span>
                  </div>
                </div>

                {/* Crew Roster Section */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Production Crew Roster</h4>
                      <p className="text-[11px] text-slate-500">Multiple employees working together on this video shoot.</p>
                    </div>
                    {(isManager || shoot.lead_cinematographer_id === user?.id) && (
                      <button
                        onClick={() => setShowAddCrewModal(true)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Assign Crew Member
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {shoot.teamMembers?.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800">{member.name}</span>
                          <span className="text-[10px] text-blue-600 font-bold block">{member.team_role.replace(/_/g, ' ')}</span>
                        </div>
                        {(isManager || shoot.lead_cinematographer_id === user?.id) && member.user_id !== shoot.lead_cinematographer_id && (
                          <button
                            onClick={() => handleRemoveTeamMember(member.user_id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shoot Parameters Form */}
                {(isManager || shoot.lead_cinematographer_id === user?.id) && (
                  <form onSubmit={handleUpdateShootDetails} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Shoot Logistics & Camera Notes</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Shoot Date</label>
                        <input
                          type="date"
                          value={shootDate}
                          onChange={(e) => setShootDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={shootStartTime}
                          onChange={(e) => setShootStartTime(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">End Time</label>
                        <input
                          type="time"
                          value={shootEndTime}
                          onChange={(e) => setShootEndTime(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Studio Details / Location</label>
                        <input
                          type="text"
                          value={studioDetails}
                          onChange={(e) => setStudioDetails(e.target.value)}
                          placeholder="e.g. Studio A, Green Screen Setup"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Camera & Gear Notes</label>
                        <input
                          type="text"
                          value={cameraGearNotes}
                          onChange={(e) => setCameraGearNotes(e.target.value)}
                          placeholder="e.g. Sony FX3 + 24-70mm GM II, Wireless Rode Mic"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        Save Logistics
                      </button>
                    </div>
                  </form>
                )}

                {/* SCENES & SHOT LOGGING CONSOLE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Chronological Scene & Shot Logger</h4>
                      <p className="text-[11px] text-slate-500">Record clips, dialogue cues, take numbers, and usability status.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isManager || shoot.lead_cinematographer_id === user?.id) && (
                        <>
                          <button
                            onClick={() => setShowAddSceneModal(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Scene
                          </button>

                          {shoot.status !== 'SHOOT_COMPLETED' && (
                            <button
                              onClick={handleCompleteShoot}
                              disabled={actionLoading}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Shoot & Handover
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {!shoot.scenes || shoot.scenes.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                      <Video className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No Scenes Added Yet</p>
                      <p>Click "Add Scene" above to structure the shoot and start logging camera takes.</p>
                    </div>
                  ) : (
                    shoot.scenes.map((scene) => (
                      <div key={scene.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">
                              Scene {scene.scene_number}: {scene.title}
                            </h5>
                            {scene.description && <p className="text-[11px] text-slate-500">{scene.description}</p>}
                          </div>
                          <button
                            onClick={() => {
                              setActiveSceneForShot(scene);
                              setNewShotNumber((scene.shots?.length || 0) + 1);
                              setNewClipName(`CLIP_${String((scene.shots?.length || 0) + 1).padStart(3, '0')}.MOV`);
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 text-blue-600" /> Log Shot
                          </button>
                        </div>

                        {/* Shots table for this scene */}
                        <div className="space-y-1.5">
                          {scene.shots && scene.shots.length > 0 ? (
                            scene.shots.map((sh) => (
                              <div
                                key={sh.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs gap-2"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                    Shot {sh.shot_number} (Take {sh.take_number})
                                  </span>
                                  <span className="font-mono font-bold text-slate-800">{sh.clip_file_name}</span>
                                  {sh.dialogue_reference && (
                                    <span className="text-slate-500 italic truncate max-w-xs">
                                      "{sh.dialogue_reference}"
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleShotStatus(sh.id, sh.status)}
                                    title="Click to cycle shot status"
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                      sh.status === 'CONFIRMED'
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : sh.status === 'REJECTED'
                                        ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                        : sh.status === 'RETAKE_REQUIRED'
                                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {sh.status} ↺
                                  </button>

                                  <button
                                    onClick={() => handleDeleteShot(sh.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-400 italic p-2">No shots logged for this scene yet.</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                Cinematography workspace unlocks after script approval.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FOOTAGE HANDOVER */}
        {activeTab === 'handover' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 4: Physical Footage Handover Protocol</h3>
                <p className="text-xs text-slate-500">Storage media chip identifier, folder name, and editor dual-party verification.</p>
              </div>
              {footage_handovers && footage_handovers.length > 0 && (
                <StatusBadge status={footage_handovers[0].status} />
              )}
            </div>

            {/* Handover Flow Interface */}
            <div className="space-y-4">
              {/* Form to log / edit handover media */}
              <form onSubmit={handleRecordHandover} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Physical Storage Media & Folder Handover Log
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Storage Chip / Card Identifier *
                    </label>
                    <input
                      type="text"
                      value={mediaChipId}
                      onChange={(e) => setMediaChipId(e.target.value)}
                      placeholder="e.g. SD_CARD_A1, SSD_SANDISK_02, DRIVE_B"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Raw Footage Folder Name *
                    </label>
                    <input
                      type="text"
                      value={footageFolder}
                      onChange={(e) => setFootageFolder(e.target.value)}
                      placeholder="e.g. RAW_20261105_AGENCY_K"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Storage URL / Google Drive / NAS Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={footageStorageUrl}
                      onChange={(e) => setFootageStorageUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Handover Notes & Observations
                    </label>
                    <input
                      type="text"
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      placeholder="e.g. 15GB total, 4K 60fps, includes B-roll folder"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Record Physical Media Handover'}
                  </button>
                </div>
              </form>

              {/* Dual-Party Verification Stepper */}
              {footage_handovers && footage_handovers.length > 0 && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Editor Dual-Party Verification Protocol
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Step 1: Confirm Receipt */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">1. Receive Media</span>
                        {footage_handovers[0].received_at ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {footage_handovers[0].received_by_name
                          ? `Received by ${footage_handovers[0].received_by_name}`
                          : 'Pending editor physical pickup'}
                      </p>
                      {!footage_handovers[0].received_at && (
                        <button
                          onClick={handleConfirmReceipt}
                          disabled={actionLoading}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                        >
                          Confirm Receipt
                        </button>
                      )}
                    </div>

                    {/* Step 2: Backup / Copy */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">2. Copy to Workstation</span>
                        {footage_handovers[0].status === 'FOOTAGE_COPIED' || footage_handovers[0].status === 'READY_FOR_EDITING' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">Copy raw clips to local high-speed drive / editing server.</p>
                      {footage_handovers[0].status === 'RECEIVED_BY_EDITOR' && (
                        <button
                          onClick={handleConfirmCopied}
                          disabled={actionLoading}
                          className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                        >
                          Mark Footage Copied
                        </button>
                      )}
                    </div>

                    {/* Step 3: Advance to Editing */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">3. Ready for Editing</span>
                        {footage_handovers[0].status === 'READY_FOR_EDITING' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">Unlocks Stage 5 and notifies editing team.</p>
                      {(footage_handovers[0].status === 'FOOTAGE_COPIED' || footage_handovers[0].status === 'RECEIVED_BY_EDITOR') && (
                        <button
                          onClick={handleMarkReadyForEditing}
                          disabled={actionLoading}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                        >
                          Advance to Editing
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: EDITING & CUTS */}
        {activeTab === 'editing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 5: Video Editing Workspace & Versioning</h3>
                <p className="text-xs text-slate-500">Submit First Cut, Rough Cut, and Final Cut review URLs.</p>
              </div>
              {editing && <StatusBadge status={editing.status} />}
            </div>

            {/* Editing Claim / Start Banner */}
            {editing && editing.status === 'AVAILABLE' && (
              <div className="p-6 bg-blue-50/60 rounded-2xl border border-blue-200 text-center space-y-3">
                <Scissors className="w-10 h-10 text-blue-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Video Ready for Editing Assignment</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Footage handover verified. Claim this project to edit raw takes into polished cuts.
                </p>
                <button
                  onClick={handleAcceptEditing}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Claiming...' : 'Claim Video Editing Work'}
                </button>
              </div>
            )}

            {editing && editing.status === 'ACCEPTED' && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-900">Assigned Editor: {editing.editor_name}</p>
                    <p className="text-amber-700">Click below when timeline assembly begins.</p>
                  </div>
                </div>
                <button
                  onClick={handleStartEditing}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" /> Start Editing
                </button>
              </div>
            )}

            {/* Submit Version Cut Form */}
            {editing && (editing.status === 'EDITING_IN_PROGRESS' || editing.status === 'CHANGES_REQUESTED' || editing.status === 'UNDER_REVIEW') && (
              <form onSubmit={handleSubmitCutVersion} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Submit New Video Cut for Manager Review (Stage 6)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-bold">
                    Editor: {editing.editor_name || user?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Cut Type *
                    </label>
                    <select
                      value={cutType}
                      onChange={(e) => setCutType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="FIRST_CUT">First Cut</option>
                      <option value="ROUGH_CUT">Rough Cut</option>
                      <option value="REWORK_CUT">Rework Cut</option>
                      <option value="FINAL_CUT">Final Cut (Sign-off Ready)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Video Review URL (Drive, Frame.io, YouTube Unlisted) *
                    </label>
                    <input
                      type="url"
                      value={cutVideoUrl}
                      onChange={(e) => setCutVideoUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... or https://frame.io/..."
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Duration (Secs)
                    </label>
                    <input
                      type="number"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(e.target.value)}
                      placeholder="e.g. 180"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Editor Notes / Changelog
                  </label>
                  <textarea
                    value={editorCutNotes}
                    onChange={(e) => setEditorCutNotes(e.target.value)}
                    rows={2}
                    placeholder="Summarize changes made, sound design details, or color grading notes..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Cut for Review
                  </button>
                </div>
              </form>
            )}

            {/* List of Submitted Versions & Review Gates */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Video Cut Version History & Review Decisions
              </h4>

              {!editing || !editing.versions || editing.versions.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  No video cut versions uploaded yet.
                </div>
              ) : (
                editing.versions.map((ver) => (
                  <div key={ver.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md">
                          v{ver.version_number}: {ver.cut_type}
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

                    {ver.editor_notes && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-800">Editor Notes: </strong> {ver.editor_notes}
                      </p>
                    )}

                    {ver.review_decision ? (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Review Sign-Off by {ver.reviewer_name}:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              ver.review_decision === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ver.review_decision}
                          </span>
                        </div>
                        <p className="text-slate-600">{ver.review_comments}</p>
                      </div>
                    ) : (
                      /* Review Gate Form for Managers */
                      (isManager || isAdmin) && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <span className="text-[11px] font-bold uppercase text-slate-500 block">
                            Manager Review Gate for v{ver.version_number}
                          </span>
                          <textarea
                            value={selectedVersionForReview === ver.id ? versionReviewComments : ''}
                            onChange={(e) => {
                              setSelectedVersionForReview(ver.id);
                              setVersionReviewComments(e.target.value);
                            }}
                            rows={2}
                            placeholder="Enter review feedback, timestamped change requests, or approval remarks..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                setVersionReviewDecision('APPROVED');
                                handleReviewCutDecision(ver.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve Cut
                            </button>
                            <button
                              onClick={() => {
                                setVersionReviewDecision('CHANGES_REQUESTED');
                                handleReviewCutDecision(ver.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Request Rework
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: THUMBNAIL & SEO */}
        {activeTab === 'thumbnail' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 7: High-CTR Thumbnail Design & Assets</h3>
              <p className="text-xs text-slate-500">Designers upload graphics and manage thumbnail approval before publishing.</p>
            </div>

            {/* Upload Thumbnail Form */}
            <form onSubmit={handleSubmitThumbnail} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Submit High-CTR Thumbnail Asset
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Thumbnail Image URL *
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or Cloudinary URL"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Design Notes & Hook
                  </label>
                  <input
                    type="text"
                    value={thumbnailNotes}
                    onChange={(e) => setThumbnailNotes(e.target.value)}
                    placeholder="e.g. Bold 3-word title hook, high contrast"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Submit Thumbnail
                </button>
              </div>
            </form>

            {/* Thumbnails Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Submitted Thumbnails</h4>
              {!thumbnails || thumbnails.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  No thumbnails uploaded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {thumbnails.map((tn) => (
                    <div key={tn.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <img
                        src={tn.thumbnail_url}
                        alt="Thumbnail preview"
                        className="w-full h-44 object-cover rounded-xl border border-slate-200 shadow-2xs"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Version {tn.version_number}</span>
                        <StatusBadge status={tn.status} />
                      </div>
                      {tn.feedback_notes && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                          {tn.feedback_notes}
                        </p>
                      )}

                      {/* Approval gate for manager */}
                      {(isManager || isAdmin) && tn.status !== 'APPROVED' && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <input
                            type="text"
                            placeholder="Approval remarks or revision notes..."
                            value={selectedThumbnailForReview === tn.id ? thumbReviewFeedback : ''}
                            onChange={(e) => {
                              setSelectedThumbnailForReview(tn.id);
                              setThumbReviewFeedback(e.target.value);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReviewThumbnail(tn.id, 'APPROVED')}
                              disabled={actionLoading}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                            >
                              Approve & Move to Publish
                            </button>
                            <button
                              onClick={() => handleReviewThumbnail(tn.id, 'CHANGES_REQUESTED')}
                              disabled={actionLoading}
                              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                            >
                              Request Changes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: MULTI-PLATFORM PUBLISHING */}
        {activeTab === 'publishing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Stage 8: Multi-Platform Social Publishing</h3>
                <p className="text-xs text-slate-500">Record independent live links for YouTube, Instagram, Facebook, and LinkedIn.</p>
              </div>
              {project.current_stage === 'PUBLISHING' && (isManager || isAdmin) && (
                <button
                  onClick={handleCompleteProject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Mark Entire Project Live & Completed
                </button>
              )}
            </div>

            {/* Record Platform Publish Form */}
            <form onSubmit={handlePublishPlatform} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Record Live Social Post Publication
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Platform *</label>
                  <select
                    value={pubPlatform}
                    onChange={(e) => setPubPlatform(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="LINKEDIN">LinkedIn</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Live Post URL *
                  </label>
                  <input
                    type="url"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://instagram.com/p/..."
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Post Caption & Copy
                  </label>
                  <input
                    type="text"
                    value={postCaption}
                    onChange={(e) => setPostCaption(e.target.value)}
                    placeholder="Headline or primary hook..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={postHashtags}
                    onChange={(e) => setPostHashtags(e.target.value)}
                    placeholder="#VCube #FullStack #Python #WebDev"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" /> Save Live Publication Record
                </button>
              </div>
            </form>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN'].map((platform) => {
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
                      <div className="space-y-1.5">
                        <a
                          href={pubRecord.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{pubRecord.post_url}</span>
                        </a>
                        {pubRecord.hashtags && (
                          <span className="text-[10px] text-slate-500 font-mono block truncate">
                            {pubRecord.hashtags}
                          </span>
                        )}
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

      {/* MODAL: ASSIGN CREW MEMBER */}
      {showAddCrewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Assign Crew Member</h3>
              <button onClick={() => setShowAddCrewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTeamMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Select Employee *</label>
                <select
                  value={newCrewUserId}
                  onChange={(e) => setNewCrewUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">-- Choose employee --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.name || u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Role in Shoot *</label>
                <select
                  value={newCrewRole}
                  onChange={(e) => setNewCrewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="SECOND_CAMERA">Second Camera</option>
                  <option value="ANCHOR">Anchor / Presenter</option>
                  <option value="LIGHTING_ASSISTANT">Lighting Assistant</option>
                  <option value="AUDIO_TECH">Audio Technician</option>
                  <option value="LEAD_CAMERAMAN">Lead Cameraman</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCrewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SCENE */}
      {showAddSceneModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add Video Scene</h3>
              <button onClick={() => setShowAddSceneModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddScene} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Scene Number *</label>
                <input
                  type="number"
                  min="1"
                  value={newSceneNumber}
                  onChange={(e) => setNewSceneNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Scene Title *</label>
                <input
                  type="text"
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                  placeholder="e.g. Intro Hook - Agency K Overview"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Description / Location</label>
                <textarea
                  value={newSceneDesc}
                  onChange={(e) => setNewSceneDesc(e.target.value)}
                  placeholder="e.g. Anchor sitting in studio with laptop"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSceneModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Create Scene
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG SHOT */}
      {activeSceneForShot && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Log Shot for Scene {activeSceneForShot.scene_number}
                </h3>
                <p className="text-[11px] text-slate-500">{activeSceneForShot.title}</p>
              </div>
              <button onClick={() => setActiveSceneForShot(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogShot} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Shot # *</label>
                  <input
                    type="number"
                    min="1"
                    value={newShotNumber}
                    onChange={(e) => setNewShotNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Take # *</label>
                  <input
                    type="number"
                    min="1"
                    value={newTakeNumber}
                    onChange={(e) => setNewTakeNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Clip Filename *</label>
                  <input
                    type="text"
                    value={newClipName}
                    onChange={(e) => setNewClipName(e.target.value)}
                    placeholder="e.g. CLIP_001.MOV"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Initial Status *</label>
                  <select
                    value={newShotStatus}
                    onChange={(e) => setNewShotStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="CONFIRMED">CONFIRMED (Usable Take)</option>
                    <option value="RECORDED">RECORDED</option>
                    <option value="RETAKE_REQUIRED">RETAKE REQUIRED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="UNUSABLE">UNUSABLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Dialogue / Script Reference</label>
                <input
                  type="text"
                  value={newDialogueRef}
                  onChange={(e) => setNewDialogueRef(e.target.value)}
                  placeholder="e.g. 'Welcome to Agency K, today we examine...'"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Notes / Camera Angle</label>
                <input
                  type="text"
                  value={newShotNotes}
                  onChange={(e) => setNewShotNotes(e.target.value)}
                  placeholder="e.g. Close-up on anchor, slight glare at 0:15"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSceneForShot(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Shot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
