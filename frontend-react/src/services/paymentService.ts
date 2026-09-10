import api from './api';
import { Payment } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const normPayment = (p: any): Payment => ({
  id: p.id,
  studentId: p.studentId,
  feeCycleId: p.feeCycleId,
  amount: Number(p.amount ?? 0),
  paymentDate: p.paymentDate ?? '',
  paymentMode: p.paymentMode ?? 'CASH',
  transactionId: p.transactionReference ?? p.transactionId,
  transactionReference: p.transactionReference ?? p.transactionId,
  receiptNumber: p.receiptNumber,
  remarks: p.remarks,
  collectedBy: p.collectedBy,
});

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

const paymentService = {
  getAll: async (params: { startDate?: string; endDate?: string }): Promise<Payment[]> => {
    const response = await api.get('/payments', { params });
    return toArray(unwrap(response)).map(normPayment);
  },

  getById: async (id: string): Promise<Payment> => {
    const response = await api.get(`/payments/${id}`);
    return normPayment(unwrap(response));
  },

  getByStudent: async (studentId: string): Promise<Payment[]> => {
    const response = await api.get(`/payments/student/${studentId}`);
    return toArray(unwrap(response)).map(normPayment);
  },

  getByFeeCycle: async (feeCycleId: string): Promise<Payment[]> => {
    const response = await api.get(`/payments/fee-cycle/${feeCycleId}`);
    return toArray(unwrap(response)).map(normPayment);
  },

  record: async (data: Omit<Payment, 'id'>): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return normPayment(unwrap(response));
  },

  getReceipt: async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
    return response.data;
  },

  downloadReceipt: async (paymentId: string): Promise<void> => {
    const blob = await paymentService.getReceipt(paymentId);
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${paymentId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getMonthlyStats: async (month: number, year: number) => {
    const response = await api.get('/payments/stats', { params: { month, year } });
    return unwrap(response);
  },
};

export default paymentService;
