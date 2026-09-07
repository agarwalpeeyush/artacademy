import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Student } from '../../types';
import studentService from '../../services/studentService';

interface StudentState {
  list: Student[];
  selected: Student | null;
  loading: boolean;
  error: string | null;
}

const initialState: StudentState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetchStudents = createAsyncThunk<Student[]>(
  'students/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await studentService.getAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch students');
    }
  }
);

export const fetchStudentById = createAsyncThunk<Student, string>(
  'students/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await studentService.getById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch student');
    }
  }
);

export const createStudent = createAsyncThunk<Student, Omit<Student, 'id'>>(
  'students/create',
  async (data, { rejectWithValue }) => {
    try {
      return await studentService.create(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to create student');
    }
  }
);

export const updateStudent = createAsyncThunk<Student, { id: string; data: Partial<Student> }>(
  'students/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await studentService.update(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to update student');
    }
  }
);

export const deleteStudent = createAsyncThunk<string, string>(
  'students/delete',
  async (id, { rejectWithValue }) => {
    try {
      await studentService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete student');
    }
  }
);

const studentSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    setSelected(state, action) { state.selected = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudents.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchStudents.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchStudentById.fulfilled, (state, action) => { state.selected = action.payload; })
      .addCase(createStudent.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(updateStudent.fulfilled, (state, action) => {
        const idx = state.list.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.selected?.id === action.payload.id) state.selected = action.payload;
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.list = state.list.filter(s => s.id !== action.payload);
      });
  },
});

export const { clearError, setSelected } = studentSlice.actions;
export default studentSlice.reducer;
