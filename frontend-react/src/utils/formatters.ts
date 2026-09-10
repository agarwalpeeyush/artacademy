import { format, parseISO, isValid } from 'date-fns';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'dd MMM yyyy, HH:mm');
  } catch {
    return dateStr;
  }
};

export const formatMonthYear = (month: number, year: number): string => {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy');
};

/** Formats an ISO date/date-time string as dd/MM/yyyy. */
export const formatDateDMY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
};

/** Converts a dd/MM/yyyy string to an ISO date (yyyy-MM-dd). Returns null if invalid. */
export const parseDMYtoISO = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (!isValid(date) || date.getDate() !== day || date.getMonth() !== month - 1) return null;
  return `${yyyy}-${mm}-${dd}`;
};

/** Today's date as dd/MM/yyyy, useful as a default for editable date inputs. */
export const todayDMY = (): string => format(new Date(), 'dd/MM/yyyy');

export const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-';
  try {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(date, 'hh:mm a');
  } catch {
    return timeStr;
  }
};

export const getDayName = (dayOfWeek: string): string => {
  const days: Record<string, string> = {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday',
  };
  return days[dayOfWeek.toUpperCase()] || dayOfWeek;
};

export const getMonthName = (month: number): string => {
  const date = new Date(2000, month - 1, 1);
  return format(date, 'MMMM');
};
