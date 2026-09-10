import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Payment } from '../../types';
import paymentService from '../../services/paymentService';

interface PaymentState {
  list: Payment[];
  studentPayments: Payment[];
  cyclePayments: Payment[];
  loading: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  list: [],
  studentPayments: [],
  cyclePayments: [],
  loading: false,
  error: null,
};

export const fetchPayments = createAsyncThunk<Payment[], { startDate?: string; endDate?: string }>(
  'payments/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await paymentService.getAll(params);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const fetchStudentPayments = createAsyncThunk<Payment[], string>(
  'payments/fetchByStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      return await paymentService.getByStudent(studentId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const fetchPaymentsByFeeCycle = createAsyncThunk<Payment[], string>(
  'payments/fetchByFeeCycle',
  async (feeCycleId, { rejectWithValue }) => {
    try {
      return await paymentService.getByFeeCycle(feeCycleId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const recordPayment = createAsyncThunk<Payment, Omit<Payment, 'id'>>(
  'payments/record',
  async (data, { rejectWithValue }) => {
    try {
      return await paymentService.record(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to record payment');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPayments.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchPayments.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchStudentPayments.fulfilled, (state, action) => { state.studentPayments = action.payload; })
      .addCase(fetchPaymentsByFeeCycle.fulfilled, (state, action) => { state.cyclePayments = action.payload; })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.studentPayments.unshift(action.payload);
      });
  },
});

export const { clearError } = paymentSlice.actions;
export default paymentSlice.reducer;
