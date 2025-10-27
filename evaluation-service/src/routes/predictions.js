// =========================
// Predictive Analytics API
// Purpose: Forecast next semester performance with/without PD courses
// =========================

import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET /api/eval/teachers/:id/predictions
// Get performance predictions for next semester
router.get("/teachers/:id/predictions", async (req, res) => {
  try {
    const { id } = req.params;

    // Get historical evaluations (last 4 semesters)
    const historyResult = await pool.query(
      `SELECT 
        period,
        overall_score,
        metadata->'radar' as radar,
        created_at
       FROM evaluations
       WHERE teacher_id = $1
       ORDER BY created_at DESC
       LIMIT 4`,
      [id]
    );

    if (historyResult.rows.length < 2) {
      return res.json({
        forecast: null,
        message: "Need at least 2 historical evaluations to generate predictions"
      });
    }

    const history = historyResult.rows.reverse(); // Oldest first

    // Extract radar scores for each dimension
    const dimensions = ['teaching', 'research', 'service', 'professional_development'];
    const dimensionData = {};

    dimensions.forEach(dim => {
      const scores = history.map(e => parseFloat(e.radar?.[dim] || 0));
      dimensionData[dim] = scores;
    });

    // Calculate trends for each dimension
    const trends = {};
    const forecasts = {};
    const baseForecasts = {};

    dimensions.forEach(dim => {
      const scores = dimensionData[dim];
      
      // Simple linear regression for trend
      const n = scores.length;
      const sumX = n * (n + 1) / 2; // Sum of 1+2+...+n
      const sumY = scores.reduce((a, b) => a + b, 0);
      const sumXY = scores.reduce((sum, val, i) => sum + (i + 1) * val, 0);
      const sumX2 = n * (n + 1) * (2 * n + 1) / 6; // Sum of 1²+2²+...+n²
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      trends[dim] = slope;
      
      // Forecast next semester (same trend)
      const nextScore = intercept + slope * (n + 1);
      
      baseForecasts[dim] = Math.max(0, Math.min(5, nextScore)); // Clamp 0-5
      
      // With PD course (assume 0.3-0.5 boost in weak areas)
      let pdBoost = 0;
      if (nextScore < 4.0) {
        pdBoost = 0.4; // Stronger boost if below 4.0
      } else if (nextScore < 4.5) {
        pdBoost = 0.2; // Moderate boost if between 4.0-4.5
      }
      
      forecasts[dim] = Math.max(0, Math.min(5, nextScore + pdBoost));
    });

    // Calculate overall scores
    const baseOverall = Object.values(baseForecasts).reduce((a, b) => a + b, 0) / 4;
    const forecastOverall = Object.values(forecasts).reduce((a, b) => a + b, 0) / 4;

    // Historical overall scores for trend
    const historicalOverall = history.map(e => parseFloat(e.overall_score || 0));
    const historicalRadar = history.map(e => ({
      teaching: parseFloat(e.radar?.teaching || 0),
      research: parseFloat(e.radar?.research || 0),
      service: parseFloat(e.radar?.service || 0),
      professional_development: parseFloat(e.radar?.professional_development || 0)
    }));

    res.json({
      historicalOverall,
      historicalRadar,
      baseForecasts,
      forecasts,
      baseOverall: Math.round(baseOverall * 100) / 100,
      forecastOverall: Math.round(forecastOverall * 100) / 100,
      improvement: Math.round((forecastOverall - baseOverall) * 100) / 100,
      trends: Object.entries(trends).map(([key, value]) => ({
        dimension: key,
        trend: Math.round(value * 1000) / 1000 // 3 decimal places
      }))
    });
  } catch (err) {
    console.error("Get predictions error:", err);
    res.status(500).json({ error: "Failed to generate predictions" });
  }
});

export default router;

