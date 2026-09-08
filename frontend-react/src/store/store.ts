import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import teacherReducer from './slices/teacherSlice';
import studentReducer from './slices/studentSlice';
import courseReducer from './slices/courseSlice';
import enrollmentReducer from './slices/enrollmentSlice';
import attendanceReducer from './slices/attendanceSlice';
import correctionReducer from './slices/correctionSlice';
import scheduleReducer from './slices/scheduleSlice';
import feeReducer from './slices/feeSlice';
import paymentReducer from './slices/paymentSlice';
import reportReducer from './slices/reportSlice';
import notificationReducer from './slices/notificationSlice';
import parentReducer from './slices/parentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    teachers: teacherReducer,
    students: studentReducer,
    courses: courseReducer,
    enrollments: enrollmentReducer,
    attendance: attendanceReducer,
    corrections: correctionReducer,
    schedules: scheduleReducer,
    fees: feeReducer,
    payments: paymentReducer,
    reports: reportReducer,
    notifications: notificationReducer,
    parents: parentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
