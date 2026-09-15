import api from './api';

const unwrap = (r: any) => r.data?.data ?? r.data;

export interface PersonLookupResult {
  personId: string;
  loginId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  roles: string[];
}

const userService = {
  /** Returns true when the login ID is free across all users (students, teachers, parents). */
  checkLoginId: async (loginId: string): Promise<boolean> => {
    const response = await api.get('/users/login-id/available', { params: { loginId } });
    return Boolean(unwrap(response)?.available);
  },

  /** Confirm-and-link (OQ1): existing Persons sharing this phone, offered as candidates to link. */
  lookupByPhone: async (phone: string): Promise<PersonLookupResult[]> => {
    const response = await api.get('/persons/lookup', { params: { phone } });
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },
};

export default userService;

