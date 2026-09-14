import { Course, Enrollment, Timetable, Teacher } from '../types';

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

/** courseId -> set of teacherIds who teach that course (derived from timetables). */
export type CourseTeacherMap = Map<string, Set<string>>;

export const buildCourseTeacherMap = (timetables: Timetable[]): CourseTeacherMap => {
  const map: CourseTeacherMap = new Map();
  timetables.forEach((t) => {
    if (!t.courseId || !t.teacherId) return;
    const set = map.get(t.courseId) ?? new Set<string>();
    set.add(t.teacherId);
    map.set(t.courseId, set);
  });
  return map;
};

/** Courses a teacher teaches, derived from that teacher's timetable entries. */
export const teacherCoursesFromTimetables = (
  timetables: Timetable[],
  teacherId: string,
  allCourses: Course[],
): Course[] => {
  const courseIds = new Set(
    timetables.filter((t) => t.teacherId === teacherId).map((t) => t.courseId),
  );
  return allCourses.filter((c) => courseIds.has(c.id));
};

/** Comma-joined teacher names for the course an enrollment belongs to. */
export const resolveTeacherNames = (
  enrollment: Enrollment,
  courseTeacherMap: CourseTeacherMap,
  teachers: Teacher[],
): string => {
  const teacherIds = courseTeacherMap.get(enrollment.courseId);
  if (!teacherIds || teacherIds.size === 0) return '';
  return Array.from(teacherIds)
    .map((id) => {
      const t = teachers.find((tt) => tt.id === id);
      return t ? `${t.firstName} ${t.lastName}`.trim() : '';
    })
    .filter(Boolean)
    .join(', ');
};

export interface EnrollmentFilters {
  courseId?: string;
  teacherId?: string;
}

export const filterEnrollments = (
  enrollments: Enrollment[],
  filters: EnrollmentFilters,
  courseTeacherMap: CourseTeacherMap,
): Enrollment[] => {
  return enrollments.filter((e) => {
    if (filters.courseId && e.courseId !== filters.courseId) return false;
    if (filters.teacherId && !(courseTeacherMap.get(e.courseId)?.has(filters.teacherId))) {
      return false;
    }
    return true;
  });
};

const hhmm = (t: string): string => (t ? t.slice(0, 5) : '');

/** Human label for a single slot, e.g. "Mon 17:00–18:00". */
export const formatSlotLabel = (s: Timetable): string => {
  const day = DAY_SHORT[s.dayOfWeek?.toUpperCase()] ?? s.dayOfWeek;
  return `${day} ${hhmm(s.startTime)}–${hhmm(s.endTime)}`;
};

/**
 * Compact read-only weekly summary for a set of timetable entries,
 * e.g. "Mon 17:00–18:00, Wed 17:00–18:00". Empty string when none.
 */
export const formatTimetableSummary = (entries: Timetable[]): string => {
  return [...entries]
    .sort((a, b) => {
      const d = (DAY_ORDER[a.dayOfWeek?.toUpperCase()] ?? 99) - (DAY_ORDER[b.dayOfWeek?.toUpperCase()] ?? 99);
      return d !== 0 ? d : hhmm(a.startTime).localeCompare(hhmm(b.startTime));
    })
    .map(formatSlotLabel)
    .join(', ');
};
