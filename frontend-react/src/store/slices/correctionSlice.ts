import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AttendanceCorrection } from '../../types';
import attendanceService from '../../services/attendanceService';

interface CorrectionState {
  corrections: AttendanceCorrection[];
  loading: boolean;
  error: string | null;
}

const initialState: CorrectionState = {
  corrections: [],
  loading: false,
  error: null,
};

const errMsg = (error: unknown, fallback: string): string => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || fallback;
};

export const submitCorrection = createAsyncThunk<
  AttendanceCorrection,
  { studentAttendanceId: string; requestedStatus: string; reason?: string; requestedByTeacherId: string }
>('corrections/submit', async (data, { rejectWithValue }) => {
  try {
    return await attendanceService.submitCorrection(data);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to submit correction'));
  }
});

export const fetchCorrections = createAsyncThunk<
  AttendanceCorrection[],
  { status?: string }
>('corrections/fetch', async (params, { rejectWithValue }) => {
  try {
    return await attendanceService.getCorrections(params);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to fetch corrections'));
  }
});

export const fetchTeacherCorrections = createAsyncThunk<
  AttendanceCorrection[],
  string
>('corrections/fetchTeacher', async (teacherId, { rejectWithValue }) => {
  try {
    return await attendanceService.getTeacherCorrections(teacherId);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to fetch corrections'));
  }
});

export const approveCorrection = createAsyncThunk<
  AttendanceCorrection,
  { id: string; reviewedByPrincipalId: string; reviewNote?: string }
>('corrections/approve', async ({ id, reviewedByPrincipalId, reviewNote }, { rejectWithValue }) => {
  try {
    return await attendanceService.approveCorrection(id, reviewedByPrincipalId, reviewNote);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to approve correction'));
  }
});

export const rejectCorrection = createAsyncThunk<
  AttendanceCorrection,
  { id: string; reviewedByPrincipalId: string; reviewNote?: string }
>('corrections/reject', async ({ id, reviewedByPrincipalId, reviewNote }, { rejectWithValue }) => {
  try {
    return await attendanceService.rejectCorrection(id, reviewedByPrincipalId, reviewNote);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to reject correction'));
  }
});

const upsert = (state: CorrectionState, record: AttendanceCorrection) => {
  const idx = state.corrections.findIndex(c => c.id === record.id);
  if (idx !== -1) state.corrections[idx] = record;
  else state.corrections.unshift(record);
};

const correctionSlice = createSlice({
  name: 'corrections',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCorrections.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCorrections.fulfilled, (state, action) => { state.loading = false; state.corrections = action.payload; })
      .addCase(fetchCorrections.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchTeacherCorrections.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeacherCorrections.fulfilled, (state, action) => { state.loading = false; state.corrections = action.payload; })
      .addCase(fetchTeacherCorrections.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(submitCorrection.fulfilled, (state, action) => { upsert(state, action.payload); })
      .addCase(submitCorrection.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(approveCorrection.fulfilled, (state, action) => { upsert(state, action.payload); })
      .addCase(rejectCorrection.fulfilled, (state, action) => { upsert(state, action.payload); });
  },
});

export const { clearError } = correctionSlice.actions;
export default correctionSlice.reducer;
