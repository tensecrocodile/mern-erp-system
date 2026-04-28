function formatDuration(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

module.exports = { formatDuration };
