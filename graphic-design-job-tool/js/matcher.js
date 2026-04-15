(function () {
  const SKILL_KEYWORDS = [
    "Adobe Photoshop","Adobe Illustrator","Adobe InDesign","Adobe After Effects","Adobe XD","Figma","Sketch","Canva","CorelDRAW","Procreate","Blender 3D","Typography","Logo Design","Branding & Identity","Print Design","Packaging Design","Social Media Design","UI/UX Design","Motion Graphics","Photo Editing/Retouching","Illustration","Layout Design","Web Design","Infographic Design"
  ];

  function normalizeSkill(skill) { return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

  function extractSkills(text = "") {
    const lower = text.toLowerCase();
    return SKILL_KEYWORDS.filter((s) => {
      const plain = normalizeSkill(s);
      return lower.includes(plain) || lower.includes(s.toLowerCase());
    });
  }

  function levelGroup(level = "") {
    const l = level.toLowerCase();
    if (l.includes("junior") || l.includes("entry")) return "junior";
    if (l.includes("mid")) return "mid";
    if (l.includes("senior")) return "senior";
    if (l.includes("lead") || l.includes("director")) return "lead";
    return "";
  }

  function computeMatch(job, profile) {
    const foundSkills = extractSkills(`${job.title} ${job.description}`);
    const profileSkills = profile.skills || [];
    const matched = foundSkills.filter((s) => profileSkills.includes(s));
    const base = foundSkills.length ? (matched.length / foundSkills.length) * 100 : (profileSkills.length ? 45 : 20);

    let bonus = 0;
    if (levelGroup(job.experience || job.title) === levelGroup(profile.experienceLevel)) bonus += 10;
    if ((job.location || "").toLowerCase().includes((profile.preferredLocation || "").toLowerCase())) bonus += 10;
    if (profile.jobTypes?.includes("Remote") && /remote/i.test(job.location || "")) bonus += 5;

    return {
      requiredSkills: foundSkills,
      matchedSkills: matched,
      missingSkills: foundSkills.filter((s) => !matched.includes(s)),
      percent: Math.max(0, Math.min(100, Math.round(base + bonus)))
    };
  }

  function personalizeCoverLetter(template, profile, job) {
    return template
      .replaceAll("[COMPANY_NAME]", job.company || "Your Company")
      .replaceAll("[JOB_TITLE]", job.title || "Graphic Designer")
      .replaceAll("[LOCATION]", job.location || "your location")
      .replaceAll("[EXPERIENCE_LEVEL]", profile.experienceLevel || "my")
      .replaceAll("[MY_SKILLS_LIST]", (profile.skills || []).join(", ") || "design")
      .replaceAll("[MY_NAME]", profile.fullName || "Your Name")
      .replaceAll("[MY_EMAIL]", profile.email || "")
      .replaceAll("[MY_PHONE]", profile.phone || "")
      .replaceAll("[MY_PORTFOLIO_URL]", profile.portfolioUrl || "");
  }

  window.MatcherAPI = { SKILL_KEYWORDS, extractSkills, computeMatch, personalizeCoverLetter };
})();
