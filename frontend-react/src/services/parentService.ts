import api from './api';
import { Parent, ChildRef } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const norm = (p: any): Parent => ({
  id: p.id,
  loginId: p.loginId ?? '',
  firstName: p.firstName ?? '',
  lastName: p.lastName ?? '',
  parentName: p.parentName ?? '',
  relationship: p.relationship ?? '',
  phone: p.phone ?? '',
  email: p.email ?? '',
  address: p.address ?? '',
  occupation: p.occupation ?? '',
  children: Array.isArray(p.children) ? p.children : [],
  otherParents: Array.isArray(p.otherParents) ? p.otherParents : [],
  status: p.status ?? 'ACTIVE',
});

const parentService = {
  getAll: async (): Promise<Parent[]> => {
    const response = await api.get('/parents');
    const data = unwrap(response);
    const arr = Array.isArray(data) ? data : data?.content ?? [];
    return arr.map(norm);
  },

  getById: async (id: string): Promise<Parent> => {
    const response = await api.get(`/parents/${id}`);
    return norm(unwrap(response));
  },

  getMyProfile: async (): Promise<Parent> => {
    const response = await api.get('/parents/me');
    return norm(unwrap(response));
  },

  updateMyProfile: async (data: Partial<Parent>): Promise<Parent> => {
    const response = await api.put('/parents/me', data);
    return norm(unwrap(response));
  },

  getMyChildren: async (): Promise<ChildRef[]> => {
    const response = await api.get('/parents/me/children');
    const data = unwrap(response);
    return Array.isArray(data) ? data : data?.content ?? [];
  },

  create: async (data: Omit<Parent, 'id'>): Promise<Parent> => {
    const response = await api.post('/parents', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: Partial<Parent>): Promise<Parent> => {
    const response = await api.put(`/parents/${id}`, data);
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/parents/${id}`);
  },
};

export default parentService;
