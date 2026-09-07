import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Teacher } from '../../types';
import teacherService from '../../services/teacherService';

interface TeacherState {
  list: Teacher[];
  selected: Teacher | null;
  loading: boolean;
  error: string | null;
}

const initialState: TeacherState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetchTeachers = createAsyncThunk<Teacher[]>(
  'teachers/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await teacherService.getAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch teachers');
    }
  }
);

export const createTeacher = createAsyncThunk<Teacher, Omit<Teacher, 'id'>>(
  'teachers/create',
  async (data, { rejectWithValue }) => {
    try {
      return await teacherService.create(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to create teacher');
    }
  }
);

export const updateTeacher = createAsyncThunk<Teacher, { id: string; data: Partial<Teacher> }>(
  'teachers/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await teacherService.update(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to update teacher');
    }
  }
);

export const deleteTeacher = createAsyncThunk<string, string>(
  'teachers/delete',
  async (id, { rejectWithValue }) => {
    try {
      await teacherService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete teacher');
    }
  }
);

const teacherSlice = createSlice({
  name: 'teachers',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setSelected(state, action) {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeachers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeachers.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchTeachers.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createTeacher.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(updateTeacher.fulfilled, (state, action) => {
        const idx = state.list.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(deleteTeacher.fulfilled, (state, action) => {
        state.list = state.list.filter(t => t.id !== action.payload);
      });
  },
});

export const { clearError, setSelected } = teacherSlice.actions;
export default teacherSlice.reducer;
