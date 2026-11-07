import { query } from '../config/db.js';

/**
 * Normalizes assignment status to standard reporting statuses:
 * COMPLETED, IN_PROGRESS, PENDING, OVERDUE, CANCELLED
 */
export function normalizeStatus(rawStatus, scheduledDate, completedAt) {
  const s = (rawStatus || '').toUpperCase();
  if (['COMPLETED', 'APPROVED', 'PUBLISHED', 'SHOOT_COMPLETED'].includes(s)) {
    return 'COMPLETED';
  }
  if (s === 'CANCELLED') {
    return 'CANCELLED';
  }
  if (scheduledDate && new Date(scheduledDate) < new Date() && !completedAt) {
    if (['IN_PROGRESS', 'EDITING_IN_PROGRESS', 'EDITING_STARTED', 'ACCEPTED', 'SUBMITTED', 'UNDER_REVIEW'].includes(s)) {
      return 'OVERDUE';
    }
  }
  if (['IN_PROGRESS', 'EDITING_IN_PROGRESS', 'EDITING_STARTED', 'ACCEPTED', 'SUBMITTED', 'UNDER_REVIEW', 'SCRIPT_READY', 'FIRST_CUT_READY', 'FINAL_CUT_READY', 'HANDED_OVER', 'RECEIVED_BY_EDITOR'].includes(s)) {
    return 'IN_PROGRESS';
  }
  return 'PENDING';
}

/**
 * Fetch unified assignment records across all video stages and task stages
 * within a specified date range or filter set.
 */
