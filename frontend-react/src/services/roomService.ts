import api from './api';
import { Room } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const roomService = {
  getAll: async (): Promise<Room[]> => {
    const response = await api.get('/rooms');
    return toArray(unwrap(response));
  },

  create: async (data: Omit<Room, 'id'>): Promise<Room> => {
    const response = await api.post('/rooms', data);
    return unwrap(response);
  },

  update: async (id: string, data: Partial<Room>): Promise<Room> => {
    const response = await api.put(`/rooms/${id}`, data);
    return unwrap(response);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rooms/${id}`);
  },
};

export default roomService;
