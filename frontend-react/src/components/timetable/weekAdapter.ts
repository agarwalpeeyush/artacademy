/**
 * Maps recurring weekly timetable slots (dayOfWeek + HH:mm times) to concrete
 * dated events on a fixed "anchor" week so FullCalendar can render them, and
 * maps user interactions (drag/resize/select) back to dayOfWeek + HH:mm.
 *
 * The anchor week is an arbitrary fixed Monday — dates are cosmetic; only the
 * weekday and clock time carry meaning.
 */

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// Fixed reference Monday (2024-01-01 was a Monday). Never shown to the user.
const ANCHOR_MONDAY = new Date(2024, 0, 1);

// The calendar must open on the anchor week, otherwise it defaults to the real
// current week where none of the anchor-dated events live.
export const ANCHOR_ISO = '2024-01-01';

const pad = (n: number) => String(n).padStart(2, '0');

const dayIndex = (dayOfWeek: string): number => {
  const idx = DAYS.indexOf(dayOfWeek.toUpperCase());
  return idx < 0 ? 0 : idx;
};

/** "09:00" or "09:00:00" -> "09:00". */
export const hhmm = (t: string): string => (t ? t.slice(0, 5) : '');

/** dayOfWeek + "HH:mm" -> local ISO datetime on the anchor week. */
export const slotToIso = (dayOfWeek: string, time: string): string => {
  const d = new Date(ANCHOR_MONDAY);
  d.setDate(ANCHOR_MONDAY.getDate() + dayIndex(dayOfWeek));
  const [h, m] = hhmm(time).split(':');
  d.setHours(Number(h), Number(m), 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

/** local ISO datetime -> { dayOfWeek, time: "HH:mm" }. */
export const isoToSlot = (iso: string): { dayOfWeek: string; time: string } => {
  const d = new Date(iso);
  // JS getDay: 0=Sun..6=Sat -> our Monday-first index.
  const idx = (d.getDay() + 6) % 7;
  return { dayOfWeek: DAYS[idx], time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

/** On-brand palette (theme primary/secondary families + complements). */
const PALETTE = ['#1565C0', '#FFA000', '#2E7D32', '#6A1B9A', '#C62828', '#00838F', '#EF6C00', '#5D4037'];

/** Stable colour for a course id (hash into the palette). */
export const colorForCourse = (courseId: string): string => {
  let hash = 0;
  for (let i = 0; i < courseId.length; i += 1) hash = (hash * 31 + courseId.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

/**
 * Tight grid bounds for a read-only view: the earliest class start and latest
 * class end (each snapped to the hour and padded by one hour), so the grid hides
 * hours with no classes. Falls back to 08:00–20:00 when there are no slots.
 */
export const timeBounds = (
  slots: { startTime: string; endTime: string }[],
): { min: string; max: string } => {
  if (slots.length === 0) return { min: '08:00:00', max: '20:00:00' };
  const toMin = (t: string): number => {
    const [h, m] = hhmm(t).split(':').map(Number);
    return h * 60 + m;
  };
  let earliest = Infinity;
  let latest = -Infinity;
  for (const s of slots) {
    earliest = Math.min(earliest, toMin(s.startTime));
    latest = Math.max(latest, toMin(s.endTime));
  }
  const startHour = Math.max(0, Math.floor(earliest / 60) - 1);
  const endHour = Math.min(24, Math.ceil(latest / 60) + 1);
  return { min: `${pad(startHour)}:00:00`, max: `${pad(endHour)}:00:00` };
};
