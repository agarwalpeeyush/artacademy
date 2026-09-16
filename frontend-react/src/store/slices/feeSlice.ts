import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FeeBill, FeeDetailLine, FeeGenerateResponse, ScopedStudent, TeacherRevenueSummary } from '../../types';
import feeService from '../../services/feeService';

interface FeeState {
  students: ScopedStudent[];
  details: FeeDetailLine[];
  bills: FeeBill[];
  teacherSummaries: TeacherRevenueSummary[];
  loading: boolean;
  error: string | null;
}

const initialState: FeeState = {
  students: [],
  details: [],
  bills: [],
  teacherSummaries: [],
  loading: false,
  error: null,
};

const errMsg = (error: unknown, fallback: string): string => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || fallback;
};

export const fetchScopedStudents = createAsyncThunk<ScopedStudent[], string | undefined>(
  'fees/fetchStudents',
  async (teacherId, { rejectWithValue }) => {
    try {
      return await feeService.getStudents(teacherId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch students'));
    }
  }
);

export const fetchFeeDetails = createAsyncThunk<FeeDetailLine[], string>(
  'fees/fetchDetails',
  async (enrollmentId, { rejectWithValue }) => {
    try {
      return await feeService.getDetails(enrollmentId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch fee lines'));
    }
  }
);

export const fetchStudentBills = createAsyncThunk<FeeBill[], string>(
  'fees/fetchBills',
  async (studentId, { rejectWithValue }) => {
    try {
      return await feeService.getBills(studentId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch bills'));
    }
  }
);

export const generateBills = createAsyncThunk<FeeGenerateResponse, { enrollmentId: string; generateMissing: boolean }>(
  'fees/generate',
  async ({ enrollmentId, generateMissing }, { rejectWithValue }) => {
    try {
      return await feeService.generate(enrollmentId, generateMissing);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to generate bills'));
    }
  }
);

export const generateExamBills = createAsyncThunk<FeeBill[], string>(
  'fees/generateExam',
  async (courseId, { rejectWithValue }) => {
    try {
      return await feeService.generateExam(courseId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to generate exam bills'));
    }
  }
);

export const fetchTeacherSummaries = createAsyncThunk<TeacherRevenueSummary[]>(
  'fees/fetchTeacherSummaries',
  async (_, { rejectWithValue }) => {
    try {
      return await feeService.getTeacherSummaries();
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch teacher summaries'));
    }
  }
);

const feeSlice = createSlice({
  name: 'fees',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearDetails(state) { state.details = []; },
    clearBills(state) { state.bills = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScopedStudents.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchScopedStudents.fulfilled, (state, action) => { state.loading = false; state.students = action.payload; })
      .addCase(fetchScopedStudents.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchFeeDetails.fulfilled, (state, action) => { state.details = action.payload; })
      .addCase(fetchStudentBills.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudentBills.fulfilled, (state, action) => { state.loading = false; state.bills = action.payload; })
      .addCase(fetchStudentBills.rejected, (state, action) => { state.loading = false; state.bills = []; state.error = action.payload as string; })
      .addCase(generateBills.fulfilled, (state, action) => {
        state.bills = [...state.bills, ...action.payload.generated];
      })
      .addCase(fetchTeacherSummaries.fulfilled, (state, action) => { state.teacherSummaries = action.payload; });
  },
});

export const { clearError, clearDetails, clearBills } = feeSlice.actions;
export default feeSlice.reducer;
