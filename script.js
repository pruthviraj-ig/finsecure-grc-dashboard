let allRisks = [];
let allControls = [];
let allCompliance = [];
let currentFilter = "All";

let riskLevelChartInstance = null;
let riskStatusChartInstance = null;
let controlEffectivenessChartInstance = null;
let residualRiskChartInstance = null;
let assetRiskChartInstance = null;
let controlsStatusChartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();

  try {
    const [risksRes, controlsRes, complianceRes] = await Promise.all([
      fetch("data/risks.json"),
      fetch("data/controls.json"),
      fetch("data/compliance.json")
    ]);

    const risksData = await risksRes.json();
    const controlsData = await controlsRes.json();
    const complianceData = await complianceRes.json();

    allRisks = risksData.risks;
    allControls = controlsData.controls;
    allCompliance = complianceData.frameworks;

    updateDashboard(allRisks, allControls, allCompliance);
    renderRiskTable(allRisks);
    renderControlsTable(allControls);
    renderCompliance(allCompliance);
    renderAllVisuals(allRisks, allControls);
    setupFilters();

    window.addEventListener("resize", () => {
      renderFlowPanel();
    });
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
});

function setupTheme() {
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");

  const savedTheme = localStorage.getItem("dashboardTheme");
  if (savedTheme === "light") {
    body.classList.add("light");
    themeToggle.textContent = "🌙 Dark Mode";
  } else {
    themeToggle.textContent = "☀️ Light Mode";
  }

  themeToggle.addEventListener("click", () => {
    body.classList.toggle("light");

    const isLight = body.classList.contains("light");
    themeToggle.textContent = isLight ? "🌙 Dark Mode" : "☀️ Light Mode";
    localStorage.setItem("dashboardTheme", isLight ? "light" : "dark");

    renderAllVisuals(getFilteredRisks(), allControls);
  });
}

function updateDashboard(risks, controls, compliance) {
  document.getElementById("totalRisks").textContent = risks.length;
  document.getElementById("highRisks").textContent = risks.filter(r => r.level === "High").length;
  document.getElementById("mediumRisks").textContent = risks.filter(r => r.level === "Medium").length;
  document.getElementById("openRisks").textContent = risks.filter(r => r.status === "Open").length;
  document.getElementById("totalControls").textContent = controls.length;
  document.getElementById("totalFrameworks").textContent = compliance.length;
}

function renderAllVisuals(risks, controls) {
  renderCharts(risks, controls);
  renderHeatmap(risks);
  renderFlowPanel();
}

function renderRiskTable(risks) {
  const riskTable = document.getElementById("riskTable");
  riskTable.innerHTML = "";

  if (!risks.length) {
    riskTable.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">No risks found for the selected filter.</td>
      </tr>
    `;
    return;
  }

  risks.forEach(risk => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${risk.id}</td>
      <td>${risk.name}</td>
      <td>${risk.asset}</td>
      <td>${risk.likelihood}</td>
      <td>${risk.impact}</td>
      <td>${risk.score}</td>
      <td><span class="badge ${risk.level.toLowerCase()}">${risk.level}</span></td>
      <td><span class="badge ${risk.status.toLowerCase()}">${risk.status}</span></td>
      <td>${risk.owner}</td>
      <td><span class="badge ${risk.residualRisk.toLowerCase()}">${risk.residualRisk}</span></td>
    `;
    riskTable.appendChild(row);
  });
}

