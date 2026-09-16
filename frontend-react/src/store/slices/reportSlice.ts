import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RevenueReport, DefaulterStudent } from '../../types';
import reportService from '../../services/reportService';

interface ReportState {
  revenueReports: RevenueReport[];
  defaulters: DefaulterStudent[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  revenueReports: [],
  defaulters: [],
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
      .addCase(fetchDefaulters.fulfilled, (state, action) => { state.defaulters = action.payload; });
  },
});

export const { clearError } = reportSlice.actions;
export default reportSlice.reducer;
