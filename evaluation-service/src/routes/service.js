// evaluation-service/src/routes/service.js
// Handle service activities (committee work, community service, professional orgs)

import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/eval/teachers/:id/service
 * Returns all service activities for a teacher
 */
router.get("/teachers/:id/service", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    console.log(`✅ GET /teachers/${teacherId}/service called`);

    const sql = `
      SELECT 
        id,
        teacher_id,
        activity_type,
        name,
        role,
        organization,
        start_date,
        end_date,
        hours,
        description,
        impact,
        created_at,
        updated_at
      FROM service_activities
      WHERE teacher_id = $1
      ORDER BY 
        CASE 
          WHEN end_date IS NULL THEN 0  -- Current activities first
          ELSE 1
        END,
        start_date DESC NULLS LAST
    `;

    const { rows } = await pool.query(sql, [teacherId]);

    // Group by activity type for easier frontend consumption
    const grouped = {
      committee: rows.filter(r => r.activity_type === 'committee'),
      community: rows.filter(r => r.activity_type === 'community'),
      department: rows.filter(r => r.activity_type === 'department'),
      professional_org: rows.filter(r => r.activity_type === 'professional_org'),
    };

    res.json({
      all: rows,
      grouped,
      summary: {
        total: rows.length,
        totalHours: rows.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0),
        active: rows.filter(r => !r.end_date || new Date(r.end_date) >= new Date()).length
      }
    });
  } catch (err) {
    console.error("GET /teachers/:id/service error:", err);
    res.status(500).json({ error: "Failed to fetch service activities" });
  }
});

/**
 * POST /api/eval/teachers/:id/service
 * Create a new service activity
 */
router.post("/teachers/:id/service", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const {
      activity_type,
      name,
      role,
      organization,
      start_date,
      end_date,
      hours,
      description,
      impact
    } = req.body;

    // Validation
    if (!activity_type || !name) {
      return res.status(400).json({ 
        error: "activity_type and name are required" 
      });
    }

    const validTypes = ['committee', 'community', 'department', 'professional_org'];
    if (!validTypes.includes(activity_type)) {
      return res.status(400).json({ 
        error: `activity_type must be one of: ${validTypes.join(', ')}` 
      });
    }

    const sql = `
      INSERT INTO service_activities (
        teacher_id, activity_type, name, role, organization,
        start_date, end_date, hours, description, impact
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      teacherId,
      activity_type,
      name,
      role || null,
      organization || null,
      start_date || null,
      end_date || null,
      hours || null,
      description || null,
      impact || null
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /teachers/:id/service error:", err);
    res.status(500).json({ error: "Failed to create service activity" });
  }
});

/**
 * PATCH /api/eval/service/:activityId
 * Update a service activity
 */
router.patch("/service/:activityId", async (req, res) => {
  try {
    const { activityId } = req.params;
    const updates = req.body;

    // Build dynamic UPDATE query
    const allowedFields = [
      'activity_type', 'name', 'role', 'organization',
      'start_date', 'end_date', 'hours', 'description', 'impact'
    ];
    
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    setClause.push(`updated_at = NOW()`);
    values.push(activityId);

    const sql = `
      UPDATE service_activities
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Service activity not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /service/:activityId error:", err);
    res.status(500).json({ error: "Failed to update service activity" });
  }
});

/**
 * DELETE /api/eval/service/:activityId
 * Delete a service activity
 */
router.delete("/service/:activityId", async (req, res) => {
  try {
    const { activityId } = req.params;

    const sql = `
      DELETE FROM service_activities
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await pool.query(sql, [activityId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Service activity not found" });
    }

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("DELETE /service/:activityId error:", err);
    res.status(500).json({ error: "Failed to delete service activity" });
  }
});

export default router;

