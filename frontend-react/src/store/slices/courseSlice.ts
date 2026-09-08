import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Course } from '../../types';
import courseService from '../../services/courseService';

interface CourseState {
  list: Course[];
  selected: Course | null;
  loading: boolean;
  error: string | null;
}

const initialState: CourseState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetchCourses = createAsyncThunk<Course[]>(
  'courses/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await courseService.getAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch courses');
    }
  }
);

export const fetchCourseById = createAsyncThunk<Course, string>(
  'courses/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await courseService.getById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch course');
    }
  }
);

export const createCourse = createAsyncThunk<Course, Omit<Course, 'id'>>(
  'courses/create',
  async (data, { rejectWithValue }) => {
    try {
      return await courseService.create(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to create course');
    }
  }
);

export const updateCourse = createAsyncThunk<Course, { id: string; data: Partial<Course> }>(
  'courses/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await courseService.update(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to update course');
    }
  }
);

export const deleteCourse = createAsyncThunk<string, string>(
  'courses/delete',
  async (id, { rejectWithValue }) => {
    try {
      await courseService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete course');
    }
  }
);

const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCourses.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchCourses.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchCourseById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCourseById.fulfilled, (state, action) => { state.loading = false; state.selected = action.payload; })
      .addCase(fetchCourseById.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createCourse.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(updateCourse.fulfilled, (state, action) => {
        const idx = state.list.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
      });
  },
});

export const { clearError } = courseSlice.actions;
export default courseSlice.reducer;
