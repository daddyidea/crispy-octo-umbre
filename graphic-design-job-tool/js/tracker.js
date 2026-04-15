(function () {
  const STATUSES = ["Applied", "Viewed", "Response Received", "Interview Scheduled", "Offer Received", "Rejected", "No Response"];

  function statusEmoji(status) {
    const map = {
      "Applied": "📨",
      "Viewed": "👀",
      "Response Received": "💬",
      "Interview Scheduled": "📞",
      "Offer Received": "🎉",
      "Rejected": "❌",
      "No Response": "🗄️"
    };
    return map[status] || "📨";
  }

  function buildStats(applications) {
    const total = applications.length;
    const responses = applications.filter((a) => ["Response Received", "Interview Scheduled", "Offer Received"].includes(a.status)).length;
    const interviews = applications.filter((a) => a.status === "Interview Scheduled").length;
    const offers = applications.filter((a) => a.status === "Offer Received").length;
    const responseRate = total ? Math.round((responses / total) * 100) : 0;
    return { total, responses, interviews, offers, responseRate };
  }

  window.TrackerAPI = { STATUSES, statusEmoji, buildStats };
})();
