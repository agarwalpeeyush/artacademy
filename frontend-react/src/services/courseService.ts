import api from './api';
import { Course, CourseFeeItem } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const normFee = (f: any): CourseFeeItem => ({
  id: f.id,
  feeType: f.feeType,
  amount: f.amount ?? 0,
  cadence: f.cadence,
  instituteShareType: f.instituteShareType ?? null,
  instituteShareValue: f.instituteShareValue ?? null,
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
};

export default courseService;
