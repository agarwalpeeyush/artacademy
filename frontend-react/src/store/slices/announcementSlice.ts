import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Announcement, TeacherBroadcastPermission } from '../../types';
import announcementService, { BroadcastRequest } from '../../services/announcementService';

interface AnnouncementState {
  list: Announcement[];
  permissions: TeacherBroadcastPermission[];
  loading: boolean;
  error: string | null;
}

const initialState: AnnouncementState = {
  list: [],
  permissions: [],
  loading: false,
  error: null,
};

const errMsg = (error: unknown, fallback: string): string => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || fallback;
};

export const broadcastAnnouncement = createAsyncThunk<Announcement, BroadcastRequest>(
  'announcements/broadcast',
  async (req, { rejectWithValue }) => {
    try {
      return await announcementService.broadcast(req);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to send announcement'));
    }
  }
);

export const fetchAnnouncements = createAsyncThunk<Announcement[], void>(
  'announcements/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await announcementService.list();
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch announcements'));
    }
  }
);

export const fetchPermissions = createAsyncThunk<TeacherBroadcastPermission[], void>(
  'announcements/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      return await announcementService.getPermissions();
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch permissions'));
    }
  }
);

export const setPermission = createAsyncThunk<TeacherBroadcastPermission, { teacherId: string; canBroadcast: boolean }>(
  'announcements/setPermission',
  async ({ teacherId, canBroadcast }, { rejectWithValue }) => {
    try {
      return await announcementService.setPermission(teacherId, canBroadcast);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to update permission'));
    }
  }
);

const announcementSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(broadcastAnnouncement.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(broadcastAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
      })
      .addCase(broadcastAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.permissions = action.payload;
      })
      .addCase(setPermission.fulfilled, (state, action) => {
        const idx = state.permissions.findIndex(p => p.teacherId === action.payload.teacherId);
        if (idx >= 0) state.permissions[idx] = action.payload;
        else state.permissions.push(action.payload);
      });
  },
});

export const { clearError } = announcementSlice.actions;
export default announcementSlice.reducer;
