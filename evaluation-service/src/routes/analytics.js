// evaluation-service/src/routes/analytics.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/eval/analytics/time-series/:teacherId
 * Returns time series data for a specific teacher's evaluations
 */
router.get("/time-series/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { years = 3 } = req.query;

    const sql = `
      SELECT 
        e.id,
        e.period,
        e.type,
        e.overall_score,
        e.metadata,
        e.submitted_at,
        e.published_at,
        EXTRACT(YEAR FROM e.published_at) as year,
        EXTRACT(MONTH FROM e.published_at) as month
      FROM evaluations e
      WHERE e.teacher_id = $1 
        AND e.status = 'published'
        AND e.published_at >= NOW() - INTERVAL '${parseInt(years)} years'
      ORDER BY e.published_at ASC
    `;

    const { rows } = await pool.query(sql, [teacherId]);
    
      // Process data for time series
      const timeSeriesData = rows.map(row => ({
        id: row.id,
        period: row.period,
        type: row.type,
        overallScore: parseFloat(row.overall_score),
        year: parseInt(row.year),
        month: parseInt(row.month),
        publishedAt: row.published_at,
        cards: row.metadata?.cards || null,
        radar: row.metadata?.radar || null,
        notes: row.metadata?.notes || null
      }));

      res.json({
        teacherId,
        timeSeriesData,
        summary: {
          totalEvaluations: timeSeriesData.length,
          averageScore: timeSeriesData.reduce((sum, evaluation) => sum + evaluation.overallScore, 0) / timeSeriesData.length,
          scoreTrend: timeSeriesData.length > 1 ? 
            (timeSeriesData[timeSeriesData.length - 1].overallScore - timeSeriesData[0].overallScore) : 0
        }
      });
  } catch (err) {
    console.error("time-series error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/eval/analytics/top-performers
 * Returns top performing teachers
 * Query params: limit (default: 5)
 */
router.get("/top-performers", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const sql = `
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        AVG(e.overall_score) as average_score,
        COUNT(e.id) as evaluation_count
      FROM teachers t
      JOIN evaluations e ON e.teacher_id = t.id AND e.status = 'published'
      GROUP BY t.id, t.first_name, t.last_name, t.email
      HAVING COUNT(e.id) >= 1
      ORDER BY average_score DESC
      LIMIT $1
    `;
    
    const { rows } = await pool.query(sql, [parseInt(limit)]);
    
    res.json({
      topPerformers: rows.map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        averageScore: parseFloat(row.average_score),
        evaluationCount: parseInt(row.evaluation_count)
      }))
    });
  } catch (err) {
    console.error("top-performers error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/eval/analytics/comparison
 * Returns comparison data for multiple teachers
 * Query params: teacherIds (comma-separated) OR currentTeacherId + compareWith (top3/top5)
 */
router.get("/comparison", async (req, res) => {
  try {
    const { teacherIds, currentTeacherId, compareWith } = req.query;
    
    let ids = [];
    
    // Mode 1: Compare with top performers
    if (currentTeacherId && compareWith) {
      const limit = compareWith === 'top3' ? 3 : compareWith === 'top5' ? 5 : 3;
      
      // Get top performers
      const topQuery = `
        SELECT 
          t.id,
          AVG(e.overall_score) as average_score
        FROM teachers t
        JOIN evaluations e ON e.teacher_id = t.id AND e.status = 'published'
        WHERE t.id != $1
        GROUP BY t.id
        HAVING COUNT(e.id) >= 1
        ORDER BY average_score DESC
        LIMIT $2
      `;
      
      const { rows: topRows } = await pool.query(topQuery, [currentTeacherId, limit]);
      ids = [currentTeacherId, ...topRows.map(r => r.id)];
    }
    // Mode 2: Compare specific teachers
    else if (teacherIds) {
      ids = teacherIds.split(',').map(id => id.trim());
    }
    else {
      return res.status(400).json({ error: "Either teacherIds or (currentTeacherId + compareWith) required" });
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');

    const sql = `
      SELECT 
        t.id as teacher_id,
        t.first_name,
        t.last_name,
        t.email,
        e.id as evaluation_id,
        e.period,
        e.type,
        e.overall_score,
        e.metadata,
        e.published_at
      FROM teachers t
      LEFT JOIN evaluations e ON e.teacher_id = t.id AND e.status = 'published'
      WHERE t.id IN (${placeholders})
      ORDER BY t.last_name, t.first_name, e.published_at DESC
    `;

    const { rows } = await pool.query(sql, ids);
    
    // Group by teacher
    const comparisonData = {};
    rows.forEach(row => {
      const teacherId = row.teacher_id;
      if (!comparisonData[teacherId]) {
        comparisonData[teacherId] = {
          teacher: {
            id: row.teacher_id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            isCurrent: row.teacher_id === currentTeacherId
          },
          evaluations: []
        };
      }
      
      if (row.evaluation_id) {
        comparisonData[teacherId].evaluations.push({
          id: row.evaluation_id,
          period: row.period,
          type: row.type,
          overallScore: parseFloat(row.overall_score),
          publishedAt: row.published_at,
          cards: row.metadata?.cards || null,
          radar: row.metadata?.radar || null
        });
      }
    });

    // Calculate comparison metrics
    const teachers = Object.values(comparisonData);
    const comparisonMetrics = teachers.map(t => ({
      teacherId: t.teacher.id,
      teacherName: `${t.teacher.firstName} ${t.teacher.lastName}`,
      isCurrent: t.teacher.isCurrent || false,
      averageScore: t.evaluations.length > 0 ? 
        t.evaluations.reduce((sum, evaluation) => sum + evaluation.overallScore, 0) / t.evaluations.length : 0,
      totalEvaluations: t.evaluations.length,
      latestScore: t.evaluations.length > 0 ? t.evaluations[0].overallScore : 0,
      // Calculate average by category if available
      avgTeaching: t.evaluations.length > 0 && t.evaluations[0].cards ? 
        t.evaluations.reduce((sum, e) => sum + (e.cards?.teaching_effectiveness || 0), 0) / t.evaluations.length : 0,
      avgResearch: t.evaluations.length > 0 && t.evaluations[0].cards ? 
        t.evaluations.reduce((sum, e) => sum + (e.cards?.research_output || 0), 0) / t.evaluations.length : 0,
      avgService: t.evaluations.length > 0 && t.evaluations[0].cards ? 
        t.evaluations.reduce((sum, e) => sum + (e.cards?.service_contribution || 0), 0) / t.evaluations.length : 0,
    })).sort((a, b) => b.averageScore - a.averageScore);

    res.json({
      teachers: comparisonMetrics,
      compareMode: compareWith || 'custom'
    });
  } catch (err) {
    console.error("comparison error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/eval/analytics/dashboard
 * Returns dashboard data with charts and statistics
 */
router.get("/dashboard", async (req, res) => {
  try {
    // Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT t.id) as total_teachers,
        COUNT(DISTINCT e.id) as total_evaluations,
        AVG(e.overall_score) as average_score,
        COUNT(DISTINCT CASE WHEN e.published_at >= NOW() - INTERVAL '1 year' THEN e.id END) as evaluations_this_year
      FROM teachers t
      LEFT JOIN evaluations e ON e.teacher_id = t.id AND e.status = 'published'
    `;

    const { rows: statsRows } = await pool.query(statsQuery);
    const stats = statsRows[0];

    // Score distribution
    const distributionQuery = `
      SELECT 
        CASE 
          WHEN e.overall_score >= 4.5 THEN '4.5-5.0'
          WHEN e.overall_score >= 4.0 THEN '4.0-4.5'
          WHEN e.overall_score >= 3.5 THEN '3.5-4.0'
          WHEN e.overall_score >= 3.0 THEN '3.0-3.5'
          ELSE 'Below 3.0'
        END as score_range,
        COUNT(*) as count
      FROM evaluations e
      WHERE e.status = 'published'
      GROUP BY score_range
      ORDER BY score_range
    `;

    const { rows: distributionRows } = await pool.query(distributionQuery);

    // Monthly evaluation trends
    const trendsQuery = `
      SELECT 
        DATE_TRUNC('month', e.published_at) as month,
        COUNT(*) as evaluation_count,
        AVG(e.overall_score) as average_score
      FROM evaluations e
      WHERE e.status = 'published' 
        AND e.published_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', e.published_at)
      ORDER BY month
    `;

    const { rows: trendsRows } = await pool.query(trendsQuery);

    // Top performers (changed from >= 2 to >= 1 to include all teachers with evaluations)
    const topPerformersQuery = `
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        AVG(e.overall_score) as average_score,
        COUNT(e.id) as evaluation_count
      FROM teachers t
      JOIN evaluations e ON e.teacher_id = t.id AND e.status = 'published'
      GROUP BY t.id, t.first_name, t.last_name
      HAVING COUNT(e.id) >= 1
      ORDER BY average_score DESC
      LIMIT 5
    `;

    const { rows: topPerformersRows } = await pool.query(topPerformersQuery);

    res.json({
      stats: {
        totalTeachers: parseInt(stats.total_teachers),
        totalEvaluations: parseInt(stats.total_evaluations),
        averageScore: parseFloat(stats.average_score || 0),
        evaluationsThisYear: parseInt(stats.evaluations_this_year)
      },
      scoreDistribution: distributionRows.map(row => ({
        range: row.score_range,
        count: parseInt(row.count)
      })),
      monthlyTrends: trendsRows.map(row => ({
        month: row.month,
        evaluationCount: parseInt(row.evaluation_count),
        averageScore: parseFloat(row.average_score)
      })),
      topPerformers: topPerformersRows.map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        averageScore: parseFloat(row.average_score),
        evaluationCount: parseInt(row.evaluation_count)
      }))
    });
  } catch (err) {
    console.error("dashboard error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
