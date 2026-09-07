import api from './api';
import { Course, CourseClass } from '../types';

const courseService = {
  getAll: async (): Promise<Course[]> => {
    const response = await api.get<Course[]>('/courses');
    return response.data;
  },

  getById: async (id: string): Promise<Course> => {
    const response = await api.get<Course>(`/courses/${id}`);
    return response.data;
  },

  create: async (data: Omit<Course, 'id'>): Promise<Course> => {
    const response = await api.post<Course>('/courses', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.put<Course>(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },

  getAllClasses: async (): Promise<CourseClass[]> => {
    const response = await api.get<CourseClass[]>('/courses/classes');
    return response.data;
  },

  getClassById: async (id: string): Promise<CourseClass> => {
    const response = await api.get<CourseClass>(`/courses/classes/${id}`);
    return response.data;
  },

  createClass: async (data: Omit<CourseClass, 'id'>): Promise<CourseClass> => {
    const response = await api.post<CourseClass>('/courses/classes', data);
    return response.data;
  },

  updateClass: async (id: string, data: Partial<CourseClass>): Promise<CourseClass> => {
    const response = await api.put<CourseClass>(`/courses/classes/${id}`, data);
    return response.data;
  },

  deleteClass: async (id: string): Promise<void> => {
    await api.delete(`/courses/classes/${id}`);
  },

  getClassesByCourse: async (courseId: string): Promise<CourseClass[]> => {
    const response = await api.get<CourseClass[]>(`/courses/${courseId}/classes`);
    return response.data;
  },

  getClassesByTeacher: async (teacherId: string): Promise<CourseClass[]> => {
    const response = await api.get<CourseClass[]>(`/courses/classes/teacher/${teacherId}`);
    return response.data;
  },
};

export default courseService;
