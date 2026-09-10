// The scraper snapshots events once a week, so by the time a visitor loads
// the page some of them may already be over. Filter at render time so the
// site never labels a finished event as upcoming.

function startOfDay(now) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day;
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// An event counts as upcoming if it starts today or later, or if it has not
// ended yet. The second case covers "save the date" listings where organisers
// leave the start date as the day the page was created and only the end date
// is meaningful (DevFest announcements often look like this).
export function isUpcoming(event, now = new Date()) {
  const today = startOfDay(now);
  const starts = validDate(event.start_date);
  const ends = validDate(event.end_date);
  return (starts !== null && starts >= today) || (ends !== null && ends >= today);
}

// True when the listed start date is already in the past but the event is
// still open, so the start date should not be shown as the event date.
export function hasPlaceholderDate(event, now = new Date()) {
  const starts = validDate(event.start_date);
  return starts !== null && starts < startOfDay(now);
}

// Placeholder-dated events sort by their end date, which is the closest thing
// to a real date the platform gives us.
export function eventSortDate(event, now = new Date()) {
  return new Date(hasPlaceholderDate(event, now) ? event.end_date : event.start_date);
}

export function withUpcomingEvents(chapters, now = new Date()) {
  return chapters.map(chapter => ({
    ...chapter,
    events: (chapter.events || [])
      .filter(event => isUpcoming(event, now))
      .sort((a, b) => eventSortDate(a, now) - eventSortDate(b, now)),
  }));
}

export function pickRandom(items, count) {
  return [...items].sort(() => 0.5 - Math.random()).slice(0, count);
}

// DevFest is a tag on gdg.community.dev, but organisers do not always apply
// it, so the title is checked as well.
export function isDevFest(event) {
  const tagged = (event.tags || []).some(tag => /devfest/i.test(tag));
  return tagged || /devfest/i.test(event.title || '');
}
