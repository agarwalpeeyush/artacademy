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
  if (!month || month < 1 || month > 12) return '';
  const date = new Date(2000, month - 1, 1);
  return format(date, 'MMMM');
};

const CYCLE_KIND_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  ADMISSION: 'Admission',
  EXAM: 'Exam',
  ONE_TIME_SHORT_TERM: 'Short Term',
};

/** Human label for a fee cycle kind, e.g. ONE_TIME_SHORT_TERM -> 'Short Term'. */
export const cycleKindLabel = (kind: string | null | undefined): string =>
  kind ? CYCLE_KIND_LABELS[kind] ?? kind : '';

const CYCLE_KIND_COLORS: Record<string, 'info' | 'secondary' | 'warning' | 'default'> = {
  ADMISSION: 'info',
  EXAM: 'secondary',
  ONE_TIME_SHORT_TERM: 'warning',
};

/** MUI Chip color for a fee cycle kind. MONTHLY has no chip (returns 'default'). */
export const cycleKindColor = (kind: string | null | undefined): 'info' | 'secondary' | 'warning' | 'default' =>
  kind ? CYCLE_KIND_COLORS[kind] ?? 'default' : 'default';

const FEE_TYPE_LABELS: Record<string, string> = {
  ADMISSION: 'Admission Fee',
  MONTHLY: 'Monthly Fee',
  EXAM: 'Exam Fee',
  ONE_TIME_SHORT_TERM: 'Short-Term Fee',
};

/** Human label for a course fee type. */
export const feeTypeLabel = (feeType: string | null | undefined): string =>
  feeType ? FEE_TYPE_LABELS[feeType] ?? feeType : '';

/**
 * Institute cut of a billed amount under a frozen share rule (mirrors backend F6):
 * AMOUNT -> min(value, billed); PERCENTAGE -> round(billed * value / 100, 2). Institute never
 * exceeds billed. A null/absent type means "no institute cut" and yields 0.
 */
export const instituteShare = (
  type: 'AMOUNT' | 'PERCENTAGE' | null | undefined,
  value: number | null | undefined,
  billed: number | null | undefined,
): number => {
  const base = billed ?? 0;
  if (!type || value == null) return 0;
  const raw = type === 'AMOUNT' ? Math.min(value, base) : (base * value) / 100;
  const capped = Math.min(Math.max(raw, 0), base);
  return Math.round(capped * 100) / 100;
};

/** Teacher remainder = billed - institute (mirrors backend F6). */
export const teacherShare = (
  billed: number | null | undefined,
  institute: number | null | undefined,
): number => Math.round((Math.max((billed ?? 0) - (institute ?? 0), 0)) * 100) / 100;

/**
 * Human label for a course fee's institute-share template (F2). PERCENTAGE renders as "N%",
 * AMOUNT as a currency value. A null/absent type means no institute cut.
 */
export const instituteShareLabel = (
  type: 'AMOUNT' | 'PERCENTAGE' | null | undefined,
  value: number | null | undefined,
): string => {
  if (!type || value == null) return 'No institute cut';
  return type === 'PERCENTAGE' ? `${value}%` : formatCurrency(value);
};
