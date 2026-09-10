import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Notification } from '../../types';
import notificationService from '../../services/notificationService';

interface NotificationState {
  list: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  list: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const errMsg = (error: unknown, fallback: string): string => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || fallback;
};

export const fetchNotifications = createAsyncThunk<Notification[], string>(
  'notifications/fetchAll',
  async (userId, { rejectWithValue }) => {
    try {
      return await notificationService.getByUserId(userId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch notifications'));
    }
  }
);

export const fetchUnreadCount = createAsyncThunk<number, string>(
  'notifications/unreadCount',
  async (userId, { rejectWithValue }) => {
    try {
      return await notificationService.getUnreadCount(userId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to fetch unread count'));
    }
  }
);

export const markAsRead = createAsyncThunk<string, string>(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to mark notification as read'));
    }
  }
);

export const markAllAsRead = createAsyncThunk<void, string>(
  'notifications/markAllRead',
  async (userId, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead(userId);
    } catch (error: unknown) {
      return rejectWithValue(errMsg(error, 'Failed to mark all as read'));
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action) {
      state.list.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount += 1;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.unreadCount = action.payload.filter(n => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.list.find(n => n.id === action.payload);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.list.forEach(n => { n.isRead = true; });
        state.unreadCount = 0;
      });
  },
});

export const { addNotification, clearError } = notificationSlice.actions;
export default notificationSlice.reducer;
