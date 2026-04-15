(() => {
  const state = StorageAPI.loadState();
  let jobs = state.jobsCache || [];
  let filteredJobs = [...jobs];
  let activeTab = "dashboard";

  const els = {
    tabNav: document.getElementById("tabNav"),
    topStats: document.getElementById("topStats"),
    jobsContainer: document.getElementById("jobsContainer"),
    recommendationBuckets: document.getElementById("recommendationBuckets"),
    loadingState: document.getElementById("loadingState"),
    rightPanel: document.getElementById("rightPanel"),
    detailModal: document.getElementById("jobDetailModal"),
    detailContent: document.getElementById("jobDetailContent")
  };

  const filters = {
    search: document.getElementById("searchInput"),
    location: document.getElementById("locationFilter"),
    remoteOnly: document.getElementById("remoteOnlyFilter"),
    experience: document.getElementById("experienceFilter"),
    jobType: document.getElementById("jobTypeFilter"),
    match: document.getElementById("matchSlider"),
    matchValue: document.getElementById("matchSliderValue"),
    salaryMin: document.getElementById("salaryMinFilter"),
    date: document.getElementById("dateFilter"),
    sort: document.getElementById("sortFilter")
  };

  const COUNTRIES = ["Anywhere/Remote", "United Kingdom", "United States", "Canada", "Germany", "France", "Netherlands", "Australia", "UAE", "Singapore", "India", "Nigeria", "South Africa", "Brazil", "Japan"];
  const JOB_TYPES = ["Any", "Full-time", "Part-time", "Contract", "Freelance", "Remote"];
  const EXP = ["Any", "Entry Level / Junior (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5-10 years)", "Lead / Director (10+ years)"];

  function save() { StorageAPI.saveState(state); }

  function initFilters() {
    filters.location.innerHTML = COUNTRIES.map((c) => `<option>${c}</option>`).join("");
    filters.experience.innerHTML = EXP.map((e) => `<option>${e}</option>`).join("");
    filters.jobType.innerHTML = JOB_TYPES.map((t) => `<option>${t}</option>`).join("");
    filters.location.value = "Anywhere/Remote";
    filters.experience.value = "Any";
    filters.jobType.value = "Any";
  }

  function buildTopStats() {
    const stats = [
      `Total Jobs Found: ${jobs.length}`,
      `Selected: ${state.selectedJobIds.length}`,
      `Rejected: ${state.rejectedJobIds.length}`,
      `Saved: ${state.savedJobIds.length}`
    ];
    els.topStats.innerHTML = stats.map((s) => `<div class="stat-chip">${s}</div>`).join("");
  }

  function enrichJob(job) {
    const match = MatcherAPI.computeMatch(job, state.profile);
    return { ...job, match };
  }

  function applyFilters() {
    const query = filters.search.value.toLowerCase();
    const minMatch = Number(filters.match.value || 0);
    filters.matchValue.textContent = String(minMatch);
    const minSalary = Number(filters.salaryMin.value || 0);
    const days = filters.date.value === "all" ? 9999 : Number(filters.date.value);
    const cutoff = Date.now() - days * 24 * 3600 * 1000;

    filteredJobs = jobs.map(enrichJob).filter((j) => {
      if (state.rejectedJobIds.includes(j.id)) return false;
      if (query && !(`${j.title} ${j.company}`.toLowerCase().includes(query))) return false;
      if (filters.location.value !== "Anywhere/Remote" && !j.location.toLowerCase().includes(filters.location.value.toLowerCase())) return false;
      if (filters.remoteOnly.checked && !/remote/i.test(j.location)) return false;
      if (filters.experience.value !== "Any" && !(`${j.title} ${j.description}`.toLowerCase().includes(filters.experience.value.split(" ")[0].toLowerCase()))) return false;
      if (filters.jobType.value !== "Any" && !(`${j.jobType}`.toLowerCase().includes(filters.jobType.value.toLowerCase()))) return false;
      const salaryNum = Number((j.salary.match(/\d[\d,]*/)?.[0] || "0").replace(/,/g, ""));
      if (salaryNum < minSalary) return false;
      if (j.match.percent < minMatch) return false;
      if (j.postedAt < cutoff) return false;
      return true;
    });

    if (filters.sort.value === "newest") filteredJobs.sort((a, b) => b.postedAt - a.postedAt);
    else if (filters.sort.value === "salary") filteredJobs.sort((a, b) => {
      const sa = Number((a.salary.match(/\d[\d,]*/)?.[0] || "0").replace(/,/g, ""));
      const sb = Number((b.salary.match(/\d[\d,]*/)?.[0] || "0").replace(/,/g, ""));
      return sb - sa;
    });
    else filteredJobs.sort((a, b) => b.match.percent - a.match.percent);

    renderBrowse();
  }

  function recommendationStats() {
    const groups = {
      "🎯 Top Picks For You": filteredJobs.filter((j) => j.match.percent >= 90).length,
      "💪 Strong Matches": filteredJobs.filter((j) => j.match.percent >= 70 && j.match.percent < 90).length,
      "🔍 Worth Exploring": filteredJobs.filter((j) => j.match.percent >= 50 && j.match.percent < 70).length,
      "📈 Stretch Opportunities": filteredJobs.filter((j) => j.match.percent >= 30 && j.match.percent < 50).length,
      "🆕 Just Posted": filteredJobs.filter((j) => Date.now() - j.postedAt <= 48 * 3600 * 1000).length
    };
    els.recommendationBuckets.innerHTML = `<div class="reco-row">${Object.entries(groups).map(([k, v]) => `<div class="reco-chip">${k}: ${v}</div>`).join("")}</div>`;
  }

  function card(job) {
    const selected = state.selectedJobIds.includes(job.id);
    const saved = state.savedJobIds.includes(job.id);
    const daysAgo = Math.max(0, Math.floor((Date.now() - job.postedAt) / (1000 * 3600 * 24)));
    return `<article class="job-card">
      <div>🏢 ${job.company}</div>
      <h3>🎨 ${job.title}</h3>
      <div class="job-meta"><span>📍 ${job.location}</span><span>💰 ${job.salary}</span><span>📅 ${daysAgo} days ago</span></div>
      <div class="job-skills">Skills: ${(job.match.requiredSkills.slice(0, 6).join(", ") || "Design, Creativity")}</div>
      <div class="match-badge">MATCH: ${job.match.percent}%</div>
      <div class="job-actions">
        <button data-action="select" data-id="${job.id}">${selected ? "☑️ Selected" : "✅ Select"}</button>
        <button data-action="reject" data-id="${job.id}">❌ Reject</button>
        <button data-action="save" data-id="${job.id}">${saved ? "⭐ Saved" : "⭐ Save"}</button>
        <button data-action="view" data-id="${job.id}">👁️ Details</button>
      </div>
    </article>`;
  }

  function renderBrowse() {
    recommendationStats();
    els.jobsContainer.className = state.settings.listView ? "jobs-list" : "jobs-grid";
    els.jobsContainer.innerHTML = filteredJobs.map(card).join("") || `<div class="panel-card">No jobs match current filters.</div>`;
  }

  function renderProfileTab() {
    const p = state.profile;
    document.getElementById("profileTab").innerHTML = `
      <div class="panel-card">
        <h2 class="section-title">My Profile</h2>
        <form id="profileForm" class="form-grid">
          <input required name="fullName" placeholder="Full Name" value="${p.fullName || ""}" />
          <input required type="email" name="email" placeholder="Email Address" value="${p.email || ""}" />
          <input required name="phone" placeholder="Phone Number" value="${p.phone || ""}" />
          <input required name="cityCountry" placeholder="City & Country" value="${p.cityCountry || ""}" />
          <input name="linkedin" placeholder="LinkedIn URL (optional)" value="${p.linkedin || ""}" />
          <input name="portfolioUrl" placeholder="Portfolio Website URL (optional)" value="${p.portfolioUrl || ""}" />
          <label>CV (PDF max 10MB)<input type="file" id="cvUpload" accept="application/pdf" /></label>
          <label>Portfolio (PDF max 50MB)<input type="file" id="portfolioUpload" accept="application/pdf" /></label>
          <select name="experienceLevel">${EXP.slice(1).map((e) => `<option ${p.experienceLevel === e ? "selected" : ""}>${e}</option>`).join("")}</select>
          <select name="preferredLocation">${COUNTRIES.map((c) => `<option ${p.preferredLocation === c ? "selected" : ""}>${c}</option>`).join("")}</select>
          <input name="minSalary" placeholder="Minimum Salary Expectation (optional)" value="${p.minSalary || ""}" />
          <div><strong>Job Type:</strong>${["Full-time", "Part-time", "Contract", "Freelance", "Remote"].map((t) => `<label><input type="checkbox" name="jobType" value="${t}" ${p.jobTypes?.includes(t) ? "checked" : ""}/> ${t}</label>`).join(" ")}</div>
          <label style="grid-column:1/-1">Cover Letter<textarea name="coverLetter" rows="10">${p.coverLetter || ""}</textarea></label>
          <div style="grid-column:1/-1"><strong>Skills:</strong>
            <div class="checkbox-grid">${MatcherAPI.SKILL_KEYWORDS.map((s) => `<label><input type="checkbox" name="skills" value="${s}" ${p.skills?.includes(s) ? "checked" : ""}/> ${s}</label>`).join("")}</div>
          </div>
          <button style="grid-column:1/-1" type="submit">Save Profile</button>
        </form>
        <small>Current CV: ${p.cvFileName || "none"} | Portfolio: ${p.portfolioFileName || "none"}</small>
      </div>`;

    document.getElementById("profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      state.profile = {
        ...state.profile,
        fullName: data.get("fullName"), email: data.get("email"), phone: data.get("phone"), cityCountry: data.get("cityCountry"),
        linkedin: data.get("linkedin"), portfolioUrl: data.get("portfolioUrl"), coverLetter: data.get("coverLetter"),
        experienceLevel: data.get("experienceLevel"), preferredLocation: data.get("preferredLocation"), minSalary: data.get("minSalary"),
        skills: data.getAll("skills"), jobTypes: data.getAll("jobType")
      };
      save();
      applyFilters();
      renderAllTabs();
      alert("Profile saved to localStorage.");
    });

    wireFileUpload("cvUpload", 10, "cv");
    wireFileUpload("portfolioUpload", 50, "portfolio");
  }

  function wireFileUpload(id, maxMb, kind) {
    document.getElementById(id).addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type !== "application/pdf") return alert("Only PDF allowed");
      if (file.size > maxMb * 1024 * 1024) return alert(`Max ${maxMb}MB`);
      const reader = new FileReader();
      reader.onload = () => {
        state.profile[`${kind}FileName`] = file.name;
        state.profile[`${kind}DataUrl`] = String(reader.result);
        save();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderDashboardTab() {
    const trackerStats = TrackerAPI.buildStats(state.applications);
    document.getElementById("dashboardTab").innerHTML = `
      <div class="panel-card">
        <h2>Overview</h2>
        <p>Welcome ${state.profile.fullName || "Designer"}. Jobs fetched: ${jobs.length}. Cache age: ${state.jobsFetchedAt ? Math.round((Date.now() - state.jobsFetchedAt) / 60000) : 0} mins.</p>
      </div>
      <div class="panel-card">
        <h3>Application Stats</h3>
        <p>Total Applications Sent: ${trackerStats.total}</p>
        <p>Responses: ${trackerStats.responses} | Interviews: ${trackerStats.interviews} | Offers: ${trackerStats.offers}</p>
        <p>Response Rate: ${trackerStats.responseRate}%</p>
      </div>`;
  }

  function renderSelectedTab() {
    const selected = jobs.map(enrichJob).filter((j) => state.selectedJobIds.includes(j.id));
    const rows = selected.map((job) => {
      const letter = MatcherAPI.personalizeCoverLetter(state.profile.coverLetter, state.profile, job);
      return `<div class="panel-card">
        <strong>${job.title}</strong> - ${job.company}<br/>
        <textarea rows="7" data-letter="${job.id}">${letter}</textarea>
        <div>CV: ${state.profile.cvFileName || "Not uploaded"} | Portfolio: ${state.profile.portfolioFileName || "Not uploaded"}</div>
        <button data-review-apply="${job.id}">Apply to This Job</button>
        <button data-open-link="${job.id}">Open Job Link</button>
      </div>`;
    }).join("");

    document.getElementById("selectedTab").innerHTML = `
      <div class="panel-card">
        <h2>Selected Jobs (${selected.length})</h2>
        <button id="reviewApplyAllBtn">Review & Apply</button>
        <button id="packageZipBtn">Generate Application Package ZIP</button>
      </div>${rows || `<div class='panel-card'>No selected jobs yet.</div>`}`;

    const applyButtons = document.querySelectorAll("[data-review-apply]");
    applyButtons.forEach((btn) => btn.addEventListener("click", () => applyJob(btn.dataset.reviewApply)));
    document.querySelectorAll("[data-open-link]").forEach((btn) => btn.addEventListener("click", () => openApplyLink(btn.dataset.openLink)));
    const reviewBtn = document.getElementById("reviewApplyAllBtn");
    if (reviewBtn) reviewBtn.onclick = () => reviewApplyBatch(selected);
    const zipBtn = document.getElementById("packageZipBtn");
    if (zipBtn) zipBtn.onclick = () => generateZip(selected);
  }

  async function generateZip(selected) {
    if (!selected.length) return;
    const zip = new JSZip();
    for (const job of selected) {
      const folder = zip.folder(`${job.company}-${job.title}`.replace(/[^a-z0-9\- ]/gi, "").slice(0, 60));
      const letter = MatcherAPI.personalizeCoverLetter(state.profile.coverLetter, state.profile, job);
      folder.file("cover-letter.txt", letter);
      folder.file("job-details.txt", `Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nLink: ${job.url}`);
      if (state.profile.cvDataUrl) folder.file(state.profile.cvFileName || "cv.pdf", state.profile.cvDataUrl.split(",")[1], { base64: true });
      if (state.profile.portfolioDataUrl) folder.file(state.profile.portfolioFileName || "portfolio.pdf", state.profile.portfolioDataUrl.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "application-packages.zip";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openApplyLink(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.url) return;
    navigator.clipboard?.writeText(MatcherAPI.personalizeCoverLetter(state.profile.coverLetter, state.profile, job));
    window.open(job.url, "_blank");
    upsertApplication(job, "Viewed");
  }

  function applyJob(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const letter = MatcherAPI.personalizeCoverLetter(state.profile.coverLetter, state.profile, job);
    if (job.applyEmail) {
      const subject = encodeURIComponent(`Application for ${job.title} - ${state.profile.fullName || "Applicant"}`);
      const body = encodeURIComponent(`${letter}\n\n(Please attach CV and portfolio manually before sending.)`);
      window.open(`mailto:${job.applyEmail}?subject=${subject}&body=${body}`);
    } else if (job.url) {
      openApplyLink(jobId);
    }
    upsertApplication(job, "Applied");
  }

  function reviewApplyBatch(selected) {
    if (!selected.length) return;
    if (selected.length > 10 && !confirm("Open in batches of 10 to avoid popup blocker?")) return;
    for (let i = 0; i < selected.length; i += 1) {
      if (i < 10) applyJob(selected[i].id);
    }
  }

  function upsertApplication(job, status) {
    const existing = state.applications.find((a) => a.jobId === job.id);
    if (existing) existing.status = status;
    else state.applications.push({ jobId: job.id, title: job.title, company: job.company, link: job.url, dateApplied: new Date().toISOString().slice(0, 10), status });
    save();
    renderApplicationsTab();
    renderDashboardTab();
  }

  function renderSavedTab() {
    const saved = jobs.map(enrichJob).filter((j) => state.savedJobIds.includes(j.id));
    document.getElementById("savedTab").innerHTML = `<div class="panel-card"><h2>Saved Jobs (${saved.length})</h2></div>${saved.map(card).join("") || `<div class='panel-card'>No saved jobs.</div>`}`;
  }

  function renderApplicationsTab() {
    const rows = state.applications.map((a, idx) => `<tr>
      <td>${a.title}</td><td>${a.company}</td><td>${a.dateApplied}</td>
      <td><select data-app-status="${idx}">${TrackerAPI.STATUSES.map((s) => `<option ${a.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      <td><a href="${a.link}" target="_blank">Open</a></td>
    </tr>`).join("");
    document.getElementById("applicationsTab").innerHTML = `<div class="panel-card"><h2>Application Tracker</h2><table><thead><tr><th>Job Title</th><th>Company</th><th>Date Applied</th><th>Status</th><th>Link</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    document.querySelectorAll("[data-app-status]").forEach((sel) => {
      sel.addEventListener("change", () => {
        state.applications[Number(sel.dataset.appStatus)].status = sel.value;
        save();
        renderDashboardTab();
      });
    });
  }

  function renderSettingsTab() {
    document.getElementById("settingsTab").innerHTML = `<div class="panel-card">
      <h2>Settings</h2>
      <button id="exportBtn">Export Backup JSON</button>
      <label>Import Backup JSON<input id="importInput" type="file" accept="application/json"/></label>
      <button id="openCuratedBatchBtn">Open 10 Curated Links</button>
      <p>Google Jobs: <a target="_blank" href="https://www.google.com/search?q=graphic+designer+jobs&ibp=htl;jobs">Open Google Jobs</a></p>
      <p>Indeed Search: <a target="_blank" href="https://www.indeed.com/jobs?q=graphic+designer">Open Indeed</a></p>
      <p><strong>Preview URL (local server):</strong> http://localhost:5500/index.html</p>
    </div>`;
    document.getElementById("exportBtn").onclick = () => StorageAPI.exportState(state);
    document.getElementById("openCuratedBatchBtn").onclick = () => {
      const curated = jobs.filter((j) => j.source === "Curated").slice(0, 10);
      if (curated.length > 5 && !confirm("Open 10 tabs? Popup blockers may block some tabs.")) return;
      curated.forEach((job) => job.url && window.open(job.url, "_blank"));
    };
    document.getElementById("importInput").onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      StorageAPI.importState(file, (newState) => { Object.assign(state, newState); save(); init(); });
    };
  }

  function renderRightPanel() {
    const p = state.profile;
    els.rightPanel.innerHTML = `<div class="panel-card"><h3>Quick Profile</h3>
      <div><strong>${p.fullName || "Your Name"}</strong></div>
      <div>${p.email || "email@example.com"}</div>
      <div>${p.phone || ""}</div>
      <div>${p.cityCountry || ""}</div>
      <div>${(p.skills || []).slice(0, 6).join(", ")}</div>
      <button id="copyCoverBtn">Copy Cover Letter</button>
      <button id="copyInfoBtn">Copy Contact Info</button>
    </div>`;
    document.getElementById("copyCoverBtn").onclick = () => navigator.clipboard?.writeText(state.profile.coverLetter || "");
    document.getElementById("copyInfoBtn").onclick = () => navigator.clipboard?.writeText(`${p.fullName}\n${p.email}\n${p.phone}\n${p.portfolioUrl}`);
  }

  function renderAllTabs() {
    renderDashboardTab();
    renderProfileTab();
    renderSelectedTab();
    renderSavedTab();
    renderApplicationsTab();
    renderSettingsTab();
    renderRightPanel();
    buildTopStats();
  }

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById(`${tab}Tab`).classList.add("active");
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add("active");
  }

  async function loadJobs(force = false) {
    const stale = Date.now() - state.jobsFetchedAt > 1000 * 60 * 30;
    if (!force && jobs.length && !stale) { applyFilters(); return; }
    els.loadingState.classList.remove("hidden");
    try {
      jobs = await JobsAPI.fetchAllJobs();
      state.jobsCache = jobs;
      state.jobsFetchedAt = Date.now();
      save();
    } finally {
      els.loadingState.classList.add("hidden");
      applyFilters();
      buildTopStats();
      renderAllTabs();
    }
  }

  function wireActions() {
    els.tabNav.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      setTab(btn.dataset.tab);
    });

    [filters.search, filters.location, filters.remoteOnly, filters.experience, filters.jobType, filters.match, filters.salaryMin, filters.date, filters.sort].forEach((el) => el.addEventListener("input", applyFilters));

    document.getElementById("refreshJobsBtn").onclick = () => loadJobs(true);
    document.getElementById("themeToggleBtn").onclick = () => {
      state.settings.darkMode = !state.settings.darkMode;
      document.body.classList.toggle("dark", state.settings.darkMode);
      save();
    };
    document.getElementById("viewToggleBtn").onclick = () => {
      state.settings.listView = !state.settings.listView;
      save();
      renderBrowse();
    };

    document.getElementById("selectVisibleBtn").onclick = () => { filteredJobs.forEach((j) => { if (!state.selectedJobIds.includes(j.id)) state.selectedJobIds.push(j.id); }); save(); renderAllTabs(); buildTopStats(); renderBrowse(); };
    document.getElementById("select80Btn").onclick = () => { filteredJobs.filter((j) => j.match.percent >= 80).forEach((j) => { if (!state.selectedJobIds.includes(j.id)) state.selectedJobIds.push(j.id); }); save(); renderAllTabs(); buildTopStats(); renderBrowse(); };
    document.getElementById("selectRemoteBtn").onclick = () => { filteredJobs.filter((j) => /remote/i.test(j.location)).forEach((j) => { if (!state.selectedJobIds.includes(j.id)) state.selectedJobIds.push(j.id); }); save(); renderAllTabs(); buildTopStats(); renderBrowse(); };
    document.getElementById("selectPreferredCountryBtn").onclick = () => { filteredJobs.filter((j) => j.location.toLowerCase().includes((state.profile.preferredLocation || "").toLowerCase())).forEach((j) => { if (!state.selectedJobIds.includes(j.id)) state.selectedJobIds.push(j.id); }); save(); renderAllTabs(); buildTopStats(); renderBrowse(); };
    document.getElementById("deselectAllBtn").onclick = () => { state.selectedJobIds = []; save(); renderAllTabs(); buildTopStats(); renderBrowse(); };

    els.jobsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const job = filteredJobs.find((j) => j.id === id);
      if (!job) return;
      if (btn.dataset.action === "select") {
        if (!state.selectedJobIds.includes(id)) state.selectedJobIds.push(id);
      } else if (btn.dataset.action === "reject") {
        if (!state.rejectedJobIds.includes(id)) state.rejectedJobIds.push(id);
        state.selectedJobIds = state.selectedJobIds.filter((x) => x !== id);
      } else if (btn.dataset.action === "save") {
        if (state.savedJobIds.includes(id)) state.savedJobIds = state.savedJobIds.filter((x) => x !== id);
        else state.savedJobIds.push(id);
      } else if (btn.dataset.action === "view") {
        showDetails(job);
      }
      save();
      buildTopStats();
      renderAllTabs();
      applyFilters();
    });
  }

  function showDetails(job) {
    const letter = MatcherAPI.personalizeCoverLetter(state.profile.coverLetter, state.profile, job);
    els.detailContent.innerHTML = `<h2>${job.title}</h2>
      <p><strong>${job.company}</strong> | ${job.location}</p>
      <p>${job.description}</p>
      <p>Matched skills: ${job.match.matchedSkills.join(", ") || "None"}</p>
      <p>Missing skills: ${job.match.missingSkills.join(", ") || "None"}</p>
      <p><a href="${job.url}" target="_blank">Open original posting</a></p>
      <button id="applyThisFromModal">Apply to This Job</button>
      <details><summary>Cover letter preview</summary><pre>${letter}</pre></details>`;
    els.detailModal.showModal();
    document.getElementById("applyThisFromModal").onclick = () => applyJob(job.id);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  function initWorker() {
    if (!window.Worker) return;
    const workerCode = `self.onmessage = async (e)=>{ if(e.data==='prefetch'){ try{ await fetch('https://remoteok.com/api'); self.postMessage('done'); }catch{ self.postMessage('fail'); } } };`;
    const blob = new Blob([workerCode], { type: "text/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.postMessage("prefetch");
  }

  function init() {
    document.body.classList.toggle("dark", state.settings.darkMode);
    initFilters();
    renderAllTabs();
    wireActions();
    registerServiceWorker();
    initWorker();
    loadJobs(false);
    setTab(activeTab);
  }

  init();
})();
