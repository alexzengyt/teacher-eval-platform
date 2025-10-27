// evaluation-service/src/routes/career.js
// Handle career history and awards

import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/eval/teachers/:id/career
 * Returns career timeline (employment history)
 */
router.get("/teachers/:id/career", async (req, res) => {
  try {
    const { id: teacherId } = req.params;

    const sql = `
      SELECT 
        id,
        teacher_id,
        position,
        institution,
        department,
        location,
        start_date,
        end_date,
        is_current,
        responsibilities,
        achievements,
        created_at,
        updated_at
      FROM career_history
      WHERE teacher_id = $1
      ORDER BY 
        is_current DESC,  -- Current position first
        start_date DESC NULLS LAST
    `;

    const { rows } = await pool.query(sql, [teacherId]);

    res.json({
      timeline: rows,
      summary: {
        total: rows.length,
        currentPosition: rows.find(r => r.is_current),
        yearsExperience: calculateExperience(rows)
      }
    });
  } catch (err) {
    console.error("GET /teachers/:id/career error:", err);
    res.status(500).json({ error: "Failed to fetch career history" });
  }
});

/**
 * GET /api/eval/teachers/:id/awards
 * Returns awards and recognition
 */
router.get("/teachers/:id/awards", async (req, res) => {
  try {
    const { id: teacherId } = req.params;

    const sql = `
      SELECT 
        id,
        teacher_id,
        title,
        organization,
        award_type,
        awarded_date,
        amount,
        description,
        significance,
        created_at,
        updated_at
      FROM awards
      WHERE teacher_id = $1
      ORDER BY awarded_date DESC NULLS LAST
    `;

    const { rows } = await pool.query(sql, [teacherId]);

    // Group by award type
    const grouped = {
      teaching: rows.filter(r => r.award_type === 'teaching'),
      research: rows.filter(r => r.award_type === 'research'),
      service: rows.filter(r => r.award_type === 'service'),
      leadership: rows.filter(r => r.award_type === 'leadership'),
      other: rows.filter(r => r.award_type === 'other' || !r.award_type)
    };

    res.json({
      all: rows,
      grouped,
      summary: {
        total: rows.length,
        totalMonetaryValue: rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
      }
    });
  } catch (err) {
    console.error("GET /teachers/:id/awards error:", err);
    res.status(500).json({ error: "Failed to fetch awards" });
  }
});

/**
 * POST /api/eval/teachers/:id/career
 * Create a new career position
 */
router.post("/teachers/:id/career", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const {
      position,
      institution,
      department,
      location,
      start_date,
      end_date,
      is_current,
      responsibilities,
      achievements
    } = req.body;

    // Validation
    if (!position || !institution || !start_date) {
      return res.status(400).json({ 
        error: "position, institution, and start_date are required" 
      });
    }

    // If marking as current, unset other current positions
    if (is_current) {
      await pool.query(
        `UPDATE career_history SET is_current = false WHERE teacher_id = $1`,
        [teacherId]
      );
    }

    const sql = `
      INSERT INTO career_history (
        teacher_id, position, institution, department, location,
        start_date, end_date, is_current, responsibilities, achievements
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      teacherId,
      position,
      institution,
      department || null,
      location || null,
      start_date,
      end_date || null,
      is_current || false,
      responsibilities || null,
      achievements || null
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /teachers/:id/career error:", err);
    res.status(500).json({ error: "Failed to create career record" });
  }
});

/**
 * POST /api/eval/teachers/:id/awards
 * Create a new award
 */
router.post("/teachers/:id/awards", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const {
      title,
      organization,
      award_type,
      awarded_date,
      amount,
      description,
      significance
    } = req.body;

    // Validation
    if (!title || !organization || !awarded_date) {
      return res.status(400).json({ 
        error: "title, organization, and awarded_date are required" 
      });
    }

    const sql = `
      INSERT INTO awards (
        teacher_id, title, organization, award_type,
        awarded_date, amount, description, significance
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      teacherId,
      title,
      organization,
      award_type || null,
      awarded_date,
      amount || null,
      description || null,
      significance || null
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /teachers/:id/awards error:", err);
    res.status(500).json({ error: "Failed to create award" });
  }
});

/**
 * PATCH /api/eval/career/:careerId
 * Update a career record
 */
router.patch("/career/:careerId", async (req, res) => {
  try {
    const { careerId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'position', 'institution', 'department', 'location',
      'start_date', 'end_date', 'is_current', 'responsibilities', 'achievements'
    ];
    
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // If marking as current, first unset others
    if (updates.is_current === true) {
      const teacherResult = await pool.query(
        `SELECT teacher_id FROM career_history WHERE id = $1`,
        [careerId]
      );
      if (teacherResult.rows.length > 0) {
        await pool.query(
          `UPDATE career_history SET is_current = false WHERE teacher_id = $1 AND id != $2`,
          [teacherResult.rows[0].teacher_id, careerId]
        );
      }
    }

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
    values.push(careerId);

    const sql = `
      UPDATE career_history
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Career record not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /career/:careerId error:", err);
    res.status(500).json({ error: "Failed to update career record" });
  }
});

/**
 * DELETE /api/eval/career/:careerId
 * Delete a career record
 */
router.delete("/career/:careerId", async (req, res) => {
  try {
    const { careerId } = req.params;

    const sql = `
      DELETE FROM career_history
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await pool.query(sql, [careerId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Career record not found" });
    }

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("DELETE /career/:careerId error:", err);
    res.status(500).json({ error: "Failed to delete career record" });
  }
});

/**
 * DELETE /api/eval/awards/:awardId
 * Delete an award
 */
router.delete("/awards/:awardId", async (req, res) => {
  try {
    const { awardId } = req.params;

    const sql = `
      DELETE FROM awards
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await pool.query(sql, [awardId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Award not found" });
    }

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("DELETE /awards/:awardId error:", err);
    res.status(500).json({ error: "Failed to delete award" });
  }
});

// Helper function to calculate years of experience
function calculateExperience(careerRecords) {
  if (!careerRecords || careerRecords.length === 0) return 0;

  let totalMonths = 0;
  
  careerRecords.forEach(record => {
    if (!record.start_date) return;
    
    const start = new Date(record.start_date);
    const end = record.end_date ? new Date(record.end_date) : new Date();
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    
    totalMonths += Math.max(0, months);
  });

  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
}

export default router;

