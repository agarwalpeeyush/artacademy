import api from './api';

const unwrap = (r: any) => r.data?.data ?? r.data;

const userService = {
  /** Returns true when the login ID is free across all users (students, teachers, parents). */
  checkLoginId: async (loginId: string): Promise<boolean> => {
    const response = await api.get('/users/login-id/available', { params: { loginId } });
    return Boolean(unwrap(response)?.available);
  },
};

export default userService;
