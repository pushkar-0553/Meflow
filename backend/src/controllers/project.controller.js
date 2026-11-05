import crypto from 'crypto';
import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const createDraftSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  course_id: z.number().int().positive('Course selection is required'),
  category: z.enum([
    'PROJECT_EXPLANATION',
    'COURSE_PROMO',
    'REEL_SHORT',
    'STUDENT_SUCCESS_STORY',
    'WEBINAR_TEASER',
    'EVENT_COVERAGE',
    'TUTORIAL_CONCEPT',
    'FACULTY_INSIGHT',
  ]).default('PROJECT_EXPLANATION'),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  proposed_shoot_date: z.string().optional().nullable(),
  proposed_shoot_time: z.string().optional().nullable(),
  location_type: z.enum(['STUDIO', 'EXTERNAL']).default('STUDIO'),
  location_details: z.string().default('VCube Studio Main Floor'),
  tentative_anchor_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateDraftSchema = z.object({
  title: z.string().min(3),
  course_id: z.number().int().positive(),
  category: z.enum([
    'PROJECT_EXPLANATION',
    'COURSE_PROMO',
    'REEL_SHORT',
    'STUDENT_SUCCESS_STORY',
    'WEBINAR_TEASER',
    'EVENT_COVERAGE',
    'TUTORIAL_CONCEPT',
    'FACULTY_INSIGHT',
  ]),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  proposed_shoot_date: z.string().optional().nullable(),
  proposed_shoot_time: z.string().optional().nullable(),
  location_type: z.enum(['STUDIO', 'EXTERNAL']),
  location_details: z.string(),
  tentative_anchor_id: z.number().int().positive().optional().nullable(),
});

