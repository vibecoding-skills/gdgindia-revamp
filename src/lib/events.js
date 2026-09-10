// The scraper snapshots events once a week, so by the time a visitor loads
// the page some of them may already be over. Filter at render time so the
// site never labels a finished event as upcoming.

// An event counts as upcoming if it starts today (visitor's local time) or later.
// Events that have already started are not "upcoming", even if their end date
// is still ahead.
export function isUpcoming(event, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const starts = new Date(event.start_date);
  return !Number.isNaN(starts.getTime()) && starts >= startOfToday;
}

export function withUpcomingEvents(chapters, now = new Date()) {
  return chapters.map(chapter => ({
    ...chapter,
    events: (chapter.events || [])
      .filter(event => isUpcoming(event, now))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
  }));
}

export function pickRandom(items, count) {
  return [...items].sort(() => 0.5 - Math.random()).slice(0, count);
}
