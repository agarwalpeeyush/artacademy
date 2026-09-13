import React, { useEffect } from 'react';
import { Box, Chip } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherAttendance } from '../../store/slices/attendanceSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { format, subMonths } from 'date-fns';

type TeacherStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

const statusColors: Record<TeacherStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', HALF_DAY: 'warning', LEAVE: 'default',
};

const MyAttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherAttendance } = useSelector((state: RootState) => state.attendance);

  useEffect(() => {
    if (user?.id) {
      const startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      dispatch(fetchTeacherAttendance({ teacherId: user.id, startDate, endDate }));
    }
  }, [dispatch, user]);

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'date', label: 'Date', minWidth: 120 },
    {
      id: 'status', label: 'Status', minWidth: 120,
      format: (v) => <Chip label={String(v)} color={statusColors[v as TeacherStatus] ?? 'default'} size="small" />,
    },
    { id: 'remarks', label: 'Remarks', minWidth: 200 },
  ];

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="Review your attendance for the last 3 months"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'My Attendance' }]}
      />

      <DataTable
        columns={columns}
        rows={teacherAttendance as unknown as Record<string, unknown>[]}
        searchable={false}
      />
    </Box>
  );
};

export default MyAttendancePage;
