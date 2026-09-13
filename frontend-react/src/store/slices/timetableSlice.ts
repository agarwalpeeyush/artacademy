import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Timetable, TimetableConflict, UpcomingClass } from '../../types';
import timetableService from '../../services/timetableService';

interface TimetableState {
  list: Timetable[];
  teacherTimetables: Timetable[];
  studentTimetables: Timetable[];
  conflicts: TimetableConflict[];
  upcoming: UpcomingClass[];
  loading: boolean;
  error: string | null;
}

const initialState: TimetableState = {
  list: [],
  teacherTimetables: [],
  studentTimetables: [],
  conflicts: [],
  upcoming: [],
  loading: false,
  error: null,
};

export const fetchTimetables = createAsyncThunk<Timetable[]>(
  'timetables/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await timetableService.getAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch timetables');
    }
  }
);

export const fetchTeacherTimetables = createAsyncThunk<Timetable[], string>(
  'timetables/fetchByTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      return await timetableService.getByTeacher(teacherId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch timetables');
    }
  }
);

export const fetchStudentTimetables = createAsyncThunk<Timetable[], string>(
  'timetables/fetchByStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      return await timetableService.getByStudent(studentId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch timetables');
    }
  }
);

export const createTimetable = createAsyncThunk<Timetable, { classId: string; teacherId: string; roomId: string; startTime: string; endTime: string; dayOfWeek: string }>(
  'timetables/create',
  async (data, { rejectWithValue }) => {
    try {
      return await timetableService.create(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to create timetable');
    }
  }
);

export const deleteTimetable = createAsyncThunk<string, string>(
  'timetables/delete',
  async (id, { rejectWithValue }) => {
    try {
      await timetableService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete timetable');
    }
  }
);

export const fetchConflicts = createAsyncThunk<TimetableConflict[]>(
  'timetables/fetchConflicts',
  async (_, { rejectWithValue }) => {
    try {
      return await timetableService.getConflicts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch conflicts');
    }
  }
);

export const fetchUpcomingClasses = createAsyncThunk<UpcomingClass[], { classIds: string[]; limit?: number }>(
  'timetables/fetchUpcoming',
  async ({ classIds, limit }, { rejectWithValue }) => {
    try {
      return await timetableService.getUpcoming(classIds, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch upcoming classes');
    }
  }
);

const timetableSlice = createSlice({
  name: 'timetables',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimetables.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTimetables.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchTimetables.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchTeacherTimetables.fulfilled, (state, action) => { state.teacherTimetables = action.payload; })
      .addCase(fetchStudentTimetables.fulfilled, (state, action) => { state.studentTimetables = action.payload; })
      .addCase(createTimetable.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(deleteTimetable.fulfilled, (state, action) => {
        state.list = state.list.filter(s => s.id !== action.payload);
      })
      .addCase(fetchConflicts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchConflicts.fulfilled, (state, action) => { state.loading = false; state.conflicts = action.payload; })
      .addCase(fetchConflicts.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchUpcomingClasses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUpcomingClasses.fulfilled, (state, action) => { state.loading = false; state.upcoming = action.payload; })
      .addCase(fetchUpcomingClasses.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearError } = timetableSlice.actions;
export default timetableSlice.reducer;