export const projectController = {
  /**
   * POST /api/projects/drafts
   * Create a new Video Project / Draft (Any authorized employee can conceive a draft)
   */
  async createDraft(req, res, next) {
    try {
      const data = createDraftSchema.parse(req.body);
      const userId = req.user?.id || 1;

      // Verify course exists
      const courses = await query(`SELECT id, code, name FROM courses WHERE id = ? AND is_active = TRUE`, [data.course_id]);
      if (!courses || courses.length === 0) {
        return errorResponse(res, { statusCode: 400, message: 'Selected course does not exist or is inactive.' });
      }
      const course = courses[0];

      // Generate human-readable project code: VP-YYYYMMDD-XXXX
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const projectCode = `VP-${datePart}-${randomSuffix}`;

      let createdProjectId;

      await transaction(async (conn) => {
        // 1. Insert master video project
        const [projRes] = await conn.query(
          `INSERT INTO video_projects (
            project_code, title, course_id, category, description, priority,
            current_stage, overall_status, proposed_shoot_date, proposed_shoot_time,
            location_type, location_details, tentative_anchor_id, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT_PLANNING', 'DRAFT', ?, ?, ?, ?, ?, ?)`,
          [
            projectCode,
            data.title.trim(),
            data.course_id,
            data.category,
            data.description || null,
            data.priority,
            data.proposed_shoot_date || null,
            data.proposed_shoot_time || null,
            data.location_type,
            data.location_details,
            data.tentative_anchor_id || null,
            userId,
          ]
        );
        createdProjectId = projRes.insertId;

        // 2. Initialize linked stage child records
        // A. Scripting record
        await conn.query(
          `INSERT INTO content_scripts (video_project_id, status, content_notes)
           VALUES (?, 'NOT_STARTED', ?)`,
          [createdProjectId, data.notes || null]
        );

        // B. Cinematography shoot record
        await conn.query(
          `INSERT INTO cinematography_shoots (video_project_id, anchor_id, status, actual_shoot_date)
           VALUES (?, ?, 'AVAILABLE', ?)`,
          [createdProjectId, data.tentative_anchor_id || null, data.proposed_shoot_date || null]
        );

        // C. Editing record
        await conn.query(
          `INSERT INTO editing_assignments (video_project_id, status)
           VALUES (?, 'AVAILABLE')`,
          [createdProjectId]
        );

        // D. Initial draft activity audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'VIDEO_DRAFT_CREATED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [
            userId,
            createdProjectId,
            JSON.stringify({ projectCode, title: data.title, course: course.name, category: data.category }),
            req.ip,
          ]
        );
      });

      return successResponse(res, {
        statusCode: 201,
        message: `Video Draft '${data.title}' conceived successfully with code ${projectCode}.`,
        data: {
          id: createdProjectId,
          project_code: projectCode,
          title: data.title,
          course_id: data.course_id,
          course_name: course.name,
          current_stage: 'DRAFT_PLANNING',
          overall_status: 'DRAFT',
          created_by: userId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/drafts
   * List shared drafts with tabs and multi-criteria filters
   */
  async getDrafts(req, res, next) {
    try {
      const {
        tab = 'all',
        course_id,
        category,
        priority,
        status,
        creator_id,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      const params = [];

      // Tab filtering logic
      const userId = req.user?.id;
      if (tab === 'my_drafts') {
        conditions.push(`vp.created_by = ?`);
        params.push(userId);
      } else if (tab === 'upcoming_shoots') {
        conditions.push(`vp.proposed_shoot_date >= CURDATE()`);
      } else if (tab === 'pending_content') {
        conditions.push(`vp.current_stage = 'CONTENT_WRITING'`);
      } else if (tab === 'in_progress') {
        conditions.push(`vp.current_stage IN ('CONTENT_WRITING', 'CINEMATOGRAPHY', 'FOOTAGE_HANDOVER', 'VIDEO_EDITING')`);
      } else if (tab === 'completed') {
        conditions.push(`vp.overall_status = 'COMPLETED'`);
      } else if (tab === 'published') {
        conditions.push(`vp.current_stage = 'PUBLISHED'`);
      }

      // Course filter
      if (course_id) {
        conditions.push(`vp.course_id = ?`);
        params.push(parseInt(course_id, 10));
      }

      // Category filter
      if (category) {
        conditions.push(`vp.category = ?`);
        params.push(category);
      }

      // Priority filter
      if (priority) {
        conditions.push(`vp.priority = ?`);
        params.push(priority);
      }

      // Status filter
      if (status) {
        conditions.push(`vp.overall_status = ?`);
        params.push(status);
      }

      // Creator filter
      if (creator_id) {
        conditions.push(`vp.created_by = ?`);
        params.push(parseInt(creator_id, 10));
      }

      // Text search
      if (search && search.trim()) {
        conditions.push(`(
          LOWER(vp.title) LIKE LOWER(?) OR
          LOWER(vp.project_code) LIKE LOWER(?) OR
          LOWER(c.name) LIKE LOWER(?) OR
          LOWER(u.name) LIKE LOWER(?)
        )`);
        const s = `%${search.trim()}%`;
        params.push(s, s, s, s);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countRes = await query(
        `SELECT COUNT(*) AS total
         FROM video_projects vp
         JOIN courses c ON vp.course_id = c.id
         JOIN users u ON vp.created_by = u.id
         ${whereClause}`,
        params
      );
      const total = countRes[0]?.total || 0;

      // Data query with full group-by compliance
      const projects = await query(
        `SELECT vp.id, vp.project_code, vp.title, vp.category, vp.description, vp.priority,
                vp.current_stage, vp.overall_status, vp.proposed_shoot_date, vp.proposed_shoot_time,
                vp.location_type, vp.location_details, vp.is_submitted_for_content,
                vp.created_by, vp.created_at, vp.updated_at,
                c.id AS course_id, c.code AS course_code, c.name AS course_name,
                u.name AS creator_name, u.email AS creator_email,
                anc.name AS anchor_name,
                cs.status AS script_status, cs.google_docs_url,
                csh.status AS shoot_status,
                ea.status AS editing_status
         FROM video_projects vp
         JOIN courses c ON vp.course_id = c.id
         JOIN users u ON vp.created_by = u.id
         LEFT JOIN users anc ON vp.tentative_anchor_id = anc.id
         LEFT JOIN content_scripts cs ON vp.id = cs.video_project_id
         LEFT JOIN cinematography_shoots csh ON vp.id = csh.video_project_id
         LEFT JOIN editing_assignments ea ON vp.id = ea.video_project_id
         ${whereClause}
         ORDER BY vp.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return successResponse(res, {
        message: 'Video drafts and projects retrieved successfully.',
        data: projects,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id
   * Fetch complete unified video project details across all 8 production stages
   */
  async getProjectById(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid project ID.' });
      }

      // 1. Fetch master project record
      const projects = await query(
        `SELECT vp.*,
                c.id AS course_id, c.code AS course_code, c.name AS course_name,
                u.name AS creator_name, u.email AS creator_email, u.department AS creator_department,
                anc.name AS anchor_name, anc.email AS anchor_email
         FROM video_projects vp
         JOIN courses c ON vp.course_id = c.id
         JOIN users u ON vp.created_by = u.id
         LEFT JOIN users anc ON vp.tentative_anchor_id = anc.id
         WHERE vp.id = ?`,
        [projectId]
      );

      if (!projects || projects.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Video project not found.' });
      }
      const project = projects[0];

      // 2. Fetch linked Content Scripting details
      const scripts = await query(
        `SELECT cs.*, u.name AS writer_name, u.email AS writer_email
         FROM content_scripts cs
         LEFT JOIN users u ON cs.writer_id = u.id
         WHERE cs.video_project_id = ?`,
        [projectId]
      );
      const script = scripts[0] || null;

      // 3. Fetch Cinematography Shoot & Crew Details
      const shoots = await query(
        `SELECT csh.*, u.name AS lead_cameraman_name, anc.name AS confirmed_anchor_name
         FROM cinematography_shoots csh
         LEFT JOIN users u ON csh.lead_cinematographer_id = u.id
         LEFT JOIN users anc ON csh.anchor_id = anc.id
         WHERE csh.video_project_id = ?`,
        [projectId]
      );
      const shoot = shoots[0] || null;

      let teamMembers = [];
      let scenes = [];
      if (shoot) {
        teamMembers = await query(
          `SELECT ctm.*, u.name, u.email
           FROM cinematography_team_members ctm
           JOIN users u ON ctm.user_id = u.id
           WHERE ctm.shoot_id = ?
           ORDER BY ctm.created_at ASC`,
          [shoot.id]
        );

        const rawScenes = await query(
          `SELECT * FROM video_scenes WHERE shoot_id = ? ORDER BY scene_number ASC`,
          [shoot.id]
        );

        if (rawScenes.length > 0) {
          const sceneIds = rawScenes.map((s) => s.id);
          const shots = await query(
            `SELECT * FROM video_shots WHERE scene_id IN (?) ORDER BY shot_number ASC, logged_at ASC`,
            [sceneIds]
          );

          scenes = rawScenes.map((sc) => ({
            ...sc,
            shots: shots.filter((sh) => sh.scene_id === sc.id),
          }));
        }
      }

      // 4. Fetch Raw Footage Handover records
      const handovers = await query(
        `SELECT fh.*,
                giver.name AS handed_over_by_name,
                receiver.name AS received_by_name
         FROM footage_handovers fh
         JOIN users giver ON fh.handed_over_by = giver.id
         LEFT JOIN users receiver ON fh.received_by = receiver.id
         WHERE fh.video_project_id = ?
         ORDER BY fh.created_at DESC`,
        [projectId]
      );

      // 5. Fetch Video Editing & Multi-Cut Versions
      const editAssignments = await query(
        `SELECT ea.*, u.name AS editor_name, u.email AS editor_email
         FROM editing_assignments ea
         LEFT JOIN users u ON ea.editor_id = u.id
         WHERE ea.video_project_id = ?`,
        [projectId]
      );
      const editingAssignment = editAssignments[0] || null;

      let editingVersions = [];
      if (editingAssignment) {
        editingVersions = await query(
          `SELECT ev.*,
                  vr.decision AS review_decision, vr.review_comments, vr.reviewed_at,
                  rev.name AS reviewer_name
           FROM editing_versions ev
           LEFT JOIN video_reviews vr ON ev.id = vr.editing_version_id
           LEFT JOIN users rev ON vr.reviewer_id = rev.id
           WHERE ev.editing_assignment_id = ?
           ORDER BY ev.version_number DESC`,
          [editingAssignment.id]
        );
      }

      // 6. Fetch Thumbnails
      const thumbnails = await query(
        `SELECT tn.*, u.name AS designer_name
         FROM thumbnails tn
         LEFT JOIN users u ON tn.designer_id = u.id
         WHERE tn.video_project_id = ?
         ORDER BY tn.version_number DESC`,
        [projectId]
      );

      // 7. Fetch Platform Publications (Instagram, Facebook, YouTube)
      const publications = await query(
        `SELECT pp.*, u.name AS publisher_name
         FROM platform_publications pp
         LEFT JOIN users u ON pp.published_by = u.id
         WHERE pp.video_project_id = ?
         ORDER BY pp.platform ASC`,
        [projectId]
      );

      return successResponse(res, {
        message: 'Comprehensive video project workspace retrieved.',
        data: {
          project,
          script,
          shoot: shoot ? { ...shoot, team_members: teamMembers, scenes } : null,
          footage_handovers: handovers,
          editing: editingAssignment ? { ...editingAssignment, versions: editingVersions } : null,
          thumbnails,
          publications,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/projects/drafts/:id
   * Edit video draft (Strict Ownership Guard: Creator only by default, Admin/DM Head override)
   */
  async updateDraft(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid project ID.' });
      }

      const data = updateDraftSchema.parse(req.body);
      const userId = req.user?.id;
      const isAdminOrManager = Boolean(
        req.user?.is_system_admin ||
        req.user?.role_code === 'ADMIN' ||
        req.user?.role_code === 'DM_HEAD'
      );

      const projects = await query(`SELECT * FROM video_projects WHERE id = ?`, [projectId]);
      if (!projects || projects.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Video draft not found.' });
      }
      const project = projects[0];

      // Ownership enforcement
      const isCreator = project.created_by === userId;
      if (!isCreator && !isAdminOrManager) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'FORBIDDEN_DRAFT_EDIT',
          message: 'Only the draft creator or authorized managers can edit draft details.',
        });
      }

      // If already submitted and user is not manager, freeze edits
      if (project.is_submitted_for_content && !isAdminOrManager) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'DRAFT_LOCKED_SUBMITTED',
          message: 'Draft has already been submitted for content writing. Contact manager for modifications.',
        });
      }

      await transaction(async (conn) => {
        await conn.query(
          `UPDATE video_projects SET
            title = ?, course_id = ?, category = ?, description = ?, priority = ?,
            proposed_shoot_date = ?, proposed_shoot_time = ?, location_type = ?,
            location_details = ?, tentative_anchor_id = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            data.title.trim(),
            data.course_id,
            data.category,
            data.description || null,
            data.priority,
            data.proposed_shoot_date || null,
            data.proposed_shoot_time || null,
            data.location_type,
            data.location_details,
            data.tentative_anchor_id || null,
            projectId,
          ]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'VIDEO_DRAFT_UPDATED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [userId, projectId, JSON.stringify({ title: data.title }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Video draft '${data.title}' updated successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/projects/drafts/:id/submit
   * Submit draft -> Enters Stage 2 (Content Writing) and becomes AVAILABLE to writers
   */
  async submitDraftForContent(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid project ID.' });
      }

      const userId = req.user?.id;
      const isAdminOrManager = Boolean(
        req.user?.is_system_admin ||
        req.user?.role_code === 'ADMIN' ||
        req.user?.role_code === 'DM_HEAD'
      );

      const projects = await query(`SELECT * FROM video_projects WHERE id = ?`, [projectId]);
      if (!projects || projects.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Video draft not found.' });
      }
      const project = projects[0];

      if (project.created_by !== userId && !isAdminOrManager) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'FORBIDDEN_DRAFT_SUBMIT',
          message: 'Only the draft creator or authorized managers can submit this draft.',
        });
      }

      if (project.is_submitted_for_content) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'ALREADY_SUBMITTED',
          message: 'This draft has already been submitted for content writing.',
        });
      }

      await transaction(async (conn) => {
        // 1. Transition project to CONTENT_WRITING
        await conn.query(
          `UPDATE video_projects SET
            current_stage = 'CONTENT_WRITING',
            overall_status = 'ACTIVE',
            is_submitted_for_content = TRUE,
            submitted_at = NOW(),
            updated_at = NOW()
           WHERE id = ?`,
          [projectId]
        );

        // 2. Set content_scripts status to AVAILABLE for writers to claim
        await conn.query(
          `UPDATE content_scripts SET status = 'AVAILABLE', updated_at = NOW()
           WHERE video_project_id = ?`,
          [projectId]
        );

        // 3. Notify Content Writers
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'CONTENT_WRITING_REQUIRED', 'New Video Draft for Scripting',
                  CONCAT('Video draft available for scriptwriting: ', ?), 'VIDEO_PROJECT', ?
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE (r.code IN ('CONTENT_WRITER', 'CONTENT_CREATOR', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
             AND u.status = 'ACTIVE'`,
          [project.title, projectId]
        );

        // 4. Log audit event
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'DRAFT_SUBMITTED_FOR_SCRIPTING', 'VIDEO_PROJECT', ?, ?, ?)`,
          [userId, projectId, JSON.stringify({ title: project.title, stage: 'CONTENT_WRITING' }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Video draft '${project.title}' submitted! Scriptwriting is now available for writers.`,
        data: {
          id: projectId,
          current_stage: 'CONTENT_WRITING',
          overall_status: 'ACTIVE',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/timeline
   * Chronological activity ledger for the video project
   */
  async getProjectTimeline(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid project ID.' });
      }

      const timeline = await query(
        `SELECT al.id, al.action, al.entity, al.entity_id, al.metadata, al.created_at,
                u.id AS actor_id, u.name AS actor_name, u.email AS actor_email,
                r.name AS actor_role_name, r.code AS actor_role_code
         FROM activity_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE al.entity = 'VIDEO_PROJECT' AND al.entity_id = ?
         ORDER BY al.created_at ASC`,
        [projectId]
      );

      return successResponse(res, {
        message: 'Project timeline retrieved successfully.',
        data: timeline,
      });
    } catch (error) {
      next(error);
    }
  },
};

