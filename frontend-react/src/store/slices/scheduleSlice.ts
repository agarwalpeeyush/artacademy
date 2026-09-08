import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Schedule, ScheduleConflict, ScheduleVersion, RoomAvailability, UpcomingClass } from '../../types';
import scheduleService from '../../services/scheduleService';

interface ScheduleState {
  list: Schedule[];
  teacherSchedules: Schedule[];
  studentSchedules: Schedule[];
  conflicts: ScheduleConflict[];
  history: ScheduleVersion[];
  selectedVersion: ScheduleVersion | null;
  roomAvailability: RoomAvailability | null;
  upcoming: UpcomingClass[];
  loading: boolean;
  error: string | null;
}

const initialState: ScheduleState = {
  list: [],
  teacherSchedules: [],
  studentSchedules: [],
  conflicts: [],
  history: [],
  selectedVersion: null,
  roomAvailability: null,
  upcoming: [],
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

export const createSchedule = createAsyncThunk<Schedule, { classId: string; teacherId: string; roomId: string; startTime: string; endTime: string; dayOfWeek: string }>(
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

export const publishAllSchedules = createAsyncThunk<ScheduleVersion>(
  'schedules/publishAll',
  async (_, { rejectWithValue }) => {
    try {
      return await scheduleService.publishAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to publish schedules');
    }
  }
);

export const publishSchedule = createAsyncThunk<Schedule, string>(
  'schedules/publish',
  async (id, { rejectWithValue }) => {
    try {
      return await scheduleService.publish(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to publish schedule');
    }
  }
);

export const unpublishSchedule = createAsyncThunk<Schedule, string>(
  'schedules/unpublish',
  async (id, { rejectWithValue }) => {
    try {
      return await scheduleService.unpublish(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to unpublish schedule');
    }
  }
);

export const fetchConflicts = createAsyncThunk<ScheduleConflict[]>(
  'schedules/fetchConflicts',
  async (_, { rejectWithValue }) => {
    try {
      return await scheduleService.getConflicts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch conflicts');
    }
  }
);

export const fetchScheduleHistory = createAsyncThunk<ScheduleVersion[]>(
  'schedules/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      return await scheduleService.getHistory();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch history');
    }
  }
);

export const fetchHistoryVersion = createAsyncThunk<ScheduleVersion, string>(
  'schedules/fetchHistoryVersion',
  async (versionId, { rejectWithValue }) => {
    try {
      return await scheduleService.getHistoryVersion(versionId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch version');
    }
  }
);

export const fetchRoomAvailability = createAsyncThunk<RoomAvailability, { roomId: string; date: string }>(
  'schedules/fetchRoomAvailability',
  async ({ roomId, date }, { rejectWithValue }) => {
    try {
      return await scheduleService.getRoomAvailability(roomId, date);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch room availability');
    }
  }
);

export const fetchUpcomingClasses = createAsyncThunk<UpcomingClass[], { classIds: string[]; limit?: number }>(
  'schedules/fetchUpcoming',
  async ({ classIds, limit }, { rejectWithValue }) => {
    try {
      return await scheduleService.getUpcoming(classIds, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch upcoming classes');
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
      })
      .addCase(publishAllSchedules.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(publishAllSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.map(s => s.status === 'DRAFT' ? { ...s, status: 'PUBLISHED', publishedAt: action.payload.publishedAt } : s);
        state.history = [action.payload, ...state.history];
      })
      .addCase(publishAllSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(publishSchedule.fulfilled, (state, action) => {
        state.list = state.list.map(s => s.id === action.payload.id ? action.payload : s);
      })
      .addCase(unpublishSchedule.fulfilled, (state, action) => {
        state.list = state.list.map(s => s.id === action.payload.id ? action.payload : s);
      })
      .addCase(fetchConflicts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchConflicts.fulfilled, (state, action) => { state.loading = false; state.conflicts = action.payload; })
      .addCase(fetchConflicts.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchScheduleHistory.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchScheduleHistory.fulfilled, (state, action) => { state.loading = false; state.history = action.payload; })
      .addCase(fetchScheduleHistory.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchHistoryVersion.fulfilled, (state, action) => { state.selectedVersion = action.payload; })
      .addCase(fetchRoomAvailability.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRoomAvailability.fulfilled, (state, action) => { state.loading = false; state.roomAvailability = action.payload; })
      .addCase(fetchRoomAvailability.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchUpcomingClasses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUpcomingClasses.fulfilled, (state, action) => { state.loading = false; state.upcoming = action.payload; })
      .addCase(fetchUpcomingClasses.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearError } = scheduleSlice.actions;
export default scheduleSlice.reducer;
