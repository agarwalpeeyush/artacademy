import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RevenueReport, DefaulterStudent, AttendanceReport } from '../../types';
import reportService from '../../services/reportService';

interface ReportState {
  revenueReports: RevenueReport[];
  defaulters: DefaulterStudent[];
  attendanceReports: AttendanceReport[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  revenueReports: [],
  defaulters: [],
  attendanceReports: [],
  loading: false,
  error: null,
};

export const fetchRevenue = createAsyncThunk<RevenueReport[], { year: number }>(
  'reports/fetchRevenue',
  async (params, { rejectWithValue }) => {
    try {
      return await reportService.getRevenue(params.year);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch revenue report');
    }
  }
);

export const fetchDefaulters = createAsyncThunk<DefaulterStudent[]>(
  'reports/fetchDefaulters',
  async (_, { rejectWithValue }) => {
    try {
      return await reportService.getDefaulters();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch defaulters');
    }
  }
);

export const fetchAttendanceReport = createAsyncThunk<
  AttendanceReport[],
  { startDate: string; endDate: string; type?: 'student' | 'teacher' }
>('reports/fetchAttendance', async (params, { rejectWithValue }) => {
  try {
    return await reportService.getAttendanceReport(params);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance report');
  }
});

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRevenue.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRevenue.fulfilled, (state, action) => { state.loading = false; state.revenueReports = action.payload; })
      .addCase(fetchRevenue.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchDefaulters.fulfilled, (state, action) => { state.defaulters = action.payload; })
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => { state.attendanceReports = action.payload; });
  },
});

export const { clearError } = reportSlice.actions;
export default reportSlice.reducer;
