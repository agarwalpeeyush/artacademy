export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now();
};

export const getTokenExpiry = (token: string): Date | null => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return new Date(payload.exp * 1000);
};

export const extractRolesFromToken = (token: string): string[] => {
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  if (Array.isArray(payload.roles)) return payload.roles as string[];
  if (Array.isArray(payload.authorities)) return payload.authorities as string[];
  return [];
};
