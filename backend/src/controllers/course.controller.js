import { z } from 'zod';
import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const createCourseSchema = z.object({
  code: z.string().min(2, 'Course code is required').max(50),
  name: z.string().min(2, 'Course name is required').max(150),
  description: z.string().optional().nullable(),
});

export const courseController = {
  /**
   * GET /api/courses
   * List all active courses for filters and dropdowns
   */
  async getAllCourses(req, res, next) {
    try {
      const courses = await query(
        `SELECT id, code, name, description, is_active, created_at
         FROM courses
         WHERE is_active = TRUE
         ORDER BY name ASC`
      );

      return successResponse(res, {
        message: 'Courses catalog retrieved successfully.',
        data: courses,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/courses
   * Add a new course (Admin or DM Head)
   */
  async createCourse(req, res, next) {
    try {
      const data = createCourseSchema.parse(req.body);

      const existing = await query(`SELECT id FROM courses WHERE LOWER(code) = LOWER(?)`, [data.code.trim()]);
      if (existing.length > 0) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'COURSE_ALREADY_EXISTS',
          message: `A course with code '${data.code}' already exists.`,
        });
      }

      const [result] = await query(
        `INSERT INTO courses (code, name, description, is_active)
         VALUES (?, ?, ?, TRUE)`,
        [data.code.trim().toUpperCase(), data.name.trim(), data.description || null]
      );

      return successResponse(res, {
        statusCode: 201,
        message: `Course '${data.name}' created successfully.`,
        data: {
          id: result.insertId,
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          description: data.description || null,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
