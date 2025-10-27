// evaluation-service/src/routes/education.js
// Handle education history (degrees, certifications)

import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/eval/teachers/:id/education
 * Returns education history for a teacher (degrees)
 */
router.get("/teachers/:id/education", async (req, res) => {
  try {
    const { id: teacherId } = req.params;

    const sql = `
      SELECT 
        id,
        teacher_id,
        degree,
        field,
        institution,
        location,
        graduation_year,
        gpa,
        honors,
        thesis_title,
        advisor,
        created_at,
        updated_at
      FROM education_history
      WHERE teacher_id = $1
      ORDER BY graduation_year DESC NULLS LAST
    `;

    const { rows } = await pool.query(sql, [teacherId]);

    res.json(rows);
  } catch (err) {
    console.error("GET /teachers/:id/education error:", err);
    res.status(500).json({ error: "Failed to fetch education history" });
  }
});

/**
 * POST /api/eval/teachers/:id/education
 * Create a new education record
 */
router.post("/teachers/:id/education", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const {
      degree,
      field,
      institution,
      location,
      graduation_year,
      gpa,
      honors,
      thesis_title,
      advisor
    } = req.body;

    // Validation
    if (!degree || !field || !institution) {
      return res.status(400).json({ 
        error: "degree, field, and institution are required" 
      });
    }

    const sql = `
      INSERT INTO education_history (
        teacher_id, degree, field, institution, location,
        graduation_year, gpa, honors, thesis_title, advisor
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      teacherId,
      degree,
      field,
      institution,
      location || null,
      graduation_year || null,
      gpa || null,
      honors || null,
      thesis_title || null,
      advisor || null
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /teachers/:id/education error:", err);
    res.status(500).json({ error: "Failed to create education record" });
  }
});

/**
 * PATCH /api/eval/education/:educationId
 * Update an education record
 */
router.patch("/education/:educationId", async (req, res) => {
  try {
    const { educationId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'degree', 'field', 'institution', 'location', 'graduation_year',
      'gpa', 'honors', 'thesis_title', 'advisor'
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
    values.push(educationId);

    const sql = `
      UPDATE education_history
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Education record not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /education/:educationId error:", err);
    res.status(500).json({ error: "Failed to update education record" });
  }
});

/**
 * DELETE /api/eval/education/:educationId
 * Delete an education record
 */
router.delete("/education/:educationId", async (req, res) => {
  try {
    const { educationId } = req.params;

    const sql = `
      DELETE FROM education_history
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await pool.query(sql, [educationId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Education record not found" });
    }

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("DELETE /education/:educationId error:", err);
    res.status(500).json({ error: "Failed to delete education record" });
  }
});

export default router;