function renderControlsTable(controls) {
  const controlsTable = document.getElementById("controlsTable");
  controlsTable.innerHTML = "";

  controls.forEach(control => {
    const effectivenessClass = getEffectivenessClass(control.effectiveness);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${control.id}</td>
      <td>${control.name}</td>
      <td>${control.linkedRisk}</td>
      <td>${control.type}</td>
      <td><span class="badge ${effectivenessClass}">${control.effectiveness}</span></td>
      <td>${control.gap}</td>
      <td>${control.recommendation}</td>
    `;
    controlsTable.appendChild(row);
  });
}

function renderCompliance(frameworks) {
  const complianceGrid = document.getElementById("complianceGrid");
  complianceGrid.innerHTML = "";

  frameworks.forEach(item => {
    const card = document.createElement("div");
    card.className = "card compliance-card";

    const mappedControls = item.mappedControls.map(control => `<li>${control}</li>`).join("");

    card.innerHTML = `
      <h3>${item.framework}</h3>
      <p>${item.summary}</p>
      <ul>${mappedControls}</ul>
    `;

    complianceGrid.appendChild(card);
  });
}

function renderCharts(risks, controls) {
  const isLight = document.body.classList.contains("light");

  const textColor = isLight ? "#0a2540" : "#e8eef9";
  const gridColor = isLight ? "rgba(10,37,64,0.08)" : "rgba(255,255,255,0.08)";
  const accentBlue = isLight ? "rgba(47, 111, 237, 0.85)" : "rgba(124, 156, 255, 0.85)";
  const highColor = isLight ? "rgba(220, 38, 38, 0.82)" : "rgba(248, 113, 113, 0.85)";
  const mediumColor = isLight ? "rgba(245, 158, 11, 0.82)" : "rgba(251, 191, 36, 0.85)";
  const lowColor = isLight ? "rgba(34, 197, 94, 0.82)" : "rgba(74, 222, 128, 0.85)";
  const openColor = isLight ? "rgba(59, 130, 246, 0.85)" : "rgba(96, 165, 250, 0.9)";
  const closedColor = isLight ? "rgba(16, 185, 129, 0.85)" : "rgba(52, 211, 153, 0.88)";
  const limitedColor = isLight ? "rgba(239, 68, 68, 0.82)" : "rgba(251, 113, 133, 0.85)";
  const partialColor = isLight ? "rgba(245, 158, 11, 0.82)" : "rgba(250, 204, 21, 0.85)";
  const effectiveColor = isLight ? "rgba(34, 197, 94, 0.82)" : "rgba(74, 222, 128, 0.85)";

  const highCount = risks.filter(r => r.level === "High").length;
  const mediumCount = risks.filter(r => r.level === "Medium").length;
  const lowCount = risks.filter(r => r.level === "Low").length;

  const openCount = risks.filter(r => r.status === "Open").length;
  const closedCount = risks.filter(r => r.status === "Closed").length;

  const residualLowCount = risks.filter(r => r.residualRisk === "Low").length;
  const residualMediumCount = risks.filter(r => r.residualRisk === "Medium").length;
  const residualHighCount = risks.filter(r => r.residualRisk === "High").length;

  const effectiveCount = controls.filter(c => c.effectiveness === "Effective").length;
  const partialCount = controls.filter(c => c.effectiveness === "Partially Effective").length;
  const limitedCount = controls.filter(c => c.effectiveness === "Limited Effectiveness").length;

  const controlOpenCount = controls.filter(c => c.effectiveness !== "Effective").length;
  const controlClosedCount = controls.filter(c => c.effectiveness === "Effective").length;

  const assetCounts = groupCounts(risks.map(r => shortenAssetLabel(r.asset)));

  destroyCharts();

  riskLevelChartInstance = new Chart(document.getElementById("riskLevelChart"), {
    type: "bar",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [{
        data: [highCount, mediumCount, lowCount],
        backgroundColor: [highColor, mediumColor, lowColor],
        borderRadius: 10,
        maxBarThickness: 56
      }]
    },
    options: chartOptionsBase(textColor, gridColor, false)
  });

  riskStatusChartInstance = new Chart(document.getElementById("riskStatusChart"), {
    type: "doughnut",
    data: {
      labels: ["Open", "Closed"],
      datasets: [{
        data: [openCount, closedCount],
        backgroundColor: [openColor, closedColor],
        borderWidth: 0,
        cutout: "68%"
      }]
    },
    options: donutOptions(textColor)
  });

  controlEffectivenessChartInstance = new Chart(document.getElementById("controlEffectivenessChart"), {
    type: "doughnut",
    data: {
      labels: ["Effective", "Partially Effective", "Limited Effectiveness"],
      datasets: [{
        data: [effectiveCount, partialCount, limitedCount],
        backgroundColor: [effectiveColor, partialColor, limitedColor],
        borderWidth: 0,
        cutout: "66%"
      }]
    },
    options: donutOptions(textColor)
  });

  residualRiskChartInstance = new Chart(document.getElementById("residualRiskChart"), {
    type: "bar",
    data: {
      labels: ["Low", "Medium", "High"],
      datasets: [{
        data: [residualLowCount, residualMediumCount, residualHighCount],
        backgroundColor: [lowColor, mediumColor, highColor],
        borderRadius: 10,
        maxBarThickness: 54
      }]
    },
    options: chartOptionsBase(textColor, gridColor, false)
  });

  assetRiskChartInstance = new Chart(document.getElementById("assetRiskChart"), {
    type: "bar",
    data: {
      labels: Object.keys(assetCounts),
      datasets: [{
        data: Object.values(assetCounts),
        backgroundColor: accentBlue,
        borderRadius: 10,
        maxBarThickness: 44
      }]
    },
    options: chartOptionsBase(textColor, gridColor, true)
  });

  controlsStatusChartInstance = new Chart(document.getElementById("controlsStatusChart"), {
    type: "doughnut",
    data: {
      labels: ["Needs Improvement", "Effective"],
      datasets: [{
        data: [controlOpenCount, controlClosedCount],
        backgroundColor: [partialColor, effectiveColor],
        borderWidth: 0,
        cutout: "68%"
      }]
    },
    options: donutOptions(textColor)
  });
}

function destroyCharts() {
  const charts = [
    riskLevelChartInstance,
    riskStatusChartInstance,
    controlEffectivenessChartInstance,
    residualRiskChartInstance,
    assetRiskChartInstance,
    controlsStatusChartInstance
  ];

  charts.forEach(chart => {
    if (chart) chart.destroy();
  });
}

function chartOptionsBase(textColor, gridColor, rotateLabels = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          font: { weight: "bold" },
          maxRotation: rotateLabels ? 20 : 0,
          minRotation: rotateLabels ? 20 : 0
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: textColor,
          stepSize: 1
        },
        grid: { color: gridColor }
      }
    }
  };
}

function donutOptions(textColor) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: textColor,
          boxWidth: 14,
          padding: 14
        }
      }
    }
  };
}

function renderHeatmap(risks) {
  const heatmapGrid = document.getElementById("heatmapGrid");
  heatmapGrid.innerHTML = "";

  const cellMap = {};

  for (let impact = 5; impact >= 1; impact--) {
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const key = `${impact}-${likelihood}`;
      cellMap[key] = [];
    }
  }

  risks.forEach(risk => {
    const mappedLikelihood = mapScaleToFive(risk.likelihood);
    const mappedImpact = mapScaleToFive(risk.impact);
    const key = `${mappedImpact}-${mappedLikelihood}`;
    cellMap[key].push(risk.id);
  });

  for (let impact = 5; impact >= 1; impact--) {
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const key = `${impact}-${likelihood}`;
      const score = impact + likelihood;
      const cell = document.createElement("div");

      let heatClass = "heat-low";
      if (score >= 8) heatClass = "heat-critical";
      else if (score >= 6) heatClass = "heat-high";
      else if (score >= 4) heatClass = "heat-medium";

      cell.className = `heatmap-cell ${heatClass}`;

      const risksHtml = cellMap[key]
        .map(id => `<span class="heatmap-risk-pill">${id}</span>`)
        .join("");

      cell.innerHTML = `
        <div class="heatmap-score">I${impact} / L${likelihood}</div>
        <div class="heatmap-risks">${risksHtml}</div>
      `;

      heatmapGrid.appendChild(cell);
    }
  }
}

function mapScaleToFive(value) {
  if (value === 1) return 1;
  if (value === 2) return 3;
  if (value === 3) return 5;
  return 1;
}

function renderFlowPanel() {
  const assetContainer = document.getElementById("assetNodes");
  const riskContainer = document.getElementById("riskNodes");
  const controlContainer = document.getElementById("controlNodes");
  const svg = document.getElementById("flowSvg");

  assetContainer.innerHTML = "";
  riskContainer.innerHTML = "";
  controlContainer.innerHTML = "";
  svg.innerHTML = "";

  const assets = [...new Set(allRisks.map(r => r.asset))];
  const risks = allRisks.map(r => ({ id: r.id, name: r.name, asset: r.asset }));
  const controls = allControls.map(c => ({ id: c.id, name: c.name, linkedRisk: c.linkedRisk }));

  assets.forEach(asset => {
    const node = document.createElement("div");
    node.className = "flow-node asset-node";
    node.dataset.key = asset;
    node.textContent = shortenAssetLabel(asset);
    assetContainer.appendChild(node);
  });

  risks.forEach(risk => {
    const node = document.createElement("div");
    node.className = "flow-node risk-node";
    node.dataset.key = risk.id;
    node.textContent = `${risk.id} • ${shortenText(risk.name, 30)}`;
    riskContainer.appendChild(node);
  });

  controls.forEach(control => {
    const node = document.createElement("div");
    node.className = "flow-node control-node";
    node.dataset.key = control.id;
    node.textContent = `${control.id} • ${shortenText(control.name, 28)}`;
    controlContainer.appendChild(node);
  });

  requestAnimationFrame(() => {
    const flowPanel = document.querySelector(".flow-panel");
    const panelRect = flowPanel.getBoundingClientRect();

    const assetNodes = [...assetContainer.querySelectorAll(".flow-node")];
    const riskNodes = [...riskContainer.querySelectorAll(".flow-node")];
    const controlNodes = [...controlContainer.querySelectorAll(".flow-node")];

    svg.setAttribute("viewBox", `0 0 ${panelRect.width} ${panelRect.height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    risks.forEach(risk => {
      const assetEl = assetNodes.find(n => n.dataset.key === risk.asset);
      const riskEl = riskNodes.find(n => n.dataset.key === risk.id);
      if (assetEl && riskEl) {
        drawCurve(svg, assetEl, riskEl, panelRect, "rgba(83, 211, 255, 0.38)");
      }
    });

    controls.forEach(control => {
      const riskEl = riskNodes.find(n => n.dataset.key === control.linkedRisk);
      const controlEl = controlNodes.find(n => n.dataset.key === control.id);
      if (riskEl && controlEl) {
        drawCurve(svg, riskEl, controlEl, panelRect, "rgba(167, 139, 250, 0.35)");
      }
    });
  });
}

function drawCurve(svg, fromEl, toEl, panelRect, strokeColor) {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const startX = fromRect.right - panelRect.left;
  const startY = fromRect.top - panelRect.top + fromRect.height / 2;
  const endX = toRect.left - panelRect.left;
  const endY = toRect.top - panelRect.top + toRect.height / 2;

  const c1X = startX + (endX - startX) * 0.45;
  const c2X = startX + (endX - startX) * 0.55;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${startX} ${startY} C ${c1X} ${startY}, ${c2X} ${endY}, ${endX} ${endY}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", strokeColor);
  path.setAttribute("stroke-width", "2.2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("opacity", "0.9");

  svg.appendChild(path);
}

function setupFilters() {
  const buttons = document.querySelectorAll(".filter-btn");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      currentFilter = button.dataset.filter;
      const filteredRisks = getFilteredRisks();

      renderRiskTable(filteredRisks);
      renderCharts(filteredRisks, allControls);
      renderHeatmap(filteredRisks);
    });
  });
}

function getFilteredRisks() {
  let filteredRisks = [...allRisks];

  if (currentFilter === "High" || currentFilter === "Medium" || currentFilter === "Low") {
    filteredRisks = allRisks.filter(risk => risk.level === currentFilter);
  } else if (currentFilter === "Open" || currentFilter === "Closed") {
    filteredRisks = allRisks.filter(risk => risk.status === currentFilter);
  }

  return filteredRisks;
}

function getEffectivenessClass(effectiveness) {
  if (effectiveness === "Partially Effective") return "medium";
  if (effectiveness === "Limited Effectiveness") return "high";
  if (effectiveness === "Effective") return "low";
  return "medium";
}

function groupCounts(arr) {
  return arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function shortenAssetLabel(asset) {
  const map = {
    "Customer Data": "Customer Data",
    "Email System": "Email",
    "Cloud Infrastructure": "Cloud",
    "Employee Access / Internal Systems": "Internal Access",
    "Payment Processing Platform": "Payment Platform",
    "Backup & Recovery Systems": "Backup & Recovery"
  };

  return map[asset] || asset;
}

function shortenText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
