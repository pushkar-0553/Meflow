import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const MIGRATIONS = [
  // 1. Roles
  `CREATE TABLE IF NOT EXISTS roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_system_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 2. Permissions
  `CREATE TABLE IF NOT EXISTS permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_permissions_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. Role Permissions
  `CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 4. Users
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'Marketing',
    phone VARCHAR(20) NULL,
    profile_image_url VARCHAR(500) NULL,
    status ENUM('INVITED', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'INVITED',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_users_status (status),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 5. User Permissions (Overrides)
  `CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    effect ENUM('ALLOW', 'DENY') NOT NULL DEFAULT 'ALLOW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_id),
    CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_up_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 6. Sessions (express-mysql-session)
  `CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(128) NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expired INT UNSIGNED NOT NULL,
    INDEX idx_sessions_expired (expired)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 7. Invitation Tokens
  `CREATE TABLE IF NOT EXISTS invitation_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invitations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_invitations_lookup (token_hash, used_at, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 8. Password Reset Tokens
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pwd_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pwd_reset_lookup (token_hash, used_at, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 9. Tasks
  `CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    campaign_name VARCHAR(100) NULL,
    course_code VARCHAR(50) NULL,
    content_type ENUM('PROMOTIONAL_VIDEO', 'REEL_SHORT', 'STUDENT_SUCCESS_STORY', 'WEBINAR_TEASER', 'EVENT_COVERAGE', 'GRAPHIC_BANNER') NOT NULL,
    description TEXT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('SCHEDULED', 'AVAILABLE', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED', 'DELAYED') NOT NULL DEFAULT 'AVAILABLE',
    scheduled_start TIMESTAMP NULL,
    scheduled_end TIMESTAMP NULL,
    expected_duration_minutes INT UNSIGNED NULL,
    location VARCHAR(200) NULL DEFAULT 'VCube Studio',
    proof_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_schedule (scheduled_start),
    INDEX idx_tasks_priority (priority)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 10. Task Stages
  `CREATE TABLE IF NOT EXISTS task_stages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id INT UNSIGNED NOT NULL,
    stage_type ENUM('SHOOT', 'RAW_FOOTAGE', 'EDITING', 'FIRST_CUT', 'REVIEW', 'FINAL_CUT', 'SEO', 'PUBLISHED') NOT NULL,
    sequence_order SMALLINT UNSIGNED NOT NULL,
    target_role_id INT UNSIGNED NOT NULL,
    status ENUM('PENDING', 'READY', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    is_approval_gate BOOLEAN NOT NULL DEFAULT FALSE,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ts_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_target_role FOREIGN KEY (target_role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_task_stage_seq (task_id, sequence_order),
    INDEX idx_ts_pool (target_role_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 11. Task Stage Assignments
  `CREATE TABLE IF NOT EXISTS task_stage_assignments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_stage_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    assigned_by INT UNSIGNED NULL,
    assignment_type ENUM('SELF_CLAIM', 'ADMIN_DIRECT') NOT NULL DEFAULT 'SELF_CLAIM',
    status ENUM('ACCEPTED', 'IN_PROGRESS', 'RELEASED', 'COMPLETED') NOT NULL DEFAULT 'ACCEPTED',
    accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_tsa_stage FOREIGN KEY (task_stage_id) REFERENCES task_stages(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tsa_user_status (user_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 12. Proofs
  `CREATE TABLE IF NOT EXISTS proofs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_stage_id INT UNSIGNED NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    proof_type ENUM('CLOUD_DRIVE_URL', 'DIRECT_FILE', 'SOCIAL_POST_URL', 'TEXT_NOTE') NOT NULL,
    title VARCHAR(150) NULL,
    file_key VARCHAR(500) NULL,
    public_url VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NULL,
    file_size_bytes BIGINT UNSIGNED NULL,
    revision_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_proofs_stage FOREIGN KEY (task_stage_id) REFERENCES task_stages(id) ON DELETE CASCADE,
    CONSTRAINT fk_proofs_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_proofs_stage (task_stage_id, revision_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 13. Stage Approvals
  `CREATE TABLE IF NOT EXISTS stage_approvals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_stage_id INT UNSIGNED NOT NULL,
    reviewer_id INT UNSIGNED NOT NULL,
    decision ENUM('APPROVED', 'CHANGES_REQUESTED') NOT NULL,
    rework_comments TEXT NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approvals_stage FOREIGN KEY (task_stage_id) REFERENCES task_stages(id) ON DELETE CASCADE,
    CONSTRAINT fk_approvals_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_approvals_stage (task_stage_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 14. Social Publications
  `CREATE TABLE IF NOT EXISTS social_publications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id INT UNSIGNED NOT NULL,
    published_by INT UNSIGNED NOT NULL,
    platform ENUM('YOUTUBE', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'X_TWITTER', 'WEBSITE', 'OTHER') NOT NULL,
    post_url VARCHAR(1000) NOT NULL,
    caption TEXT NULL,
    screenshot_proof_url VARCHAR(1000) NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pub_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_pub_user FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_pub_task (task_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 15. Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    reference_entity VARCHAR(50) NULL,
    reference_id INT UNSIGNED NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_unread (user_id, is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 16. Activity Logs
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT UNSIGNED NOT NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_entity (entity, entity_id),
    INDEX idx_audit_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 17. Courses (Academic programs & campaigns)
  `CREATE TABLE IF NOT EXISTS courses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_courses_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 18. Video Projects (The Central Master Entity for All Lifecycle Stages)
  `CREATE TABLE IF NOT EXISTS video_projects (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    category ENUM(
      'PROJECT_EXPLANATION', 'COURSE_PROMO', 'REEL_SHORT',
      'STUDENT_SUCCESS_STORY', 'WEBINAR_TEASER', 'EVENT_COVERAGE',
      'TUTORIAL_CONCEPT', 'FACULTY_INSIGHT'
    ) NOT NULL DEFAULT 'PROJECT_EXPLANATION',
    description TEXT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    
    current_stage ENUM(
      'DRAFT_PLANNING', 'CONTENT_WRITING', 'CINEMATOGRAPHY',
      'FOOTAGE_HANDOVER', 'VIDEO_EDITING', 'REVIEW_APPROVAL',
      'THUMBNAIL_PREP', 'PUBLISHING', 'PUBLISHED', 'ARCHIVED'
    ) NOT NULL DEFAULT 'DRAFT_PLANNING',
    overall_status ENUM('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',

    proposed_shoot_date DATE NULL,
    proposed_shoot_time TIME NULL,
    location_type ENUM('STUDIO', 'EXTERNAL') NOT NULL DEFAULT 'STUDIO',
    location_details VARCHAR(255) NULL DEFAULT 'VCube Studio Main Floor',
    tentative_anchor_id INT UNSIGNED NULL,

    created_by INT UNSIGNED NOT NULL,
    is_submitted_for_content BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_vp_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vp_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vp_anchor FOREIGN KEY (tentative_anchor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vp_stage (current_stage),
    INDEX idx_vp_status (overall_status),
    INDEX idx_vp_shoot (proposed_shoot_date),
    INDEX idx_vp_creator (created_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 19. Content Writing & Scripting Table
  `CREATE TABLE IF NOT EXISTS content_scripts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_project_id INT UNSIGNED NOT NULL UNIQUE,
    writer_id INT UNSIGNED NULL,
    status ENUM(
      'NOT_STARTED', 'AVAILABLE', 'ACCEPTED',
      'IN_PROGRESS', 'SCRIPT_READY', 'SUBMITTED',
      'APPROVED', 'CHANGES_REQUESTED'
    ) NOT NULL DEFAULT 'AVAILABLE',
    google_docs_url VARCHAR(1000) NULL,
    script_version INT UNSIGNED NOT NULL DEFAULT 1,
    content_notes TEXT NULL,
    reviewer_feedback TEXT NULL,
    accepted_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    submitted_at TIMESTAMP NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cs_project FOREIGN KEY (video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_cs_writer FOREIGN KEY (writer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cs_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 20. Cinematography Shoot Workspace Table
  `CREATE TABLE IF NOT EXISTS cinematography_shoots (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_project_id INT UNSIGNED NOT NULL UNIQUE,
    lead_cinematographer_id INT UNSIGNED NULL,
    anchor_id INT UNSIGNED NULL,
    status ENUM('AVAILABLE', 'ACCEPTED', 'IN_PROGRESS', 'SHOOT_COMPLETED', 'RELEASED') NOT NULL DEFAULT 'AVAILABLE',
    version INT UNSIGNED NOT NULL DEFAULT 1,
    actual_shoot_date DATE NULL,
    actual_start_time TIME NULL,
    actual_end_time TIME NULL,
    studio_details VARCHAR(255) NULL,
    camera_gear_notes VARCHAR(500) NULL,
    shoot_notes TEXT NULL,
    accepted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cshoots_project FOREIGN KEY (video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_cshoots_lead FOREIGN KEY (lead_cinematographer_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cshoots_anchor FOREIGN KEY (anchor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cshoots_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 21. Cinematography Team Members (Multi-Worker Mapping)
  `CREATE TABLE IF NOT EXISTS cinematography_team_members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shoot_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    team_role ENUM('LEAD_CAMERAMAN', 'SECOND_CAMERA', 'ANCHOR', 'LIGHTING_ASSISTANT', 'AUDIO_TECH') NOT NULL,
    assigned_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ctm_shoot FOREIGN KEY (shoot_id) REFERENCES cinematography_shoots(id) ON DELETE CASCADE,
    CONSTRAINT fk_ctm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_shoot_user (shoot_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 22. Video Scenes Table
  `CREATE TABLE IF NOT EXISTS video_scenes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shoot_id INT UNSIGNED NOT NULL,
    scene_number SMALLINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vs_shoot FOREIGN KEY (shoot_id) REFERENCES cinematography_shoots(id) ON DELETE CASCADE,
    UNIQUE KEY uk_shoot_scene (shoot_id, scene_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 23. Video Shots Log Table (Chronological Scene & Shot Logging)
  `CREATE TABLE IF NOT EXISTS video_shots (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scene_id INT UNSIGNED NOT NULL,
    shot_number SMALLINT UNSIGNED NOT NULL,
    clip_file_name VARCHAR(100) NOT NULL,
    dialogue_reference TEXT NULL,
    take_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('RECORDED', 'CONFIRMED', 'REJECTED', 'UNUSABLE', 'RETAKE_REQUIRED') NOT NULL DEFAULT 'RECORDED',
    notes VARCHAR(500) NULL,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vshots_scene FOREIGN KEY (scene_id) REFERENCES video_scenes(id) ON DELETE CASCADE,
    INDEX idx_scene_shots (scene_id, shot_number),
    INDEX idx_shot_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 24. Raw Footage Handover Table
  `CREATE TABLE IF NOT EXISTS footage_handovers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_project_id INT UNSIGNED NOT NULL,
    handed_over_by INT UNSIGNED NOT NULL,
    received_by INT UNSIGNED NULL,
    status ENUM(
      'SHOOT_COMPLETED', 'AWAITING_HANDOVER', 'HANDED_OVER',
      'RECEIVED_BY_EDITOR', 'FOOTAGE_COPIED', 'READY_FOR_EDITING'
    ) NOT NULL DEFAULT 'AWAITING_HANDOVER',
    storage_media_identifier VARCHAR(100) NOT NULL,
    footage_folder_name VARCHAR(200) NOT NULL,
    footage_storage_url VARCHAR(1000) NULL,
    notes TEXT NULL,
    handed_over_at TIMESTAMP NULL,
    received_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_fh_project FOREIGN KEY (video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_fh_giver FOREIGN KEY (handed_over_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fh_receiver FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_fh_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 25. Video Editing Workspace & Assignments
  `CREATE TABLE IF NOT EXISTS editing_assignments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_project_id INT UNSIGNED NOT NULL UNIQUE,
    editor_id INT UNSIGNED NULL,
    status ENUM(
      'AVAILABLE', 'ACCEPTED', 'EDITING_STARTED',
      'EDITING_IN_PROGRESS', 'FIRST_CUT_READY', 'UNDER_REVIEW',
      'CHANGES_REQUESTED', 'FINAL_CUT_READY', 'COMPLETED'
    ) NOT NULL DEFAULT 'AVAILABLE',
    version INT UNSIGNED NOT NULL DEFAULT 1,
    accepted_at TIMESTAMP NULL,
    editing_started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ea_project FOREIGN KEY (video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_ea_editor FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ea_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 26. Multi-Version Editing Cuts
  `CREATE TABLE IF NOT EXISTS editing_versions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    editing_assignment_id INT UNSIGNED NOT NULL,
    version_number INT UNSIGNED NOT NULL DEFAULT 1,
    cut_type ENUM('FIRST_CUT', 'ROUGH_CUT', 'REWORK_CUT', 'FINAL_CUT') NOT NULL,
    cut_video_url VARCHAR(1000) NOT NULL,
    duration_seconds INT UNSIGNED NULL,
    editor_notes TEXT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ev_assignment FOREIGN KEY (editing_assignment_id) REFERENCES editing_assignments(id) ON DELETE CASCADE,
    INDEX idx_ev_version (editing_assignment_id, version_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 27. Review & Approval History
  `CREATE TABLE IF NOT EXISTS video_reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    editing_version_id INT UNSIGNED NOT NULL,
    reviewer_id INT UNSIGNED NOT NULL,
    decision ENUM('APPROVED', 'CHANGES_REQUESTED') NOT NULL,
    review_comments TEXT NOT NULL,
    rework_required_notes TEXT NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vr_version FOREIGN KEY (editing_version_id) REFERENCES editing_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_vr_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 28. Thumbnails Management Table
  `CREATE TABLE IF NOT EXISTS thumbnails (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_project_id INT UNSIGNED NOT NULL,
    designer_id INT UNSIGNED NULL,
    thumbnail_url VARCHAR(1000) NOT NULL,
    version_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED') NOT NULL DEFAULT 'DRAFT',
    feedback_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tn_project FOREIGN KEY (video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tn_designer FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tn_project (video_project_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 29. Platform Publications (Independent Multi-Channel Distribution)
  `CREATE TABLE IF NOT EXISTS platform_publications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_project_id INT UNSIGNED NOT NULL,
    platform ENUM('INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'LINKEDIN', 'WEBSITE', 'OTHER') NOT NULL,
    status ENUM('PENDING', 'SCHEDULED', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    published_by INT UNSIGNED NULL,
    published_at TIMESTAMP NULL,
    post_url VARCHAR(1000) NULL,
    caption TEXT NULL,
    hashtags VARCHAR(500) NULL,
    thumbnail_url VARCHAR(1000) NULL,
    proof_screenshot_url VARCHAR(1000) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ppub_project FOREIGN KEY (video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_ppub_publisher FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_project_platform (video_project_id, platform),
    INDEX idx_ppub_platform_status (platform, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

export async function runMigrations() {
  logger.info('Starting database migrations...');
  const connection = await pool.getConnection();

  try {
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const sql = MIGRATIONS[i];
      await connection.query(sql);
    }
    logger.success(`Database migrations completed successfully (${MIGRATIONS.length} tables verified/created).`);
    return { success: true, count: MIGRATIONS.length };
  } catch (error) {
    logger.error('Database migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Direct execution from CLI
if (process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

