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
      case 'teaching':
        loadTeachingData();
        break;
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

      // Time series chart
      await loadTimeSeriesChart();

      // Peer comparison
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
            ticks: { stepSize: 1 }
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

  async function loadPeerComparison() {
    try {
      const container = document.getElementById("comparisonData");
      
      // Create comparison mode selector and content area (vertical layout: buttons on top, table below)
      container.innerHTML = `
        <!-- Mode selector at top -->
        <div style="display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
          <span style="font-weight: 600; color: #4b5563; margin-right: 8px;">Compare with:</span>
          <button class="compare-mode-btn active" data-mode="top3" style="padding: 8px 16px; border: 2px solid #6366f1; background: #6366f1; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            Top 3 Performers
          </button>
          <button class="compare-mode-btn" data-mode="top5" style="padding: 8px 16px; border: 2px solid #d1d5db; background: white; color: #6b7280; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            Top 5 Performers
          </button>
        </div>
        
        <!-- Comparison table below -->
        <div id="comparisonContent">
          <div class="loading">
            <div class="spinner"></div>
            Loading comparison...
          </div>
        </div>
      `;

      // Add event listeners for mode buttons
      const modeButtons = container.querySelectorAll('.compare-mode-btn');
      modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          modeButtons.forEach(b => {
            b.style.background = 'white';
            b.style.color = '#6b7280';
            b.style.borderColor = '#d1d5db';
            b.classList.remove('active');
          });
          btn.style.background = '#6366f1';
          btn.style.color = 'white';
          btn.style.borderColor = '#6366f1';
          btn.classList.add('active');

          const mode = btn.getAttribute('data-mode');
          loadComparisonData(mode);
        });
        
        // Add hover effect
        btn.addEventListener('mouseenter', () => {
          if (!btn.classList.contains('active')) {
            btn.style.borderColor = '#6366f1';
            btn.style.color = '#6366f1';
          }
        });
        btn.addEventListener('mouseleave', () => {
          if (!btn.classList.contains('active')) {
            btn.style.borderColor = '#d1d5db';
            btn.style.color = '#6b7280';
          }
        });
      });

      // Load default comparison (top3)
      await loadComparisonData('top3');

    } catch (err) {
      console.error("loadPeerComparison error:", err);
      document.getElementById("comparisonData").innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load comparison interface</div></div>';
    }
  }

  async function loadComparisonData(mode) {
    try {
      const contentDiv = document.getElementById('comparisonContent');
      contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading comparison...</div>';

      const url = `/api/eval/analytics/comparison?currentTeacherId=${teacherId}&compareWith=${mode}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const teachers = data.teachers || [];

      if (teachers.length === 0) {
        contentDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No comparison data available</div></div>';
        return;
      }

      // Render comparison table (simple and clean style)
      const html = `
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 12px 16px; text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Rank</th>
              <th style="padding: 12px 16px; text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Teacher</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Overall</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Teaching</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Research</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Evals</th>
            </tr>
          </thead>
          <tbody>
            ${teachers.map((t, idx) => `
              <tr style="border-bottom: 1px solid #e5e7eb; ${t.isCurrent ? 'background: #eef2ff;' : ''}">
                <td style="padding: 14px 16px;">
                  <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background: ${idx < 3 ? '#6366f1' : '#e5e7eb'}; color: ${idx < 3 ? 'white' : '#6b7280'}; border-radius: 50%; font-weight: 600; font-size: 13px;">${idx + 1}</span>
                </td>
                <td style="padding: 14px 16px;">
                  <div style="font-weight: 600; color: #1f2937; font-size: 14px;">
                    ${t.teacherName}
                    ${t.isCurrent ? '<span style="display: inline-block; margin-left: 8px; background: #6366f1; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">YOU</span>' : ''}
                  </div>
                </td>
                <td style="padding: 14px 16px; text-align: center;">
                  <span style="font-weight: 700; font-size: 16px; color: ${t.isCurrent ? '#6366f1' : '#1f2937'};">${t.averageScore.toFixed(2)}</span>
                </td>
                <td style="padding: 14px 16px; text-align: center; color: #6b7280; font-size: 14px;">${t.avgTeaching ? t.avgTeaching.toFixed(1) : 'N/A'}</td>
                <td style="padding: 14px 16px; text-align: center; color: #6b7280; font-size: 14px;">${t.avgResearch ? t.avgResearch.toFixed(1) : 'N/A'}</td>
                <td style="padding: 14px 16px; text-align: center; color: #6b7280; font-size: 14px;">${t.avgService ? t.avgService.toFixed(1) : 'N/A'}</td>
                <td style="padding: 14px 16px; text-align: center; color: #6b7280; font-size: 14px;">${t.totalEvaluations}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      contentDiv.innerHTML = html;
    } catch (err) {
      console.error("loadComparisonData error:", err);
      document.getElementById('comparisonContent').innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load comparison data</div></div>';
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
        if (coursesResponse.ok) {
          courses = await coursesResponse.json();
        }
      } catch (err) {
        console.log("Could not load courses from API, using mock data");
      }

      // If no courses, use mock data
      if (!courses || courses.length === 0) {
        courses = [
          { period: '2025 Spring', code: 'ECON302', title: 'Business Management', student_count: 45, avg_rating: 4.7 },
          { period: '2024 Fall', code: 'HIST217', title: 'Modern History', student_count: 38, avg_rating: 4.6 },
          { period: '2024 Fall', code: 'STAT312', title: 'Statistical Methods', student_count: 42, avg_rating: 4.9 },
          { period: '2024 Spring', code: 'ECON302', title: 'Business Management', student_count: 40, avg_rating: 4.6 },
          { period: '2023 Fall', code: 'HIST217', title: 'Modern History', student_count: 35, avg_rating: 4.8 },
        ];
      }
      
      renderCoursesTable(courses);

      // Render student evaluation chart (mock data for now)
      renderStudentEvalChart();
    } catch (err) {
      console.error("loadTeachingData error:", err);
      renderEmptyState('coursesTable', '📚', 'Failed to load teaching data');
    }
  }

  function renderCoursesTable(courses) {
    const container = document.getElementById('coursesTable');
    
    if (!courses || courses.length === 0) {
      renderEmptyState('coursesTable', '📚', 'No courses taught yet');
      return;
    }

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
              <td><strong style="color: #6366f1;">${course.avg_rating ? course.avg_rating.toFixed(1) : 'N/A'}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  function renderStudentEvalChart() {
    const ctx = document.getElementById("studentEvalChart").getContext("2d");
    
    // Mock data by course - replace with real API call
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["2023 Fall", "2024 Spring", "2024 Fall", "2025 Spring"],
        datasets: [
          {
            label: "ECON302: Business Management",
            data: [4.5, 4.6, 4.5, 4.7],
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: "rgba(99, 102, 241, 1)",
            tension: 0.4,
          },
          {
            label: "HIST217: Modern History",
            data: [4.7, 4.8, 4.6, 4.8],
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
            tension: 0.4,
          },
          {
            label: "STAT312: Statistical Methods",
            data: [4.6, 4.8, 4.7, 4.9],
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderColor: "rgba(245, 158, 11, 1)",
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: "rgba(245, 158, 11, 1)",
            tension: 0.4,
          }
        ]
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

  // ========== Utility: Empty State ==========
  function renderEmptyState(containerId, icon, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${message}</div>
      </div>
    `;
  }

  // ========== Initialize ==========
  loadOverview();
})();