export async function getUnifiedAssignments({
  startDate,
  endDate,
  employeeId,
  roleId,
  courseId,
  stage,
  status,
  search,
}) {
  const params = [];
  const conditions = [];

  // 1. Scripting Assignments
  let scriptSql = `
    SELECT 
      CONCAT('script_', cs.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      'Content Writing' AS stage_name,
      'CONTENT_WRITING' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      cs.status AS raw_status,
      cs.accepted_at AS started_at,
      COALESCE(cs.approved_at, cs.submitted_at) AS completed_at,
      vp.proposed_shoot_date AS scheduled_date,
      cs.content_notes AS remarks,
      cs.updated_at AS last_update,
      cs.created_at AS assigned_date
    FROM content_scripts cs
    JOIN video_projects vp ON cs.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON cs.writer_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE cs.writer_id IS NOT NULL
  `;

  // 2. Cinematography Shoots (Lead Cinematographer)
  let shootSql = `
    SELECT 
      CONCAT('shoot_', csh.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      'Cinematography' AS stage_name,
      'CINEMATOGRAPHY' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      csh.status AS raw_status,
      COALESCE(csh.accepted_at, csh.created_at) AS started_at,
      csh.completed_at AS completed_at,
      COALESCE(csh.actual_shoot_date, vp.proposed_shoot_date) AS scheduled_date,
      csh.shoot_notes AS remarks,
      csh.updated_at AS last_update,
      csh.created_at AS assigned_date
    FROM cinematography_shoots csh
    JOIN video_projects vp ON csh.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON csh.lead_cinematographer_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE csh.lead_cinematographer_id IS NOT NULL
  `;

  // 2b. Cinematography Crew Members
  let crewSql = `
    SELECT 
      CONCAT('crew_', ctm.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      CONCAT('Shoot Crew (', REPLACE(ctm.team_role, '_', ' '), ')') AS stage_name,
      'CINEMATOGRAPHY' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      csh.status AS raw_status,
      csh.accepted_at AS started_at,
      csh.completed_at AS completed_at,
      COALESCE(csh.actual_shoot_date, vp.proposed_shoot_date) AS scheduled_date,
      CONCAT('Assigned as ', ctm.team_role) AS remarks,
      csh.updated_at AS last_update,
      ctm.created_at AS assigned_date
    FROM cinematography_team_members ctm
    JOIN cinematography_shoots csh ON ctm.shoot_id = csh.id
    JOIN video_projects vp ON csh.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON ctm.user_id = u.id
    JOIN roles r ON u.role_id = r.id
  `;

  // 3. Footage Handovers
  let handoverSql = `
    SELECT 
      CONCAT('handover_', fh.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      'Footage Handover' AS stage_name,
      'FOOTAGE_HANDOVER' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      fh.status AS raw_status,
      fh.handed_over_at AS started_at,
      fh.received_at AS completed_at,
      vp.proposed_shoot_date AS scheduled_date,
      CONCAT('Media Chip: ', fh.storage_media_identifier, ' | Folder: ', fh.footage_folder_name) AS remarks,
      fh.updated_at AS last_update,
      fh.created_at AS assigned_date
    FROM footage_handovers fh
    JOIN video_projects vp ON fh.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON (fh.received_by = u.id OR (fh.received_by IS NULL AND fh.handed_over_by = u.id))
    JOIN roles r ON u.role_id = r.id
  `;

  // 4. Video Editing Assignments
  let editingSql = `
    SELECT 
      CONCAT('edit_', ea.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      'Video Editing' AS stage_name,
      'VIDEO_EDITING' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      ea.status AS raw_status,
      COALESCE(ea.editing_started_at, ea.accepted_at) AS started_at,
      ea.completed_at AS completed_at,
      vp.proposed_shoot_date AS scheduled_date,
      CONCAT('Version ', ea.version) AS remarks,
      ea.updated_at AS last_update,
      ea.created_at AS assigned_date
    FROM editing_assignments ea
    JOIN video_projects vp ON ea.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON ea.editor_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE ea.editor_id IS NOT NULL
  `;

  // 5. Thumbnails
  let thumbSql = `
    SELECT 
      CONCAT('thumb_', tn.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      'Thumbnail Design' AS stage_name,
      'THUMBNAIL_PREP' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      tn.status AS raw_status,
      tn.created_at AS started_at,
      CASE WHEN tn.status = 'APPROVED' THEN tn.updated_at ELSE NULL END AS completed_at,
      vp.proposed_shoot_date AS scheduled_date,
      tn.feedback_notes AS remarks,
      tn.updated_at AS last_update,
      tn.created_at AS assigned_date
    FROM thumbnails tn
    JOIN video_projects vp ON tn.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON tn.designer_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE tn.designer_id IS NOT NULL
  `;

  // 6. Platform Publications
  let pubSql = `
    SELECT 
      CONCAT('pub_', pp.id) AS assignment_id,
      'VIDEO_PROJECT' AS source_type,
      vp.id AS project_id,
      vp.project_code,
      vp.title AS video_title,
      c.id AS course_id,
      c.name AS course_name,
      CONCAT('Publishing (', pp.platform, ')') AS stage_name,
      'PUBLISHING' AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      pp.status AS raw_status,
      pp.created_at AS started_at,
      pp.published_at AS completed_at,
      vp.proposed_shoot_date AS scheduled_date,
      COALESCE(pp.post_url, pp.notes) AS remarks,
      pp.updated_at AS last_update,
      pp.created_at AS assigned_date
    FROM platform_publications pp
    JOIN video_projects vp ON pp.video_project_id = vp.id
    JOIN courses c ON vp.course_id = c.id
    JOIN users u ON pp.published_by = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE pp.published_by IS NOT NULL
  `;

  // 7. General Task Stage Assignments
  let taskStageSql = `
    SELECT 
      CONCAT('tsa_', tsa.id) AS assignment_id,
      'TASK' AS source_type,
      t.id AS project_id,
      CONCAT('TSK-', LPAD(t.id, 3, '0')) AS project_code,
      t.title AS video_title,
      0 AS course_id,
      COALESCE(t.course_code, 'Campaign Task') AS course_name,
      REPLACE(ts.stage_type, '_', ' ') AS stage_name,
      ts.stage_type AS stage_key,
      u.id AS employee_id,
      COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_code,
      u.name AS employee_name,
      r.id AS role_id,
      r.name AS employee_role,
      u.phone AS employee_phone,
      u.email AS employee_email,
      tsa.status AS raw_status,
      COALESCE(ts.started_at, tsa.accepted_at) AS started_at,
      COALESCE(ts.completed_at, tsa.completed_at) AS completed_at,
      DATE(t.scheduled_end) AS scheduled_date,
      t.location AS remarks,
      ts.updated_at AS last_update,
      tsa.accepted_at AS assigned_date
    FROM task_stage_assignments tsa
    JOIN task_stages ts ON tsa.task_stage_id = ts.id
    JOIN tasks t ON ts.task_id = t.id
    JOIN users u ON tsa.user_id = u.id
    JOIN roles r ON u.role_id = r.id
  `;

  const unionSql = `
    SELECT * FROM (
      (${scriptSql})
      UNION ALL
      (${shootSql})
      UNION ALL
      (${crewSql})
      UNION ALL
      (${handoverSql})
      UNION ALL
      (${editingSql})
      UNION ALL
      (${thumbSql})
      UNION ALL
      (${pubSql})
      UNION ALL
      (${taskStageSql})
    ) AS unified
    ORDER BY assigned_date DESC
  `;

  const rows = await query(unionSql);

  // Apply in-memory normalized status, date filtering, and search criteria
  const filtered = rows.map((row) => {
    const normStatus = normalizeStatus(row.raw_status, row.scheduled_date, row.completed_at);

    // Calculate time taken in minutes if started and completed
    let durationMinutes = null;
    if (row.started_at && row.completed_at) {
      const diffMs = new Date(row.completed_at) - new Date(row.started_at);
      if (diffMs > 0) {
        durationMinutes = Math.round(diffMs / (1000 * 60));
      }
    }

    return {
      ...row,
      status: normStatus,
      duration_minutes: durationMinutes,
    };
  }).filter((row) => {
    // 1. Date Range Filter (against assigned_date, started_at, completed_at, or scheduled_date)
    const effectiveDate = row.completed_at || row.started_at || row.assigned_date;
    const dateStr = effectiveDate ? new Date(effectiveDate).toISOString().slice(0, 10) : null;

    if (startDate && dateStr && dateStr < startDate) return false;
    if (endDate && dateStr && dateStr > endDate) return false;

    // 2. Employee Filter
    if (employeeId && parseInt(employeeId, 10) !== row.employee_id) return false;

    // 3. Role Filter
    if (roleId && parseInt(roleId, 10) !== row.role_id) return false;

    // 4. Course Filter
    if (courseId && parseInt(courseId, 10) !== row.course_id) return false;

    // 5. Stage Filter
    if (stage && stage !== 'ALL' && row.stage_key !== stage && row.stage_name !== stage) return false;

    // 6. Status Filter
    if (status && status !== 'ALL' && row.status !== status) return false;

    // 7. Search Filter (by employee name, video title, or project code)
    if (search && search.trim()) {
      const q = search.toLowerCase();
      const match =
        row.employee_name?.toLowerCase().includes(q) ||
        row.video_title?.toLowerCase().includes(q) ||
        row.project_code?.toLowerCase().includes(q) ||
        row.course_name?.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return filtered;
}

/**
 * Generate Summary Statistics from an array of normalized assignment rows
 */
export function computeReportSummary(assignments = []) {
  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === 'COMPLETED').length;
  const inProgress = assignments.filter((a) => a.status === 'IN_PROGRESS').length;
  const pending = assignments.filter((a) => a.status === 'PENDING').length;
  const overdue = assignments.filter((a) => a.status === 'OVERDUE').length;
  const cancelled = assignments.filter((a) => a.status === 'CANCELLED').length;

  const eligible = total - cancelled;
  const completionPercentage = eligible > 0 ? Math.round((completed / eligible) * 100) : 0;

  // Distinct active employees
  const activeEmployeeIds = new Set(assignments.map((a) => a.employee_id));
  // Distinct video projects worked on
  const distinctProjects = new Set(assignments.map((a) => a.project_id));

  // Compute total logged time in minutes
  const totalMinutes = assignments.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

  return {
    totalAssignments: total,
    completed,
    inProgress,
    pending,
    overdue,
    cancelled,
    completionPercentage,
    activeEmployeesCount: activeEmployeeIds.size,
    distinctProjectsCount: distinctProjects.size,
    totalLoggedMinutes: totalMinutes,
    totalLoggedHours: Math.round((totalMinutes / 60) * 10) / 10,
  };
}

/**
 * Group assignment rows employee-wise with summary calculations
 */
export function groupAssignmentsByEmployee(assignments = []) {
  const empMap = new Map();

  for (const a of assignments) {
    if (!empMap.has(a.employee_id)) {
      empMap.set(a.employee_id, {
        employee_id: a.employee_id,
        employee_code: a.employee_code,
        employee_name: a.employee_name,
        employee_role: a.employee_role,
        employee_phone: a.employee_phone,
        employee_email: a.employee_email,
        total_assigned: 0,
        completed: 0,
        in_progress: 0,
        pending: 0,
        delayed: 0,
        cancelled: 0,
        total_minutes: 0,
        distinct_videos: new Set(),
        assignments: [],
      });
    }

    const emp = empMap.get(a.employee_id);
    emp.total_assigned += 1;
    if (a.status === 'COMPLETED') emp.completed += 1;
    else if (a.status === 'IN_PROGRESS') emp.in_progress += 1;
    else if (a.status === 'PENDING') emp.pending += 1;
    else if (a.status === 'OVERDUE') emp.delayed += 1;
    else if (a.status === 'CANCELLED') emp.cancelled += 1;

    if (a.duration_minutes) emp.total_minutes += a.duration_minutes;
    if (a.project_id) emp.distinct_videos.add(a.project_id);

    emp.assignments.push(a);
  }

  return Array.from(empMap.values()).map((emp) => {
    const eligible = emp.total_assigned - emp.cancelled;
    const completionPercentage = eligible > 0 ? Math.round((emp.completed / eligible) * 100) : 0;
    return {
      ...emp,
      videos_count: emp.distinct_videos.size,
      completion_percentage: completionPercentage,
      total_hours: Math.round((emp.total_minutes / 60) * 10) / 10,
      distinct_videos: undefined, // remove Set for clean JSON serialization
    };
  }).sort((a, b) => b.completed - a.completed);
}

