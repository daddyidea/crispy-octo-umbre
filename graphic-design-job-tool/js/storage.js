(function () {
  const KEY = "designJobToolStateV1";
  const defaults = {
    profile: {
      fullName: "",
      email: "",
      phone: "",
      cityCountry: "",
      linkedin: "",
      portfolioUrl: "",
      cvFileName: "",
      cvDataUrl: "",
      portfolioFileName: "",
      portfolioDataUrl: "",
      coverLetter: `Dear Hiring Manager at [COMPANY_NAME],\n\nI am writing to express my strong interest in the [JOB_TITLE] position at [COMPANY_NAME]. As a passionate graphic designer with [EXPERIENCE_LEVEL] of experience, I am excited about the opportunity to contribute my skills to your team.\n\nMy expertise spans across [MY_SKILLS_LIST], and I have a proven track record of delivering compelling visual solutions that drive results. I am particularly drawn to [COMPANY_NAME] because of your commitment to creative excellence.\n\nI have attached my CV and portfolio for your review. I would welcome the opportunity to discuss how my design skills and creative vision can benefit your team.\n\nThank you for considering my application. I look forward to hearing from you.\n\nBest regards,\n[MY_NAME]\n[MY_EMAIL]\n[MY_PHONE]\n[MY_PORTFOLIO_URL]`,
      skills: [],
      experienceLevel: "Entry Level / Junior (0-2 years)",
      preferredLocation: "Anywhere/Remote",
      jobTypes: ["Remote"],
      minSalary: ""
    },
    jobsCache: [],
    jobsFetchedAt: 0,
    selectedJobIds: [],
    rejectedJobIds: [],
    savedJobIds: [],
    applications: [],
    settings: { darkMode: true, listView: false }
  };

  function mergeDefaults(data, base) {
    if (Array.isArray(base)) return Array.isArray(data) ? data : base;
    if (typeof base !== "object" || base === null) return data ?? base;
    const out = { ...base };
    Object.keys(base).forEach((key) => {
      out[key] = mergeDefaults(data?.[key], base[key]);
    });
    return out;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      return mergeDefaults(JSON.parse(raw), defaults);
    } catch {
      return structuredClone(defaults);
    }
  }

  function saveState(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

  function exportState(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `design-job-tool-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importState(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        cb(mergeDefaults(JSON.parse(String(reader.result)), defaults));
      } catch {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file);
  }

  window.StorageAPI = { loadState, saveState, exportState, importState, defaults };
})();
