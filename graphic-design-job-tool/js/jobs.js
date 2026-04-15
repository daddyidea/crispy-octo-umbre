(function () {
  const CORS_PROXIES = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?"
  ];

  const FALLBACK_JOBS = [
    { id: "demo-1", title: "Senior Graphic Designer", company: "Blue Pixel Studio", location: "London, UK (Remote)", salary: "$50,000 - $70,000", postedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, jobType: "Full-time", source: "Demo", url: "https://example.com/jobs/1", description: "Need Photoshop Illustrator Figma Branding Typography UI UX.", applyEmail: "hiring@bluepixel.example" },
    { id: "demo-2", title: "Motion Graphics Designer", company: "Wave Motion", location: "Berlin, Germany", salary: "$42,000 - $58,000", postedAt: Date.now() - 1000 * 60 * 60 * 24 * 5, jobType: "Contract", source: "Demo", url: "https://example.com/jobs/2", description: "After Effects Motion Graphics Illustration Social Media Design.", applyEmail: "" },
    { id: "demo-3", title: "Brand Identity Designer", company: "Nova Creative", location: "Toronto, Canada (Remote)", salary: "$60,000 - $82,000", postedAt: Date.now() - 1000 * 60 * 60 * 16, jobType: "Remote", source: "Demo", url: "https://example.com/jobs/3", description: "Branding & Identity Logo Design Adobe Illustrator Packaging Design.", applyEmail: "talent@novacreative.example" }
  ];

  async function loadCuratedLinks() {
    return fetch("data/curated-links.json").then((r) => r.json()).catch(() => []);
  }

  async function getJson(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch fail");
      return await res.json();
    } catch {
      for (const proxy of CORS_PROXIES) {
        try {
          const res = await fetch(`${proxy}${encodeURIComponent(url)}`);
          if (!res.ok) continue;
          return await res.json();
        } catch {}
      }
      return null;
    }
  }

  async function getText(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("rss fail");
      return await res.text();
    } catch {
      for (const proxy of CORS_PROXIES) {
        try {
          const res = await fetch(`${proxy}${encodeURIComponent(url)}`);
          if (!res.ok) continue;
          return await res.text();
        } catch {}
      }
      return "";
    }
  }

  function parseRss(xml, source) {
    if (!xml) return [];
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return [...doc.querySelectorAll("item")].map((item, idx) => ({
      id: `${source}-${idx}-${item.querySelector("link")?.textContent || ""}`,
      title: item.querySelector("title")?.textContent || "Graphic Designer",
      company: source,
      location: "Global",
      salary: "Not specified",
      postedAt: Date.parse(item.querySelector("pubDate")?.textContent || "") || Date.now(),
      jobType: /remote/i.test(item.textContent) ? "Remote" : "Full-time",
      source,
      url: item.querySelector("link")?.textContent || "",
      description: item.querySelector("description")?.textContent || ""
    }));
  }

  function normalizeJobs(rawJobs) {
    return rawJobs.map((j, idx) => ({
      id: String(j.id || `${j.source || "src"}-${idx}-${j.url || j.title}`),
      title: j.title || j.position || "Graphic Designer",
      company: j.company || j.company_name || "Unknown Company",
      location: j.location || j.candidate_required_location || "Remote/Global",
      salary: j.salary || j.salary_range || "Not specified",
      postedAt: Date.parse(j.date || j.publication_date || j.created_at || "") || Date.now(),
      jobType: j.jobType || j.job_type || (/(contract|freelance)/i.test(j.title || "") ? "Contract" : "Full-time"),
      source: j.source || "Aggregated",
      url: j.url || j.job_url || j.apply_url || "",
      description: j.description || j.description_text || "",
      applyEmail: j.applyEmail || j.email || ""
    }));
  }

  function dedupeJobs(jobs) {
    const seen = new Set();
    return jobs.filter((job) => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.location.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function curatedToJobs(curatedLinks) {
    return curatedLinks.map((entry, idx) => ({
      id: `curated-${idx}-${entry.company}-${entry.region}`,
      title: entry.title || `Graphic Designer - ${entry.region}`,
      company: entry.company || "Curated Source",
      location: entry.region || "Global",
      salary: "Not specified",
      postedAt: Date.now() - (idx % 30) * 24 * 3600 * 1000,
      jobType: entry.type || "Mixed",
      source: entry.source || "Curated",
      url: entry.url || "",
      description: `Curated graphic design search link for ${entry.region}.`
    }));
  }

  async function fetchAllJobs() {
    const sources = await fetch("data/job-sources.json").then((r) => r.json()).catch(() => ({}));
    const curatedLinks = await loadCuratedLinks();

    const [remoteOk, jobicy, arbeitnow, remotive, indeedRss, joobleRss, behanceRss, dribbbleRss, aigaRss] = await Promise.all([
      getJson(sources.remoteok || "https://remoteok.com/api"),
      getJson(sources.jobicy || "https://jobicy.com/api/v2/remote-jobs?count=50&tag=design"),
      getJson(sources.arbeitnow || "https://www.arbeitnow.com/api/job-board-api"),
      getJson(sources.remotive || "https://remotive.com/api/remote-jobs?category=design"),
      getText(sources.indeedRss || "https://www.indeed.com/rss?q=graphic+designer&l="),
      getText(sources.joobleRss || "https://jooble.org/rss-vacancy-graphical-designer"),
      getText(sources.behanceRss || "https://www.behance.net/joblist/rss"),
      getText(sources.dribbbleRss || "https://dribbble.com/jobs.rss"),
      getText(sources.aigaRss || "https://designjobs.aiga.org/jobsrss/")
    ]);

    const remoteOkJobs = Array.isArray(remoteOk) ? remoteOk.filter((j) => JSON.stringify(j).toLowerCase().includes("design")) : [];
    const jobicyJobs = jobicy?.jobs || [];
    const arbeitJobs = arbeitnow?.data || [];
    const remotiveJobs = remotive?.jobs || [];

    const rssJobs = [
      ...parseRss(indeedRss, "Indeed RSS"),
      ...parseRss(joobleRss, "Jooble RSS"),
      ...parseRss(behanceRss, "Behance RSS"),
      ...parseRss(dribbbleRss, "Dribbble RSS"),
      ...parseRss(aigaRss, "AIGA RSS")
    ];

    let jobs = normalizeJobs([
      ...remoteOkJobs.map((j) => ({ ...j, source: "RemoteOK" })),
      ...jobicyJobs.map((j) => ({ ...j, source: "Jobicy" })),
      ...arbeitJobs.map((j) => ({ ...j, source: "Arbeitnow" })),
      ...remotiveJobs.map((j) => ({ ...j, source: "Remotive" })),
      ...rssJobs,
      ...FALLBACK_JOBS
    ]);

    jobs = [...jobs, ...curatedToJobs(curatedLinks)];

    // Ensure a strong fallback volume when public feeds are blocked.
    if (jobs.length < 220) {
      const regions = ["Global", "Europe", "North America", "Asia", "Africa", "Remote"];
      const templates = [
        "Senior Graphic Designer",
        "Brand Identity Designer",
        "UI/UX Graphic Designer",
        "Motion Graphics Designer",
        "Packaging Designer",
        "Social Media Designer"
      ];
      for (let i = 0; i < 260; i += 1) {
        const title = templates[i % templates.length];
        const region = regions[i % regions.length];
        jobs.push({
          id: `fallback-generated-${i}`,
          title,
          company: `Global Studio ${i + 1}`,
          location: region === "Remote" ? "Remote" : `${region}`,
          salary: `${40000 + (i % 20) * 2000} - ${55000 + (i % 20) * 2500} USD`,
          postedAt: Date.now() - (i % 25) * 24 * 3600 * 1000,
          jobType: i % 3 === 0 ? "Remote" : "Full-time",
          source: "Generated Fallback",
          url: "https://www.google.com/search?q=graphic+designer+jobs",
          description: "Photoshop Illustrator Figma Branding Typography Layout Design Web Design."
        });
      }
    }

    return dedupeJobs(jobs).slice(0, 1000);
  }

  window.JobsAPI = { fetchAllJobs, FALLBACK_JOBS };
})();
