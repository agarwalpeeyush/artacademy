import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { StudentAttendance, TeacherAttendance } from '../../types';
import attendanceService from '../../services/attendanceService';

interface AttendanceState {
  studentAttendance: StudentAttendance[];
  teacherAttendance: TeacherAttendance[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  studentAttendance: [],
  teacherAttendance: [],
  loading: false,
  error: null,
};

export const fetchStudentAttendance = createAsyncThunk<
  StudentAttendance[],
  { studentId?: string; classId?: string; startDate?: string; endDate?: string }
>('attendance/fetchStudent', async (params, { rejectWithValue }) => {
  try {
    return await attendanceService.getStudentAttendance(params);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance');
  }
});

export const markStudentAttendance = createAsyncThunk<
  StudentAttendance[],
  StudentAttendance[]
>('attendance/markStudent', async (data, { rejectWithValue }) => {
  try {
    return await attendanceService.markStudentAttendance(data);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || 'Failed to mark attendance');
  }
});

export const fetchTeacherAttendance = createAsyncThunk<
  TeacherAttendance[],
  { teacherId?: string; startDate?: string; endDate?: string }
>('attendance/fetchTeacher', async (params, { rejectWithValue }) => {
  try {
    return await attendanceService.getTeacherAttendance(params);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch teacher attendance');
  }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudentAttendance.fulfilled, (state, action) => { state.loading = false; state.studentAttendance = action.payload; })
      .addCase(fetchStudentAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(markStudentAttendance.fulfilled, (state, action) => {
        action.payload.forEach(newRecord => {
          const idx = state.studentAttendance.findIndex(
            a => a.studentId === newRecord.studentId && a.date === newRecord.date && a.timetableId === newRecord.timetableId
          );
          if (idx !== -1) state.studentAttendance[idx] = newRecord;
          else state.studentAttendance.push(newRecord);
        });
      })
      .addCase(fetchTeacherAttendance.fulfilled, (state, action) => { state.teacherAttendance = action.payload; });
  },
});

export const { clearError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
