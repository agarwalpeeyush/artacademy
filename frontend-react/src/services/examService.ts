import api from './api';
import { Exam } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (e: any): Exam => ({
  id: e.id,
  courseId: e.courseId,
  courseName: e.courseName ?? '',
  title: e.title ?? '',
  examDate: e.examDate,
  startTime: e.startTime,
  endTime: e.endTime,
  status: e.status ?? 'SCHEDULED',
});

const examService = {
  getAll: async (courseId?: string): Promise<Exam[]> => {
    const params = courseId ? { courseId } : {};
    const response = await api.get('/exams', { params });
    return toArray(unwrap(response)).map(norm);
  },

  create: async (data: {
    courseId: string;
    title?: string;
    examDate: string;
    startTime: string;
    endTime: string;
  }): Promise<Exam> => {
    const response = await api.post('/exams', data);
    return norm(unwrap(response));
  },
};

export default examService;
