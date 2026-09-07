import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Schedule } from '../../types';
import scheduleService from '../../services/scheduleService';

interface ScheduleState {
  list: Schedule[];
  teacherSchedules: Schedule[];
  studentSchedules: Schedule[];
  loading: boolean;
  error: string | null;
}

const initialState: ScheduleState = {
  list: [],
  teacherSchedules: [],
  studentSchedules: [],
  loading: false,
  error: null,
};

export const fetchSchedules = createAsyncThunk<Schedule[]>(
  'schedules/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await scheduleService.getAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedules');
    }
  }
);

export const fetchTeacherSchedules = createAsyncThunk<Schedule[], string>(
  'schedules/fetchByTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      return await scheduleService.getByTeacher(teacherId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedules');
    }
  }
);

export const fetchStudentSchedules = createAsyncThunk<Schedule[], string>(
  'schedules/fetchByStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      return await scheduleService.getByStudent(studentId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedules');
    }
  }
);

export const createSchedule = createAsyncThunk<Schedule, Omit<Schedule, 'id'>>(
  'schedules/create',
  async (data, { rejectWithValue }) => {
    try {
      return await scheduleService.create(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to create schedule');
    }
  }
);

export const deleteSchedule = createAsyncThunk<string, string>(
  'schedules/delete',
  async (id, { rejectWithValue }) => {
    try {
      await scheduleService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete schedule');
    }
  }
);

const scheduleSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSchedules.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchTeacherSchedules.fulfilled, (state, action) => { state.teacherSchedules = action.payload; })
      .addCase(fetchStudentSchedules.fulfilled, (state, action) => { state.studentSchedules = action.payload; })
      .addCase(createSchedule.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.list = state.list.filter(s => s.id !== action.payload);
      });
  },
});

export const { clearError } = scheduleSlice.actions;
export default scheduleSlice.reducer;
