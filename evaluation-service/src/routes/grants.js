// evaluation-service/src/routes/grants.js
// Handle research grants and funding

import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/eval/teachers/:id/grants
 * Returns all grants for a teacher
 */
router.get("/teachers/:id/grants", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const { status } = req.query; // Optional filter by status

    let sql = `
      SELECT 
        id,
        teacher_id,
        title,
        funding_agency,
        grant_type,
        amount,
        currency,
        start_date,
        end_date,
        status,
        role,
        description,
        outcomes,
        created_at,
        updated_at
      FROM grants
      WHERE teacher_id = $1
    `;

    const values = [teacherId];

    // Optional status filter
    if (status) {
      sql += ` AND status = $2`;
      values.push(status);
    }

    sql += ` ORDER BY start_date DESC NULLS LAST`;

    const { rows } = await pool.query(sql, values);

    // Format data for frontend (map funding_agency to agency, format period)
    const formattedRows = rows.map(grant => {
      const startYear = grant.start_date ? new Date(grant.start_date).getFullYear() : 'N/A';
      const endYear = grant.end_date ? new Date(grant.end_date).getFullYear() : 'Present';
      
      return {
        ...grant,
        agency: grant.funding_agency,  // Map to expected field name
        period: grant.start_date ? `${startYear} - ${endYear}` : 'N/A'
      };
    });

    // Group by status
    const grouped = {
      active: formattedRows.filter(r => r.status === 'active'),
      completed: formattedRows.filter(r => r.status === 'completed'),
      pending: formattedRows.filter(r => r.status === 'pending'),
      declined: formattedRows.filter(r => r.status === 'declined')
    };

    // Calculate summaries
    const totalFunding = rows
      .filter(r => r.status === 'active' || r.status === 'completed')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const activeFunding = rows
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    res.json({
      all: formattedRows,
      grouped,
      summary: {
        total: rows.length,
        active: grouped.active.length,
        totalFunding,
        activeFunding,
        currency: rows[0]?.currency || 'USD'
      }
    });
  } catch (err) {
    console.error("GET /teachers/:id/grants error:", err);
    res.status(500).json({ error: "Failed to fetch grants" });
  }
});

/**
 * GET /api/eval/grants/:grantId
 * Get a single grant by ID
 */
router.get("/grants/:grantId", async (req, res) => {
  try {
    const { grantId } = req.params;

    const sql = `
      SELECT * FROM grants WHERE id = $1
    `;

    const { rows } = await pool.query(sql, [grantId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Grant not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /grants/:grantId error:", err);
    res.status(500).json({ error: "Failed to fetch grant" });
  }
});

/**
 * POST /api/eval/teachers/:id/grants
 * Create a new grant
 */
router.post("/teachers/:id/grants", async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const {
      title,
      funding_agency,
      grant_type,
      amount,
      currency,
      start_date,
      end_date,
      status,
      role,
      description,
      outcomes
    } = req.body;

    // Validation
    if (!title || !funding_agency || !amount || !start_date) {
      return res.status(400).json({ 
        error: "title, funding_agency, amount, and start_date are required" 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "amount must be greater than 0" });
    }

    const validStatuses = ['pending', 'active', 'completed', 'declined'];
    const grantStatus = status || 'active';
    if (!validStatuses.includes(grantStatus)) {
      return res.status(400).json({ 
        error: `status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const sql = `
      INSERT INTO grants (
        teacher_id, title, funding_agency, grant_type, amount, currency,
        start_date, end_date, status, role, description, outcomes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      teacherId,
      title,
      funding_agency,
      grant_type || null,
      amount,
      currency || 'USD',
      start_date,
      end_date || null,
      grantStatus,
      role || 'PI',
      description || null,
      outcomes || null
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /teachers/:id/grants error:", err);
    res.status(500).json({ error: "Failed to create grant" });
  }
});

/**
 * PATCH /api/eval/grants/:grantId
 * Update a grant
 */
router.patch("/grants/:grantId", async (req, res) => {
  try {
    const { grantId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'title', 'funding_agency', 'grant_type', 'amount', 'currency',
      'start_date', 'end_date', 'status', 'role', 'description', 'outcomes'
    ];
    
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        // Validate status if being updated
        if (key === 'status') {
          const validStatuses = ['pending', 'active', 'completed', 'declined'];
          if (!validStatuses.includes(updates[key])) {
            throw new Error(`Invalid status: ${updates[key]}`);
          }
        }
        
        // Validate amount if being updated
        if (key === 'amount' && updates[key] <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        setClause.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    setClause.push(`updated_at = NOW()`);
    values.push(grantId);

    const sql = `
      UPDATE grants
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Grant not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /grants/:grantId error:", err);
    
    if (err.message.includes('Invalid status') || err.message.includes('Amount must')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Failed to update grant" });
  }
});

/**
 * DELETE /api/eval/grants/:grantId
 * Delete a grant
 */
router.delete("/grants/:grantId", async (req, res) => {
  try {
    const { grantId } = req.params;

    const sql = `
      DELETE FROM grants
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await pool.query(sql, [grantId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Grant not found" });
    }

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("DELETE /grants/:grantId error:", err);
    res.status(500).json({ error: "Failed to delete grant" });
  }
});

/**
 * GET /api/eval/grants/summary/stats
 * Get overall grants statistics (admin view)
 */
router.get("/grants/summary/stats", async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_grants,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_grants,
        SUM(CASE WHEN status IN ('active', 'completed') THEN amount ELSE 0 END) as total_funding,
        SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as active_funding,
        COUNT(DISTINCT teacher_id) as teachers_with_grants
      FROM grants
    `;

    const { rows } = await pool.query(sql);

    res.json({
      statistics: {
        totalGrants: parseInt(rows[0].total_grants),
        activeGrants: parseInt(rows[0].active_grants),
        totalFunding: parseFloat(rows[0].total_funding || 0),
        activeFunding: parseFloat(rows[0].active_funding || 0),
        teachersWithGrants: parseInt(rows[0].teachers_with_grants)
      }
    });
  } catch (err) {
    console.error("GET /grants/summary/stats error:", err);
    res.status(500).json({ error: "Failed to fetch grant statistics" });
  }
});

export default router;

