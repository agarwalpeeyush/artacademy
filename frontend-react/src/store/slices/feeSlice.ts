import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FeeCycle, FeeDetail } from '../../types';
import feeService from '../../services/feeService';

interface FeeState {
  feeCycles: FeeCycle[];
  feeDetails: FeeDetail[];
  outstanding: FeeCycle[];
  loading: boolean;
  error: string | null;
}

const initialState: FeeState = {
  feeCycles: [],
  feeDetails: [],
  outstanding: [],
  loading: false,
  error: null,
};

export const fetchFeeCycles = createAsyncThunk<FeeCycle[], { studentId?: string; month?: number; year?: number }>(
  'fees/fetchCycles',
  async (params, { rejectWithValue }) => {
    try {
      return await feeService.getFeeCycles(params);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch fee cycles');
    }
  }
);

export const fetchOutstanding = createAsyncThunk<FeeCycle[]>(
  'fees/fetchOutstanding',
  async (_, { rejectWithValue }) => {
    try {
      return await feeService.getOutstanding();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch outstanding fees');
    }
  }
);

export const fetchFeeDetails = createAsyncThunk<FeeDetail[], string>(
  'fees/fetchDetails',
  async (feeCycleId, { rejectWithValue }) => {
    try {
      return await feeService.getFeeDetails(feeCycleId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch fee details');
    }
  }
);

export const generateFees = createAsyncThunk<FeeCycle[], { month: number; year: number }>(
  'fees/generate',
  async (params, { rejectWithValue }) => {
    try {
      return await feeService.generateFees(params.month, params.year);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to generate fees');
    }
  }
);

const feeSlice = createSlice({
  name: 'fees',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeeCycles.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchFeeCycles.fulfilled, (state, action) => { state.loading = false; state.feeCycles = action.payload; })
      .addCase(fetchFeeCycles.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchOutstanding.fulfilled, (state, action) => { state.outstanding = action.payload; })
      .addCase(fetchFeeDetails.fulfilled, (state, action) => { state.feeDetails = action.payload; })
      .addCase(generateFees.fulfilled, (state, action) => {
        state.feeCycles = [...state.feeCycles, ...action.payload];
      });
  },
});

export const { clearError } = feeSlice.actions;
export default feeSlice.reducer;
