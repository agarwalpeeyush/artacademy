import api from './api';
import { Course, CourseClass, CourseFeeItem } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const normFee = (f: any): CourseFeeItem => ({
  id: f.id,
  feeType: f.feeType,
  amount: f.amount ?? 0,
  cadence: f.cadence,
});

const normCourse = (c: any): Course => ({
  id: c.id,
  courseCode: c.courseCode,
  courseName: c.courseName,
  courseTypeCode: c.courseTypeCode,
  courseTypeName: c.courseTypeName,
  description: c.description,
  durationMonths: c.durationMonths ?? 0,
  status: c.status ?? 'ACTIVE',
  fees: Array.isArray(c.fees) ? c.fees.map(normFee) : [],
});

const courseService = {
  getAll: async (): Promise<Course[]> => {
    const response = await api.get('/courses');
    return toArray(unwrap(response)).map(normCourse);
  },

  getById: async (id: string): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return normCourse(unwrap(response));
  },

  create: async (data: Omit<Course, 'id'>): Promise<Course> => {
    const response = await api.post('/courses', data);
    return normCourse(unwrap(response));
  },

  update: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.put(`/courses/${id}`, data);
    return normCourse(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },

  getAllClasses: async (): Promise<CourseClass[]> => {
    const response = await api.get('/classes');
    return toArray(unwrap(response));
  },

  getClassById: async (id: string): Promise<CourseClass> => {
    const response = await api.get(`/classes/${id}`);
    return unwrap(response);
  },

  createClass: async (data: Omit<CourseClass, 'id'>): Promise<CourseClass> => {
    const response = await api.post('/classes', data);
    return unwrap(response);
  },

  updateClass: async (id: string, data: Partial<CourseClass>): Promise<CourseClass> => {
    const response = await api.put(`/classes/${id}`, data);
    return unwrap(response);
  },

  deleteClass: async (id: string): Promise<void> => {
    await api.delete(`/classes/${id}`);
  },

  getClassesByCourse: async (courseId: string): Promise<CourseClass[]> => {
    const response = await api.get(`/classes/course/${courseId}`);
    return toArray(unwrap(response));
  },

  getClassesByTeacher: async (teacherId: string): Promise<CourseClass[]> => {
    const response = await api.get('/classes');
    return toArray(unwrap(response)).filter((c: any) => c.teacherId === teacherId);
  },

  getClassesByTeacherRemote: async (teacherId: string): Promise<CourseClass[]> => {
    const response = await api.get(`/classes/teacher/${teacherId}`);
    return toArray(unwrap(response));
  },
};

export default courseService;
