// evaluation-service/frontend/overview.js
(function () {
  function q(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  const teacherId = q("teacher_id");
  if (!teacherId) {
    document.body.innerHTML = "<p style='color:#e11'>Missing teacher_id</p>";
    return;
  }

  fetch(`/api/eval/teachers/${teacherId}/overview`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      document.getElementById("name").textContent =
        `${data.teacher.first_name} ${data.teacher.last_name}`;
      document.getElementById("overall").textContent = data.evaluation.overall_score.toFixed(2);
      document.getElementById("period").textContent = data.evaluation.period;

      const cards = data.evaluation.cards;
      document.getElementById("teaching").textContent = cards.teaching_effectiveness.toFixed(1);
      document.getElementById("research").textContent = cards.research_output.toFixed(1);
      document.getElementById("service").textContent = cards.service_contribution.toFixed(1);
      document.getElementById("grant").textContent = cards.grant_funding.toFixed(1);

      const radar = data.evaluation.radar;
      const ctx = document.getElementById("radar").getContext("2d");
      new Chart(ctx, {
        type: "radar",
        data: {
          labels: ["Teaching", "Research", "Service", "Professional Development"],
          datasets: [{
            label: "Score",
            data: [radar.teaching, radar.research, radar.service, radar.professional_development]
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { r: { suggestedMin: 0, suggestedMax: 5 } }
        }
      });
    })
    .catch(err => {
      document.body.innerHTML = `<p style="color:#e11">Load failed: ${err.message}</p>`;
      console.error(err);
    });
})();
