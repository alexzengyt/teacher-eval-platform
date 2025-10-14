// evaluation-service/frontend/overview.js
(function () {
  // Read a query param
  function q(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Safe number coercion
  function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // Format date for display
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  }

  const teacherId = q("teacher_id");
  if (!teacherId) {
    document.body.innerHTML = "<p style='color:#e11'>Missing teacher_id</p>";
    return;
  }

  // Get token from URL parameter or localStorage
  const tokenFromUrl = q("token");
  const tokenFromStorage = localStorage.getItem("auth_token") || "";
  const token = tokenFromUrl || tokenFromStorage;
  
  if (!token) {
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: system-ui;">
        <h2 style="color: #e11;">Authentication Required</h2>
        <p>Please login first to view this page.</p>
        <a href="http://localhost:5173" style="color: #3b82f6; text-decoration: none;">Go to Login</a>
      </div>
    `;
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json"
  };

  // Load basic overview data
  async function loadOverview() {
    try {
      const response = await fetch(`/api/eval/teachers/${teacherId}/overview`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Name and avatar
      const fullName = `${data.teacher?.first_name || ""} ${data.teacher?.last_name || ""}`.trim();
      document.getElementById("name").textContent = fullName || "(unknown)";
      document.getElementById("avatar").textContent = fullName.charAt(0).toUpperCase();

      // Overall score
      document.getElementById("overall").textContent = num(data.evaluation?.overall_score).toFixed(2);

      // Period
      document.getElementById("period").textContent = data.evaluation?.period || "";

      // Cards with trend indicators
      const c = data.evaluation?.cards || {};
      document.getElementById("teaching").textContent = num(c.teaching_effectiveness).toFixed(1);
      document.getElementById("research").textContent = num(c.research_output).toFixed(1);
      document.getElementById("service").textContent = num(c.service_contribution).toFixed(1);
      document.getElementById("grant").textContent = num(c.grant_funding).toFixed(1);

      // Radar chart
      const r = data.evaluation?.radar || {};
      const radarCtx = document.getElementById("radar").getContext("2d");
      new Chart(radarCtx, {
        type: "radar",
        data: {
          labels: ["Teaching", "Research", "Service", "Professional Development"],
          datasets: [{
            label: "Current Score",
            data: [num(r.teaching), num(r.research), num(r.service), num(r.professional_development)],
            backgroundColor: "rgba(102, 126, 234, 0.2)",
            borderColor: "rgba(102, 126, 234, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(102, 126, 234, 1)",
          }],
        },
        options: {
          responsive: true,
          plugins: { 
            legend: { display: false },
            title: { display: false }
          },
          scales: { 
            r: { 
              suggestedMin: 0, 
              suggestedMax: 5,
              ticks: { stepSize: 1 }
            } 
          }
        }
      });

      return data;
    } catch (err) {
      console.error("[overview] error:", err);
      throw err;
    }
  }

  // Load time series data
  async function loadTimeSeries() {
    try {
      const response = await fetch(`/api/eval/analytics/time-series/${teacherId}?years=3`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Update trend indicators
      if (data.timeSeriesData && data.timeSeriesData.length > 1) {
        const latest = data.timeSeriesData[data.timeSeriesData.length - 1];
        const previous = data.timeSeriesData[data.timeSeriesData.length - 2];
        
        const teachingTrend = latest.cards?.teaching_effectiveness - previous.cards?.teaching_effectiveness;
        const researchTrend = latest.cards?.research_output - previous.cards?.research_output;
        const serviceTrend = latest.cards?.service_contribution - previous.cards?.service_contribution;
        const grantTrend = latest.cards?.grant_funding - previous.cards?.grant_funding;

        document.getElementById("teaching-trend").textContent = 
          teachingTrend > 0 ? `↗ +${teachingTrend.toFixed(1)}` : 
          teachingTrend < 0 ? `↘ ${teachingTrend.toFixed(1)}` : "→ 0.0";
        document.getElementById("research-trend").textContent = 
          researchTrend > 0 ? `↗ +${researchTrend.toFixed(1)}` : 
          researchTrend < 0 ? `↘ ${researchTrend.toFixed(1)}` : "→ 0.0";
        document.getElementById("service-trend").textContent = 
          serviceTrend > 0 ? `↗ +${serviceTrend.toFixed(1)}` : 
          serviceTrend < 0 ? `↘ ${serviceTrend.toFixed(1)}` : "→ 0.0";
        document.getElementById("grant-trend").textContent = 
          grantTrend > 0 ? `↗ +${grantTrend.toFixed(1)}` : 
          grantTrend < 0 ? `↘ ${grantTrend.toFixed(1)}` : "→ 0.0";
      }

      // Create time series chart
      const timeSeriesCtx = document.getElementById("timeSeries").getContext("2d");
      new Chart(timeSeriesCtx, {
        type: "line",
        data: {
          labels: data.timeSeriesData.map(d => formatDate(d.publishedAt)),
          datasets: [{
            label: "Overall Score",
            data: data.timeSeriesData.map(d => d.overallScore),
            borderColor: "rgba(102, 126, 234, 1)",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: { 
            legend: { display: false },
            title: { display: false }
          },
          scales: {
            y: {
              min: 0,
              max: 5,
              ticks: { stepSize: 1 }
            }
          }
        }
      });

      // Display time series summary
      const timeSeriesContainer = document.getElementById("timeSeriesData");
      timeSeriesContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div class="comparison-card">
            <h4>Total Evaluations</h4>
            <div class="comparison-score">${data.summary.totalEvaluations}</div>
          </div>
          <div class="comparison-card">
            <h4>Average Score</h4>
            <div class="comparison-score">${data.summary.averageScore.toFixed(2)}</div>
          </div>
          <div class="comparison-card">
            <h4>Score Trend</h4>
            <div class="comparison-score">${data.summary.scoreTrend > 0 ? '+' : ''}${data.summary.scoreTrend.toFixed(2)}</div>
          </div>
        </div>
      `;

      return data;
    } catch (err) {
      console.error("[time-series] error:", err);
      document.getElementById("timeSeriesData").innerHTML = 
        `<p style="color: #ef4444;">Failed to load time series data: ${err.message}</p>`;
    }
  }

  // Load comparison data
  async function loadComparison() {
    try {
      // Get all teachers for comparison
      const teachersResponse = await fetch(`/api/eval/teachers?pageSize=20`, { headers });
      if (!teachersResponse.ok) throw new Error(`HTTP ${teachersResponse.status}`);
      const teachersData = await teachersResponse.json();
      
      // Get comparison data for top 5 teachers
      const teacherIds = teachersData.items.slice(0, 5).map(t => t.id).join(',');
      const response = await fetch(`/api/eval/analytics/comparison?teacherIds=${teacherIds}`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Display comparison
      const comparisonContainer = document.getElementById("comparisonData");
      comparisonContainer.innerHTML = `
        <div class="comparison-grid">
          ${data.metrics.averageScores.map(teacher => `
            <div class="comparison-card">
              <h4>${teacher.teacherName}</h4>
              <div class="comparison-score">${teacher.averageScore.toFixed(2)}</div>
              <div style="font-size: 12px; color: #6b7280;">${teacher.totalEvaluations} evaluations</div>
            </div>
          `).join('')}
        </div>
        ${data.metrics.highestPerformer.teacher ? `
          <div style="margin-top: 16px; padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <strong>Top Performer:</strong> ${data.metrics.highestPerformer.teacher.teacher.firstName} ${data.metrics.highestPerformer.teacher.teacher.lastName} 
            (${data.metrics.highestPerformer.score.toFixed(2)} average score)
          </div>
        ` : ''}
      `;

      return data;
    } catch (err) {
      console.error("[comparison] error:", err);
      document.getElementById("comparisonData").innerHTML = 
        `<p style="color: #ef4444;">Failed to load comparison data: ${err.message}</p>`;
    }
  }

  // Load all data
  async function loadAllData() {
    try {
      await loadOverview();
      await Promise.all([
        loadTimeSeries(),
        loadComparison()
      ]);
    } catch (err) {
      document.body.innerHTML = `<p style="color:#e11">Load failed: ${err.message}</p>`;
      console.error("[overview] error:", err);
    }
  }

  // Start loading
  loadAllData();
})();
