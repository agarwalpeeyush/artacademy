import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Parent } from '../../types';
import parentService from '../../services/parentService';

interface ParentState {
  children: Parent[];
  profile: Parent | null;
  loading: boolean;
  error: string | null;
}

const initialState: ParentState = {
  children: [],
  profile: null,
  loading: false,
  error: null,
};

export const fetchMyChildren = createAsyncThunk<Parent[]>(
  'parents/fetchMyChildren',
  async (_, { rejectWithValue }) => {
    try {
      return await parentService.getMyChildren();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch children');
    }
  }
);

export const fetchMyProfile = createAsyncThunk<Parent>(
  'parents/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await parentService.getMyProfile();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

const parentSlice = createSlice({
  name: 'parents',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyChildren.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMyChildren.fulfilled, (state, action) => { state.loading = false; state.children = action.payload; })
      .addCase(fetchMyChildren.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchMyProfile.fulfilled, (state, action) => { state.profile = action.payload; });
  },
});

export const { clearError } = parentSlice.actions;
export default parentSlice.reducer;
