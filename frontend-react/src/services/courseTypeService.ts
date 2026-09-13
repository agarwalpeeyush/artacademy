import api from './api';
import { CourseType } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (t: any): CourseType => ({
  id: t.id,
  code: t.code,
  name: t.name,
  status: t.status ?? 'ACTIVE',
});

const courseTypeService = {
  getAll: async (): Promise<CourseType[]> => {
    const response = await api.get('/course-types');
    return toArray(unwrap(response)).map(norm);
  },

  create: async (data: { code: string; name: string; status?: string }): Promise<CourseType> => {
    const response = await api.post('/course-types', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: { code?: string; name?: string; status?: string }): Promise<CourseType> => {
    const response = await api.put(`/course-types/${id}`, data);
    return norm(unwrap(response));
  },
};

export default courseTypeService;
