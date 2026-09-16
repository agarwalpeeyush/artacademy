import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AttendanceCorrection } from '../../types';
import attendanceService, { AttendanceEdit } from '../../services/attendanceService';

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

export const editStudentAttendance = createAsyncThunk<
  AttendanceCorrection[],
  { editedByUserId: string; editorRole: string; reason?: string; edits: AttendanceEdit[] }
>('corrections/editStudent', async (data, { rejectWithValue }) => {
  try {
    return await attendanceService.editStudentAttendance(data);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to edit attendance'));
  }
});

export const fetchCorrectionsForSubject = createAsyncThunk<
  AttendanceCorrection[],
  string
>('corrections/fetchForSubject', async (subjectId, { rejectWithValue }) => {
  try {
    return await attendanceService.getCorrectionsForSubject(subjectId);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to fetch correction history'));
  }
});

export const fetchCorrectionsForAttendance = createAsyncThunk<
  AttendanceCorrection[],
  string
>('corrections/fetchForAttendance', async (attendanceId, { rejectWithValue }) => {
  try {
    return await attendanceService.getCorrectionsForAttendance(attendanceId);
  } catch (error: unknown) {
    return rejectWithValue(errMsg(error, 'Failed to fetch correction history'));
  }
});

const prepend = (state: CorrectionState, records: AttendanceCorrection[]) => {
  state.corrections = [...records, ...state.corrections];
};

const correctionSlice = createSlice({
  name: 'corrections',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearCorrections(state) { state.corrections = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCorrectionsForSubject.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCorrectionsForSubject.fulfilled, (state, action) => { state.loading = false; state.corrections = action.payload; })
      .addCase(fetchCorrectionsForSubject.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchCorrectionsForAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCorrectionsForAttendance.fulfilled, (state, action) => { state.loading = false; state.corrections = action.payload; })
      .addCase(fetchCorrectionsForAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(editStudentAttendance.fulfilled, (state, action) => { prepend(state, action.payload); })
      .addCase(editStudentAttendance.rejected, (state, action) => { state.error = action.payload as string; });
  },
});

export const { clearError, clearCorrections } = correctionSlice.actions;
export default correctionSlice.reducer;
