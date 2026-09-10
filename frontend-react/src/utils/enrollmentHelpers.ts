import { Course, CourseClass, Enrollment, Timetable, Teacher } from '../types';

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

export type ClassMap = Map<string, CourseClass>;

export const buildClassMap = (classes: CourseClass[]): ClassMap => {
  const map: ClassMap = new Map();
  classes.forEach((c) => map.set(c.id, c));
  return map;
};

export const teacherCoursesFromClasses = (
  classes: CourseClass[],
  teacherId: string,
  allCourses: Course[],
): Course[] => {
  const courseIds = new Set(
    classes.filter((c) => c.teacherId === teacherId).map((c) => c.courseId),
  );
  return allCourses.filter((c) => courseIds.has(c.id));
};

export const teacherIdForEnrollment = (
  enrollment: Enrollment,
  classMap: ClassMap,
): string | undefined => {
  if (!enrollment.classId) return undefined;
  return classMap.get(enrollment.classId)?.teacherId;
};

export const resolveTeacherName = (
  enrollment: Enrollment,
  classMap: ClassMap,
  teachers: Teacher[],
): string => {
  const teacherId = teacherIdForEnrollment(enrollment, classMap);
  if (!teacherId) return '';
  const teacher = teachers.find((t) => t.id === teacherId);
  return teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : '';
};

export interface EnrollmentFilters {
  courseId?: string;
  teacherId?: string;
}

export const filterEnrollments = (
  enrollments: Enrollment[],
  filters: EnrollmentFilters,
  classMap: ClassMap,
): Enrollment[] => {
  return enrollments.filter((e) => {
    if (filters.courseId && e.courseId !== filters.courseId) return false;
    if (filters.teacherId && teacherIdForEnrollment(e, classMap) !== filters.teacherId) {
      return false;
    }
    return true;
  });
};

const hhmm = (t: string): string => (t ? t.slice(0, 5) : '');

/**
 * Compact read-only weekly summary for a class's timetable,
 * e.g. "Mon 17:00–18:00, Wed 17:00–18:00". Empty string when none.
 */
export const formatClassTimetable = (entries: Timetable[]): string => {
  return [...entries]
    .sort((a, b) => {
      const d = (DAY_ORDER[a.dayOfWeek?.toUpperCase()] ?? 99) - (DAY_ORDER[b.dayOfWeek?.toUpperCase()] ?? 99);
      return d !== 0 ? d : hhmm(a.startTime).localeCompare(hhmm(b.startTime));
    })
    .map((s) => {
      const day = DAY_SHORT[s.dayOfWeek?.toUpperCase()] ?? s.dayOfWeek;
      return `${day} ${hhmm(s.startTime)}–${hhmm(s.endTime)}`;
    })
    .join(', ');
};
