// =========================
// Professional Development Recommendations API
// Purpose: Recommend PD courses based on evaluation weaknesses
// =========================

import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET /api/eval/teachers/:id/recommendations
// Get personalized PD course recommendations for a teacher
router.get("/teachers/:id/recommendations", async (req, res) => {
  try {
    const { id } = req.params;

    // Get teacher's latest evaluation
    const evalResult = await pool.query(
      `SELECT metadata->'radar' as radar, period
       FROM evaluations
       WHERE teacher_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    );

    if (evalResult.rows.length === 0) {
      return res.json({ recommendations: [] });
    }

    const radar = evalResult.rows[0].radar;
    const threshold = 4.0; // Recommend for scores below 4.0

    const scores = {
      teaching: parseFloat(radar?.teaching || 0),
      research: parseFloat(radar?.research || 0),
      service: parseFloat(radar?.service || 0),
      professional_development: parseFloat(radar?.professional_development || 0)
    };

    // Identify weak areas (below 4.0 threshold)
    const weaknesses = [];
    Object.entries(scores).forEach(([key, value]) => {
      if (value < threshold) {
        weaknesses.push(key);
      }
    });

    // Get recommended courses based on weaknesses
    let recommendations = [];

    if (weaknesses.length > 0) {
      const placeholders = weaknesses.map((_, i) => `$${i + 1}`).join(', ');
      
      const coursesResult = await pool.query(
        `SELECT 
          id,
          title,
          provider,
          hours,
          category,
          description
         FROM pd_courses
         WHERE category = ANY(ARRAY[${placeholders}])
         ORDER BY hours DESC
         LIMIT 5`,
        weaknesses
      );

      recommendations = coursesResult.rows.map(course => ({
        id: course.id,
        title: course.title,
        provider: course.provider,
        hours: parseFloat(course.hours || 0),
        category: course.category,
        description: course.description,
        reason: `Improve your ${course.category} skills`,
        targetScore: threshold + 0.5
      }));
    }

    res.json({
      weaknesses,
      recommendations,
      currentScores: scores
    });
  } catch (err) {
    console.error("Get recommendations error:", err);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

export default router;

