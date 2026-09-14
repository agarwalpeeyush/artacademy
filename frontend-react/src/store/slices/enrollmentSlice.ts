import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Enrollment, CourseFeeItem } from '../../types';
import enrollmentService from '../../services/enrollmentService';

interface EnrollmentState {
  list: Enrollment[];
  studentEnrollments: Enrollment[];
  loading: boolean;
  error: string | null;
}

const initialState: EnrollmentState = {
  list: [],
  studentEnrollments: [],
  loading: false,
  error: null,
};

export const fetchEnrollments = createAsyncThunk<Enrollment[]>(
  'enrollments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await enrollmentService.getAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch enrollments');
    }
  }
);

export const fetchStudentEnrollments = createAsyncThunk<Enrollment[], string>(
  'enrollments/fetchByStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      return await enrollmentService.getByStudent(studentId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch enrollments');
    }
  }
);

export const createEnrollment = createAsyncThunk<Enrollment, Omit<Enrollment, 'id'>>(
  'enrollments/create',
  async (data, { rejectWithValue }) => {
    try {
      return await enrollmentService.create(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to create enrollment');
    }
  }
);

export const updateEnrollmentStatus = createAsyncThunk<Enrollment, { id: string; status: string }>(
  'enrollments/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await enrollmentService.updateStatus(id, status);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to update enrollment');
    }
  }
);

export const updateEnrollmentFees = createAsyncThunk<Enrollment, { id: string; fees: CourseFeeItem[] }>(
  'enrollments/updateFees',
  async ({ id, fees }, { rejectWithValue }) => {
    try {
      return await enrollmentService.updateFees(id, fees);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to update fees');
    }
  }
);

export const updateEnrollmentTimetables = createAsyncThunk<Enrollment, { id: string; timetableIds: string[] }>(
  'enrollments/updateTimetables',
  async ({ id, timetableIds }, { rejectWithValue }) => {
    try {
      return await enrollmentService.updateTimetables(id, timetableIds);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to update timetable slots');
    }
  }
);

export const deleteEnrollment = createAsyncThunk<string, string>(
  'enrollments/delete',
  async (id, { rejectWithValue }) => {
    try {
      await enrollmentService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete enrollment');
    }
  }
);

const enrollmentSlice = createSlice({
  name: 'enrollments',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnrollments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEnrollments.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchEnrollments.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchStudentEnrollments.fulfilled, (state, action) => { state.studentEnrollments = action.payload; })
      .addCase(createEnrollment.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(updateEnrollmentStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateEnrollmentFees.fulfilled, (state, action) => {
        const idx = state.list.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateEnrollmentTimetables.fulfilled, (state, action) => {
        const idx = state.list.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(deleteEnrollment.fulfilled, (state, action) => {
        state.list = state.list.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearError } = enrollmentSlice.actions;
export default enrollmentSlice.reducer;
