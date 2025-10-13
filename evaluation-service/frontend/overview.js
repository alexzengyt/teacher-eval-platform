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

  const teacherId = q("teacher_id");
  if (!teacherId) {
    document.body.innerHTML = "<p style='color:#e11'>Missing teacher_id</p>";
    return;
  }

  // Include JWT if /api/eval is protected
  const token = localStorage.getItem("token") || "";

  fetch(`/api/eval/teachers/${teacherId}/overview`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      // Name
      const fullName = `${data.teacher?.first_name || ""} ${data.teacher?.last_name || ""}`.trim();
      document.getElementById("name").textContent = fullName || "(unknown)";

      // Overall
      document.getElementById("overall").textContent =
        num(data.evaluation?.overall_score).toFixed(2);

      // Period
      document.getElementById("period").textContent = data.evaluation?.period || "";

      // Cards
      const c = data.evaluation?.cards || {};
      document.getElementById("teaching").textContent = num(c.teaching_effectiveness).toFixed(1);
      document.getElementById("research").textContent = num(c.research_output).toFixed(1);
      document.getElementById("service").textContent  = num(c.service_contribution).toFixed(1);
      document.getElementById("grant").textContent    = num(c.grant_funding).toFixed(1);

      // Radar
      const r = data.evaluation?.radar || {};
      const ctx = document.getElementById("radar").getContext("2d");
      new Chart(ctx, {
        type: "radar",
        data: {
          labels: ["Teaching", "Research", "Service", "Professional Development"],
          datasets: [{
            label: "Score",
            data: [num(r.teaching), num(r.research), num(r.service), num(r.professional_development)],
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { r: { suggestedMin: 0, suggestedMax: 5 } } }
      });
    })
    .catch((err) => {
      document.body.innerHTML = `<p style="color:#e11">Load failed: ${err.message}</p>`;
      console.error("[overview] error:", err);
    });
})();
