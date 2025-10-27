// evaluation-service/frontend/overview.js
(function () {
  // ========== Utility Functions ==========
  function q(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDateShort(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short'
    });
  }

  // ========== Authentication & Setup ==========
  const teacherId = q("teacher_id");
  if (!teacherId) {
    document.body.innerHTML = "<p style='color:#e11; padding: 40px; text-align: center;'>Missing teacher_id parameter</p>";
    return;
  }

  const tokenFromUrl = q("token");
  const tokenFromStorage = localStorage.getItem("auth_token") || "";
  const token = tokenFromUrl || tokenFromStorage;
  
  if (!token) {
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: system-ui;">
        <h2 style="color: #e11;">Authentication Required</h2>
        <p>Please login first to view this page.</p>
        <a href="http://localhost:5173" style="color: #6366f1; text-decoration: none;">Go to Login</a>
      </div>
    `;
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json"
  };

  // ========== Tab Navigation ==========
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      // Load data for the tab if not already loaded
      loadTabData(targetTab);
    });
  });

  // Track which tabs have been loaded
  const loadedTabs = new Set(['overview']); // Overview loads on init

  function loadTabData(tabName) {
    if (loadedTabs.has(tabName)) return;
    loadedTabs.add(tabName);

    switch(tabName) {
      case 'research':
        loadResearchData();
        break;
      case 'service':
        loadServiceData();
        break;
      case 'professional':
        loadProfessionalData();
        break;
      case 'career':
        loadCareerData();
        break;
    }
  }

  // ========== Load Overview Data ==========
  async function loadOverview() {
    try {
      const response = await fetch(`/api/eval/teachers/${teacherId}/overview`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Name and avatar
      const fullName = `${data.teacher?.first_name || ""} ${data.teacher?.last_name || ""}`.trim();
      document.getElementById("name").textContent = fullName || "(Unknown)";
      document.getElementById("avatar").textContent = fullName.charAt(0).toUpperCase() || "?";

      // Overall score
      const overallScore = num(data.evaluation?.overall_score);
      document.getElementById("overall").textContent = overallScore.toFixed(2);

      // Period
      document.getElementById("period").textContent = data.evaluation?.period || "N/A";

      // Cards with trend indicators
      const c = data.evaluation?.cards || {};
      document.getElementById("teaching").textContent = num(c.teaching_effectiveness).toFixed(1);
      document.getElementById("research").textContent = num(c.research_output).toFixed(1);
      document.getElementById("service").textContent = num(c.service_contribution).toFixed(1);
      document.getElementById("grant").textContent = num(c.grant_funding).toFixed(1);

      // Add trend indicators (mock for now)
      setTrend("teaching-trend", "+0.3 from last period");
      setTrend("research-trend", "+0.5 from last period");
      setTrend("service-trend", "-0.1 from last period");
      setTrend("grant-trend", "+0.2 from last period");

      // Radar chart
      const r = data.evaluation?.radar || {};
      renderRadarChart(r);

      // Load teaching data (courses)
      await loadTeachingData();

      // Load score trend
      await loadScoreTrend();

      // Load peer comparison
      await loadPeerComparison();

    } catch (err) {
      console.error("loadOverview error:", err);
      document.getElementById("name").textContent = "Error loading data";
    }
  }

  function setTrend(elementId, text) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const isPositive = text.includes('+');
    const isNegative = text.includes('-');
    
    el.textContent = text;
    el.className = 'trend';
    if (isPositive) el.classList.add('up');
    else if (isNegative) el.classList.add('down');
    else el.classList.add('neutral');
  }

  function renderRadarChart(radarData) {
    const radarCtx = document.getElementById("radar").getContext("2d");
    new Chart(radarCtx, {
      type: "radar",
      data: {
        labels: ["Teaching", "Research", "Service", "Professional Dev."],
        datasets: [{
          label: "Current Score",
          data: [
            num(radarData.teaching), 
            num(radarData.research), 
            num(radarData.service), 
            num(radarData.professional_development)
          ],
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderColor: "rgba(99, 102, 241, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(99, 102, 241, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { 
          legend: { display: false },
        },
        scales: { 
          r: { 
            suggestedMin: 0, 
            suggestedMax: 5,
            ticks: { 
              stepSize: 1,
              font: { size: 14 }
            },
            pointLabels: {
              font: { size: 16, weight: '600' }
            }
          }
        }
      }
    });
  }

  async function loadTimeSeriesChart() {
    try {
      const response = await fetch(`/api/eval/analytics/time-series/${teacherId}?years=3`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const timeSeriesData = data.timeSeriesData || [];
      const labels = timeSeriesData.map(d => formatDateShort(d.publishedAt));
      const scores = timeSeriesData.map(d => d.overallScore);

      const ctx = document.getElementById("timeSeries").getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: "Overall Score",
            data: scores,
            borderColor: "rgba(99, 102, 241, 1)",
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "rgba(99, 102, 241, 1)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { 
              suggestedMin: 0, 
              suggestedMax: 5,
              ticks: { stepSize: 0.5 }
            }
          }
        }
      });
    } catch (err) {
      console.error("loadTimeSeriesChart error:", err);
    }
  }

  async function loadScoreTrend() {
    try {
      const container = document.getElementById("scoreTrend");
      if (!container) return;

      // Fetch historical trend data
      const response = await fetch(`/api/eval/teachers/${teacherId}/trend`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const trend = data.trend || [];

      // Check if we have enough data
      if (trend.length < 2) {
        container.innerHTML = `
          <div style="min-height: 300px; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 12px; padding: 40px;">
            <div style="text-align: center; color: #6b7280;">
              <div style="font-size: 48px; margin-bottom: 16px;">📈</div>
              <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Historical Trend Data</div>
              <div style="font-size: 14px;">Multi-semester evaluation trends will be available with more historical data</div>
            </div>
          </div>
        `;
        return;
      }

      // Prepare data for chart
      const labels = trend.map(t => t.period);
      const datasets = [
        {
          label: 'Teaching',
          data: trend.map(t => t.teaching),
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false
        },
        {
          label: 'Research',
          data: trend.map(t => t.research),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false
        },
        {
          label: 'Service',
          data: trend.map(t => t.service),
          borderColor: 'rgba(251, 191, 36, 1)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(251, 191, 36, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false
        },
        {
          label: 'Professional Dev.',
          data: trend.map(t => t.professional_development),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false
        }
      ];

      // Render chart container
      container.innerHTML = '<canvas id="scoreTrendChart"></canvas>';

      // Render line chart
      const ctx = document.getElementById('scoreTrendChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                padding: 15,
                font: { size: 13, weight: '600' },
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 10,
                boxHeight: 10
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            y: {
              min: 2.0,
              max: 5,
              ticks: { 
                stepSize: 0.5,
                font: { size: 12 }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              ticks: {
                font: { size: 12, weight: '600' }
              },
              grid: {
                display: false
              }
            }
          }
        }
      });

    } catch (err) {
      console.error("loadScoreTrend error:", err);
      const container = document.getElementById("scoreTrend");
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-text">Unable to load score trend</div></div>';
      }
    }
  }

  async function loadPeerComparison() {
    try {
      const container = document.getElementById("peerComparison");
      if (!container) return;

      // Remove loading class
      container.classList.remove('loading');
      
      // Fetch all teachers' data
      const response = await fetch('/api/eval/teachers?pageSize=100', { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const allTeachers = data.items || [];

      // Get current teacher's evaluation
      const currentResponse = await fetch(`/api/eval/teachers/${teacherId}/overview`, { headers });
      if (!currentResponse.ok) throw new Error(`HTTP ${currentResponse.status}`);
      const currentData = await currentResponse.json();
      const currentScore = currentData.evaluation?.overall_score || 0;
      const currentRadar = currentData.evaluation?.radar || {};

      // Fetch evaluation data for all teachers
      const teachersWithScores = await Promise.all(
        allTeachers.map(async (teacher) => {
          try {
            const res = await fetch(`/api/eval/teachers/${teacher.id}/overview`, { headers });
            if (!res.ok) {
              console.log(`No overview data for ${teacher.firstName} ${teacher.lastName}`);
              return null;
            }
            const data = await res.json();
            if (!data.evaluation || !data.evaluation.overall_score) {
              console.log(`No evaluation data for ${teacher.firstName} ${teacher.lastName}`);
              return null;
            }
            return {
              id: teacher.id,
              name: `${teacher.firstName} ${teacher.lastName}`,
              overall_score: data.evaluation.overall_score,
              radar: data.evaluation.radar || {
                teaching: 0,
                research: 0,
                service: 0,
                professional_development: 0
              }
            };
          } catch (err) {
            console.error(`Error fetching data for ${teacher.firstName} ${teacher.lastName}:`, err);
            return null;
          }
        })
      );

      // Filter out null values and sort by overall score
      const validTeachers = teachersWithScores
        .filter(t => t !== null && t.overall_score > 0)
        .sort((a, b) => b.overall_score - a.overall_score);

      console.log(`Found ${validTeachers.length} teachers with evaluation data`);

      // Check if we have enough data
      if (validTeachers.length < 2) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Need at least 2 teachers with evaluation data for comparison</div></div>';
        return;
      }

      // Calculate percentile rank
      const currentRank = validTeachers.findIndex(t => t.id === teacherId) + 1;
      if (currentRank === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Current teacher not found in comparison data</div></div>';
        return;
      }
      const totalTeachers = validTeachers.length;
      const percentile = Math.round((1 - (currentRank - 1) / totalTeachers) * 100);
      
      // Determine tier based on percentile (quartiles)
      let tierText = '';
      let tierLabel = '';
      if (percentile > 75) {
        tierText = 'Tier 1';
        tierLabel = 'TOP 25% PERFORMER';
      } else if (percentile > 50) {
        tierText = 'Tier 2';
        tierLabel = 'TOP 50% PERFORMER';
      } else if (percentile > 25) {
        tierText = 'Tier 3';
        tierLabel = 'NEED IMPROVEMENT';
      } else {
        tierText = 'Tier 4';
        tierLabel = 'NEED IMPROVEMENT';
      }

      // Prepare chart data - compare current teacher with others
      const labels = ['Teaching', 'Research', 'Service', 'Professional Dev.'];
      const datasets = [];

      // Current teacher (highlighted)
      datasets.push({
        label: 'You',
        data: [
          num(currentRadar.teaching),
          num(currentRadar.research),
          num(currentRadar.service),
          num(currentRadar.professional_development)
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2
      });

      // Top 3 other teachers
      const othersToShow = validTeachers.filter(t => t.id !== teacherId).slice(0, 3);
      const colors = [
        { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgba(34, 197, 94, 1)' },
        { bg: 'rgba(251, 191, 36, 0.6)', border: 'rgba(251, 191, 36, 1)' },
        { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 1)' }
      ];

      othersToShow.forEach((teacher, index) => {
        datasets.push({
          label: teacher.name,
          data: [
            num(teacher.radar.teaching),
            num(teacher.radar.research),
            num(teacher.radar.service),
            num(teacher.radar.professional_development)
          ],
          backgroundColor: colors[index].bg,
          borderColor: colors[index].border,
          borderWidth: 1
        });
      });

      // Render chart and info
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Stats Row -->
          <div style="display: flex; gap: 16px; justify-content: center;">
            <div style="flex: 1; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-size: 42px; font-weight: 700; color: white; margin-bottom: 8px;">${tierText}</div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 600; letter-spacing: 0.3px; margin-top: 4px;">${tierLabel}</div>
            </div>
            <div style="flex: 1; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-size: 42px; font-weight: 700; color: white; margin-bottom: 8px;">#${currentRank}</div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 600; letter-spacing: 0.5px;">OF ${totalTeachers} TEACHERS</div>
            </div>
          </div>
          <!-- Chart -->
          <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); height: 350px;">
            <canvas id="peerComparisonChart"></canvas>
          </div>
        </div>
      `;

      // Render comparison chart
      const ctx = document.getElementById('peerComparisonChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                padding: 20,
                font: { size: 13, weight: '600' },
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 10,
                boxHeight: 10
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 5,
              ticks: { 
                stepSize: 1,
                font: { size: 12 }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              ticks: {
                font: { size: 12, weight: '600' }
              },
              grid: {
                display: false
              }
            }
          }
        }
      });

    } catch (err) {
      console.error("loadPeerComparison error:", err);
      const container = document.getElementById("peerComparison");
      if (container) {
        container.classList.remove('loading');
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Unable to load peer comparison</div></div>';
      }
    }
  }

  function updatePercentileDisplay(percentile) {
    // Add percentile info to the teaching effectiveness card
    const teachingCard = document.getElementById('teaching')?.parentElement;
    if (teachingCard) {
      const existing = teachingCard.querySelector('.percentile-badge');
      if (existing) existing.remove();
      
      const badge = document.createElement('div');
      badge.className = 'percentile-badge';
      badge.style.cssText = 'margin-top: 8px; padding: 4px 12px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; display: inline-block;';
      badge.innerHTML = `<span style="font-size: 12px; color: #6366f1; font-weight: 600;">Top ${100 - percentile}% performer</span>`;
      teachingCard.appendChild(badge);
    }
  }

  async function loadAllTeachers() {
    try {
      const response = await fetch('/api/eval/teachers?pageSize=100', { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const teachers = data.data || [];
      const checkboxContainer = document.getElementById('teacherCheckboxes');
      const selectedCountSpan = document.getElementById('selectedCount');
      
      checkboxContainer.innerHTML = teachers.map(t => `
        <label class="teacher-checkbox-label" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: white; border-radius: 8px; cursor: ${t.id === teacherId ? 'default' : 'pointer'}; border: 2px solid ${t.id === teacherId ? '#6366f1' : '#e5e7eb'}; transition: all 0.2s;">
          <input type="checkbox" class="teacher-checkbox" value="${t.id}" ${t.id === teacherId ? 'checked disabled' : ''} style="width: 18px; height: 18px; cursor: ${t.id === teacherId ? 'default' : 'pointer'}; accent-color: #6366f1;">
          <div style="flex: 1;">
            <div style="font-size: 14px; color: #1f2937; font-weight: ${t.id === teacherId ? '700' : '500'};">
              ${t.first_name} ${t.last_name}
            </div>
            ${t.id === teacherId ? '<div style="font-size: 11px; color: #6366f1; font-weight: 600;">YOU</div>' : ''}
          </div>
        </label>
      `).join('');

      // Update selected count
      function updateSelectedCount() {
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]:checked');
        const count = checkboxes.length;
        selectedCountSpan.textContent = `${count} teacher${count !== 1 ? 's' : ''} selected`;
      }

      // Add change listeners to checkboxes
      checkboxContainer.querySelectorAll('.teacher-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          updateSelectedCount();
          // Update label border
          const label = cb.closest('.teacher-checkbox-label');
          if (cb.checked) {
            label.style.borderColor = '#6366f1';
            label.style.background = '#f0f4ff';
          } else {
            label.style.borderColor = '#e5e7eb';
            label.style.background = 'white';
          }
        });
      });

      updateSelectedCount();

      // Add event listener for apply button
      document.getElementById('applyCustomComparison').onclick = async () => {
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (selectedIds.length < 2) {
          alert('Please select at least one other teacher to compare');
          return;
        }

        await loadCustomComparison(selectedIds);
      };

      // Add event listener for cancel button
      document.getElementById('cancelCustomComparison').onclick = () => {
        document.getElementById('customTeacherSelector').style.display = 'none';
        // Reset to top3 mode
        const top3Btn = document.querySelector('.compare-mode-btn[data-mode="top3"]');
        if (top3Btn) {
          top3Btn.click();
        }
      };

    } catch (err) {
      console.error("loadAllTeachers error:", err);
      document.getElementById('teacherCheckboxes').innerHTML = '<div class="empty-state-text">Failed to load teachers</div>';
    }
  }

  async function loadCustomComparison(teacherIds) {
    try {
      const contentDiv = document.getElementById('comparisonContent');
      contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading comparison...</div>';

      const url = `/api/eval/analytics/comparison?teacherIds=${teacherIds.join(',')}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const teachers = data.teachers || [];

      if (teachers.length === 0) {
        contentDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No comparison data available</div></div>';
        return;
      }

      // Use same rendering as loadComparisonData (table only)
      const html = `
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc; border-radius: 8px;">
                <th style="padding: 14px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Rank</th>
                <th style="padding: 14px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Teacher</th>
                <th style="padding: 14px 12px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Overall</th>
                <th style="padding: 14px 12px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Teaching</th>
                <th style="padding: 14px 12px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Research</th>
                <th style="padding: 14px 12px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
                <th style="padding: 14px 12px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Evals</th>
              </tr>
            </thead>
            <tbody>
              ${teachers.map((t, idx) => `
                <tr style="background: ${t.isCurrent ? '#e0e7ff' : 'white'}; border-top: 1px solid #e5e7eb; transition: background 0.2s;">
                  <td style="padding: 16px 12px;">
                    <span style="display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; background: ${idx < 3 ? '#6366f1' : '#e5e7eb'}; color: ${idx < 3 ? 'white' : '#6b7280'}; border-radius: 50%; font-weight: 700; font-size: 14px;">${idx + 1}</span>
                  </td>
                  <td style="padding: 16px 12px;">
                    <div style="font-weight: ${t.isCurrent ? '700' : '600'}; color: #1f2937; font-size: 15px;">
                      ${t.teacherName}
                    </div>
                    ${t.isCurrent ? '<div style="display: inline-block; margin-top: 4px; background: #6366f1; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">YOU</div>' : ''}
                  </td>
                  <td style="padding: 16px 12px; text-align: center;">
                    <span style="font-weight: 700; font-size: 18px; color: ${t.isCurrent ? '#6366f1' : '#1f2937'};">${t.averageScore.toFixed(2)}</span>
                  </td>
                  <td style="padding: 16px 12px; text-align: center; color: #6b7280; font-size: 15px;">${t.avgTeaching ? t.avgTeaching.toFixed(1) : 'N/A'}</td>
                  <td style="padding: 16px 12px; text-align: center; color: #6b7280; font-size: 15px;">${t.avgResearch ? t.avgResearch.toFixed(1) : 'N/A'}</td>
                  <td style="padding: 16px 12px; text-align: center; color: #6b7280; font-size: 15px;">${t.avgService ? t.avgService.toFixed(1) : 'N/A'}</td>
                  <td style="padding: 16px 12px; text-align: center; color: #6b7280; font-size: 15px;">${t.totalEvaluations}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      contentDiv.innerHTML = html;
    } catch (err) {
      console.error("loadCustomComparison error:", err);
      document.getElementById('comparisonContent').innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load comparison data</div></div>';
    }
  }

  // ========== Load Teaching Data ==========
  async function loadTeachingData() {
    try {
      // Load courses
      let courses = [];
      try {
        const coursesResponse = await fetch(`/api/eval/teachers/${teacherId}/courses`, { headers });
        console.log("📚 Courses response status:", coursesResponse.status);
        if (coursesResponse.ok) {
          courses = await coursesResponse.json();
          console.log("📚 Courses data:", courses);
        }
      } catch (err) {
        console.log("Could not load courses from API, using mock data", err);
      }

      // If no courses, use mock data
      if (!courses || courses.length === 0) {
        console.log("⚠️ No courses, using mock data");
        courses = [
          { period: '2025 Spring', code: 'ECON302', title: 'Business Management', student_count: 45, avg_rating: 4.7 },
          { period: '2024 Fall', code: 'HIST217', title: 'Modern History', student_count: 38, avg_rating: 4.6 },
          { period: '2024 Fall', code: 'STAT312', title: 'Statistical Methods', student_count: 42, avg_rating: 4.9 },
          { period: '2024 Spring', code: 'ECON302', title: 'Business Management', student_count: 40, avg_rating: 4.6 },
          { period: '2023 Fall', code: 'HIST217', title: 'Modern History', student_count: 35, avg_rating: 4.8 },
        ];
      }
      
      console.log("📚 About to render courses table with", courses.length, "courses");
      renderCoursesTable(courses);

      // Render student evaluation chart (mock data for now)
      console.log("📊 About to render student eval chart");
      renderStudentEvalChart();
      console.log("✅ Teaching data loaded successfully");
    } catch (err) {
      console.error("❌ loadTeachingData error:", err);
      renderEmptyState('coursesTable', '📚', 'Failed to load teaching data');
    }
  }

  function renderCoursesTable(courses) {
    const container = document.getElementById('coursesTable');
    
    if (!courses || courses.length === 0) {
      renderEmptyState('coursesTable', '📚', 'No courses taught yet');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Students</th>
            <th>Avg. Rating</th>
          </tr>
        </thead>
        <tbody>
          ${courses.map(course => `
            <tr>
              <td>${course.period || 'N/A'}</td>
              <td><strong>${course.code || 'N/A'}</strong></td>
              <td>${course.title || 'Untitled'}</td>
              <td>${course.student_count || 0}</td>
              <td><strong style="color: #6366f1;">${course.avg_rating ? parseFloat(course.avg_rating).toFixed(1) : 'N/A'}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  function renderStudentEvalChart() {
    const container = document.getElementById("studentEvalChart");
    if (!container) return;
    
    // Hide chart and show message - historical trend data not available yet
    const parent = container.parentElement;
    parent.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Historical Trend Data</div>
        <div style="font-size: 14px;">Multi-semester evaluation trends will be available with more historical data</div>
      </div>
    `;
    return;
    
    // Original chart code (disabled for now - requires historical data)
    const ctx = container.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["2023 Fall", "2024 Spring", "2024 Fall", "2025 Spring"],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 12 }
            }
          },
          title: {
            display: true,
            text: 'Student Ratings by Course',
            font: { size: 14, weight: 'normal' },
            color: '#6b7280',
            padding: { bottom: 20 }
          }
        },
        scales: {
          y: { 
            suggestedMin: 4.0, 
            suggestedMax: 5.0,
            ticks: { stepSize: 0.2 }
          }
        }
      }
    });
  }

  // ========== Load Research Data ==========
  async function loadResearchData() {
    try {
      // Load publications
      const pubResponse = await fetch(`/api/eval/teachers/${teacherId}/publications`, { headers });
      if (pubResponse.ok) {
        const publications = await pubResponse.json();
        renderPublicationsTable(publications);
      } else {
        renderEmptyState('publicationsTable', '📄', 'No publications data available');
      }

      // Load grants from real API
      const grantsResponse = await fetch(`/api/eval/teachers/${teacherId}/grants`, { headers });
      if (grantsResponse.ok) {
        const grantsData = await grantsResponse.json();
        const grants = grantsData.all || [];
        renderGrantsTable(grants);
      } else {
        renderEmptyState('grantsTable', '💰', 'No grants data available');
      }
    } catch (err) {
      console.error("loadResearchData error:", err);
      renderEmptyState('publicationsTable', '📄', 'Failed to load research data');
      renderEmptyState('grantsTable', '💰', 'Failed to load grants data');
    }
  }

  function renderPublicationsTable(publications) {
    const container = document.getElementById('publicationsTable');
    
    if (!publications || publications.length === 0) {
      renderEmptyState('publicationsTable', '📄', 'No publications yet');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Venue</th>
            <th>Published Date</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${publications.map(pub => `
            <tr>
              <td><strong>${pub.title || 'Untitled'}</strong></td>
              <td>${pub.venue || 'N/A'}</td>
              <td>${formatDate(pub.published_on)}</td>
              <td><span style="background: #e0e7ff; color: #6366f1; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${pub.type || 'Paper'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  function renderGrantsTable(grants) {
    const container = document.getElementById('grantsTable');
    
    if (!grants || grants.length === 0) {
      renderEmptyState('grantsTable', '💰', 'No grant funding data available');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Grant Title</th>
            <th>Funding Agency</th>
            <th>Amount</th>
            <th>Period</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${grants.map(grant => `
            <tr>
              <td><strong>${grant.title}</strong></td>
              <td>${grant.agency}</td>
              <td><strong style="color: #10b981;">$${grant.amount.toLocaleString()}</strong></td>
              <td>${grant.period}</td>
              <td><span style="background: #d1fae5; color: #059669; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${grant.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  // ========== Load Service Data ==========
  async function loadServiceData() {
    try {
      // Fetch real service activities from API
      const response = await fetch(`/api/eval/teachers/${teacherId}/service`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("📋 Service API response:", data);

      // Separate committee and community activities
      const committees = data.grouped?.committee || [];
      const community = data.grouped?.community || [];
      const professional = data.grouped?.professional_org || [];
      console.log("📋 Committees:", committees.length, "Community:", community.length, "Professional:", professional.length);

      // Render committee table (includes committee, department, and professional_org)
      const allCommittees = [
        ...committees.map(c => ({
          name: c.name,
          role: c.role || 'Member',
          period: formatDateRange(c.start_date, c.end_date),
          hours: c.hours || 0
        })),
        ...professional.map(c => ({
          name: c.name,
          role: c.role || 'Participant',
          period: formatDateRange(c.start_date, c.end_date),
          hours: c.hours || 0
        }))
      ];

      renderCommitteeTable(allCommittees);

      // Render community table
      const communityActivities = community.map(c => ({
        activity: c.name,
        organization: c.organization || 'N/A',
        date: c.start_date,
        impact: c.impact || c.description || 'N/A'
      }));

      renderCommunityTable(communityActivities);

    } catch (err) {
      console.error("loadServiceData error:", err);
      renderEmptyState('committeeTable', '👥', 'Failed to load committee work');
      renderEmptyState('communityTable', '🌍', 'Failed to load community contributions');
    }
  }

  function formatDateRange(startDate, endDate) {
    if (!startDate) return 'N/A';
    const start = new Date(startDate).getFullYear();
    if (!endDate) return `${start}-Present`;
    const end = new Date(endDate).getFullYear();
    return `${start}-${end}`;
  }

  function renderCommitteeTable(committees) {
    const container = document.getElementById('committeeTable');
    
    if (!committees || committees.length === 0) {
      renderEmptyState('committeeTable', '👥', 'No committee work recorded');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Committee Name</th>
            <th>Role</th>
            <th>Period</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          ${committees.map(com => `
            <tr>
              <td><strong>${com.name}</strong></td>
              <td>${com.role}</td>
              <td>${com.period}</td>
              <td>${com.hours} hrs</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  function renderCommunityTable(contributions) {
    const container = document.getElementById('communityTable');
    
    if (!contributions || contributions.length === 0) {
      renderEmptyState('communityTable', '🌍', 'No community contributions recorded');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Organization</th>
            <th>Date</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          ${contributions.map(con => `
            <tr>
              <td><strong>${con.activity}</strong></td>
              <td>${con.organization}</td>
              <td>${formatDate(con.date)}</td>
              <td>${con.impact}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  // ========== Load Professional Data ==========
  async function loadProfessionalData() {
    try {
      // Load recommendations first
      await loadRecommendations();

      // Load real education history from API
      const educationResponse = await fetch(`/api/eval/teachers/${teacherId}/education`, { headers });
      if (educationResponse.ok) {
        const education = await educationResponse.json();
        
        // Map to expected format
        const formattedEducation = education.map(e => ({
          degree: e.degree,
          field: e.field,
          institution: e.institution,
          year: e.graduation_year
        }));
        
        renderEducationTable(formattedEducation);
      } else {
        renderEmptyState('educationTable', '🎓', 'No education history recorded');
      }

      // Load PD courses (already has real API call)
      const pdResponse = await fetch(`/api/eval/teachers/${teacherId}/pd-courses`, { headers });
      if (pdResponse.ok) {
        const pdCourses = await pdResponse.json();
        renderCertificationsTable(pdCourses);
      } else {
        renderEmptyState('certificationsTable', '📜', 'No certifications or PD courses recorded');
      }

      // Load documents
      await loadDocuments();

    } catch (err) {
      console.error("loadProfessionalData error:", err);
      renderEmptyState('educationTable', '🎓', 'Failed to load education history');
      renderEmptyState('certificationsTable', '📜', 'Failed to load certifications');
    }
  }

  function renderEducationTable(education) {
    const container = document.getElementById('educationTable');
    
    if (!education || education.length === 0) {
      renderEmptyState('educationTable', '🎓', 'No education history recorded');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Degree</th>
            <th>Field</th>
            <th>Institution</th>
            <th>Year</th>
          </tr>
        </thead>
        <tbody>
          ${education.map(edu => `
            <tr>
              <td><strong>${edu.degree}</strong></td>
              <td>${edu.field}</td>
              <td>${edu.institution}</td>
              <td>${edu.year}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  function renderCertificationsTable(courses) {
    const container = document.getElementById('certificationsTable');
    
    if (!courses || courses.length === 0) {
      renderEmptyState('certificationsTable', '📜', 'No certifications or PD courses recorded');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Course/Certification</th>
            <th>Provider</th>
            <th>Hours</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          ${courses.map(course => `
            <tr>
              <td><strong>${course.title || 'Untitled'}</strong></td>
              <td>${course.provider || 'N/A'}</td>
              <td>${course.hours || 0} hrs</td>
              <td>${formatDate(course.completed_on)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  // ========== Load Career Data ==========
  async function loadCareerData() {
    try {
      // Load real career history from API
      const careerResponse = await fetch(`/api/eval/teachers/${teacherId}/career`, { headers });
      if (careerResponse.ok) {
        const careerData = await careerResponse.json();
        const careerTimeline = careerData.timeline || [];
        
        // Map to timeline format
        const formattedTimeline = careerTimeline.map(c => ({
          date: formatPositionDate(c.start_date, c.end_date, c.is_current),
          title: c.position,
          description: [c.department, c.institution, c.location].filter(Boolean).join(', ')
        }));
        
        renderCareerTimeline(formattedTimeline);
      } else {
        renderEmptyState('careerTimeline', '💼', 'No career timeline data available');
      }

      // Load real awards from API
      const awardsResponse = await fetch(`/api/eval/teachers/${teacherId}/awards`, { headers });
      if (awardsResponse.ok) {
        const awardsData = await awardsResponse.json();
        const awards = awardsData.all || [];
        
        // Map to expected format
        const formattedAwards = awards.map(a => ({
          title: a.title,
          organization: a.organization,
          date: a.awarded_date,
          description: a.amount ? `${a.description || ''} ($${parseFloat(a.amount).toLocaleString()})` : (a.description || '')
        }));
        
        renderAwardsTable(formattedAwards);
      } else {
        renderEmptyState('awardsTable', '🏆', 'No awards or recognition recorded');
      }

    } catch (err) {
      console.error("loadCareerData error:", err);
      renderEmptyState('careerTimeline', '💼', 'Failed to load career timeline');
      renderEmptyState('awardsTable', '🏆', 'Failed to load awards');
    }
  }

  function formatPositionDate(startDate, endDate, isCurrent) {
    if (!startDate) return 'N/A';
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (isCurrent || !endDate) {
      return `${start} - Present`;
    }
    
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  }

  function renderCareerTimeline(timeline) {
    const container = document.getElementById('careerTimeline');
    
    if (!timeline || timeline.length === 0) {
      renderEmptyState('careerTimeline', '💼', 'No career timeline data available');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <div style="overflow-x: auto; overflow-y: hidden; padding-bottom: 20px;">
        <div style="display: flex; gap: 24px; min-width: max-content; padding: 20px 0;">
          ${timeline.map((item, idx) => `
            <div style="position: relative; min-width: 320px; max-width: 320px; padding: 24px; background: white; border-radius: 12px; border-left: 4px solid #6366f1; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="position: absolute; left: -12px; top: 28px; width: 20px; height: 20px; border-radius: 50%; background: #6366f1; border: 4px solid white; box-shadow: 0 0 0 2px #6366f1;"></div>
              <div style="font-size: 13px; color: #6366f1; font-weight: 600; margin-bottom: 8px;">${item.date}</div>
              <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 8px;">${item.title}</div>
              <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">${item.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="text-align: center; margin-top: 8px; font-size: 13px; color: #6b7280;">
        ← Scroll horizontally to view timeline →
      </div>
    `;
    container.innerHTML = html;
  }

  function renderAwardsTable(awards) {
    const container = document.getElementById('awardsTable');
    
    if (!awards || awards.length === 0) {
      renderEmptyState('awardsTable', '🏆', 'No awards or recognition recorded');
      return;
    }

    // Remove loading class
    container.classList.remove('loading');

    const html = `
      <table>
        <thead>
          <tr>
            <th>Award</th>
            <th>Organization</th>
            <th>Date</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${awards.map(award => `
            <tr>
              <td><strong>🏆 ${award.title}</strong></td>
              <td>${award.organization}</td>
              <td>${formatDate(award.date)}</td>
              <td>${award.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  // ========== Document Management ==========
  async function loadDocuments() {
    try {
      const response = await fetch(`/api/eval/documents/list?teacher_id=${teacherId}`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const documents = await response.json();
      renderDocumentsTable(documents);

      // Setup upload form handler
      setupDocumentUpload();
    } catch (err) {
      console.error("loadDocuments error:", err);
      const container = document.getElementById('documentsTable');
      if (container) {
        renderEmptyState('documentsTable', '📄', 'Failed to load documents');
      }
      setupDocumentUpload(); // Setup upload handler even if load fails
    }
  }

  function setupDocumentUpload() {
    const form = document.getElementById('documentUploadForm');
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();

      const fileInput = document.getElementById('documentFile');
      const typeSelect = document.getElementById('documentType');
      const descInput = document.getElementById('documentDescription');

      if (!fileInput.files[0]) {
        alert('Please select a file to upload');
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('teacher_id', teacherId);
      formData.append('document_type', typeSelect.value);
      if (descInput.value) {
        formData.append('description', descInput.value);
      }

      try {
        // Don't set Content-Type for multipart - browser will set it automatically
        const uploadHeaders = { ...headers };
        delete uploadHeaders['Content-Type'];
        
        const response = await fetch('/api/eval/documents/upload', {
          method: 'POST',
          headers: uploadHeaders,
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Reset form
        form.reset();
        
        // Reload documents
        await loadDocuments();

        // Show success message
        alert('Document uploaded successfully!');
      } catch (err) {
        console.error('Upload error:', err);
        alert('Failed to upload document: ' + err.message);
      }
    };
  }

  function renderDocumentsTable(documents) {
    const container = document.getElementById('documentsTable');
    
    if (!documents || documents.length === 0) {
      renderEmptyState('documentsTable', '📄', 'No documents uploaded yet');
      return;
    }

    container.classList.remove('loading');

    // Store documents data for event delegation
    if (!window.documentsData) {
      window.documentsData = {};
    }

    const html = `
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Type</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${documents.map(doc => {
            window.documentsData[doc.id] = doc;
            return `
            <tr>
              <td><strong>📄 ${doc.original_filename}</strong></td>
              <td><span style="background: #e0e7ff; color: #6366f1; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${doc.document_type || 'other'}</span></td>
              <td>${formatFileSize(doc.file_size)}</td>
              <td>${formatDate(doc.uploaded_at)}</td>
              <td>
                <button class="download-doc-btn" data-doc-id="${doc.id}" 
                  style="padding: 4px 12px; background: #6366f1; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; margin-right: 8px;">
                  Download
                </button>
                <button class="delete-doc-btn" data-doc-id="${doc.id}" 
                  style="padding: 4px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  Delete
                </button>
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;

    // Setup event delegation for download and delete buttons (only once)
    if (!container.hasDocumentListeners) {
      container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('download-doc-btn')) {
          e.preventDefault();
          const docId = e.target.getAttribute('data-doc-id');
          await downloadDocument(docId);
        } else if (e.target.classList.contains('delete-doc-btn')) {
          e.preventDefault();
          const docId = e.target.getAttribute('data-doc-id');
          await deleteDocument(docId);
        }
      });
      container.hasDocumentListeners = true; // Mark as having listeners
    }
  }

  // Document action functions
  async function downloadDocument(docId) {
    try {
      const response = await fetch(`/api/eval/documents/${docId}/download`, { headers });
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `document-${docId}.pdf`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  }

  async function deleteDocument(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/eval/documents/${docId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Delete failed');

      // Reload documents
      await loadDocuments();
      alert('Document deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document');
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ========== Utility: Empty State ==========
  function renderEmptyState(containerId, icon, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Remove loading class
    container.classList.remove('loading');
    
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${message}</div>
      </div>
    `;
  }

  // ========== Professional Development Recommendations ==========
  async function loadRecommendations() {
    try {
      const response = await fetch(`/api/eval/teachers/${teacherId}/recommendations`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      renderRecommendations(data);
    } catch (err) {
      console.error("loadRecommendations error:", err);
      const container = document.getElementById('recommendationsArea');
      if (container) {
        container.classList.remove('loading');
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #6b7280;">
            <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
            <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Recommendations Coming Soon</div>
            <div style="font-size: 14px;">Personalized course recommendations will be available after your first evaluation</div>
          </div>
        `;
      }
    }
  }

  function renderRecommendations(data) {
    const container = document.getElementById('recommendationsArea');
    if (!container) return;

    container.classList.remove('loading');

    const { weaknesses, recommendations, currentScores } = data;

    if (!weaknesses || weaknesses.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <div style="font-size: 18px; font-weight: 600; color: #059669; margin-bottom: 8px;">Excellent Performance!</div>
          <div style="font-size: 14px; color: #6b7280;">You're performing well across all dimensions. Keep up the great work!</div>
        </div>
      `;
      return;
    }

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">💡</div>
          <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">No Courses Available</div>
          <div style="font-size: 14px; color: #6b7280;">No relevant courses found for your improvement areas</div>
        </div>
      `;
      return;
    }

    const categoryNames = {
      teaching: 'Teaching Excellence',
      research: 'Research Skills',
      service: 'Service Contribution',
      professional_development: 'Professional Growth'
    };

    container.innerHTML = `
      <div style="margin-bottom: 20px; padding: 16px; background: rgba(255, 255, 255, 0.6); border-radius: 8px;">
        <div style="font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 8px;">📊 Your Current Scores</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-size: 13px;">
          ${Object.entries(currentScores).map(([key, value]) => {
            const displayName = categoryNames[key] || key;
            const isWeak = weaknesses.includes(key);
            return `
              <div style="padding: 8px; background: ${isWeak ? '#fee2e2' : '#e0f2fe'}; border-radius: 6px; text-align: center;">
                <div style="font-weight: 600; color: ${isWeak ? '#dc2626' : '#0369a1'};">${displayName}</div>
                <div style="font-size: 16px; font-weight: 700; color: ${isWeak ? '#dc2626' : '#0369a1'};">${value.toFixed(1)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="margin-bottom: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 6px;">
        <div style="font-size: 14px; font-weight: 600; color: #dc2626; margin-bottom: 4px;">⚠️ Areas for Improvement</div>
        <div style="font-size: 13px; color: #991b1b;">${weaknesses.map(w => categoryNames[w] || w).join(', ')}</div>
      </div>

      <div style="margin-bottom: 12px; font-size: 14px; font-weight: 600; color: #92400e;">🎯 Recommended Courses</div>
      <div style="display: grid; gap: 16px;">
        ${recommendations.map(rec => `
          <div style="padding: 20px; background: white; border-radius: 12px; border: 2px solid #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">📚 ${rec.title}</div>
                <div style="font-size: 13px; color: #6b7280;">by ${rec.provider}</div>
              </div>
              <div style="background: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                ${rec.hours} hrs
              </div>
            </div>
            <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; line-height: 1.5;">${rec.description || 'No description available'}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 12px; color: #dc2626; font-weight: 600;">💡 ${rec.reason}</div>
              <div style="font-size: 12px; color: #059669; font-weight: 600;">Target: ${rec.targetScore.toFixed(1)}/5.0</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ========== Initialize ==========
  loadOverview();
})();
