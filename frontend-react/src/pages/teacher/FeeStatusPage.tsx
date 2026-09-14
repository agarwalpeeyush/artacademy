import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, MenuItem, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { fetchFeeCycles } from '../../store/slices/feeSlice';
import studentService from '../../services/studentService';
import { Student, FeeCycle } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatMonthYear, cycleKindLabel, cycleKindColor } from '../../utils/formatters';

const FeeStatusPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const { feeCycles } = useSelector((state: RootState) => state.fees);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherTimetables(user.id));
  }, [dispatch, user]);

  useEffect(() => {
    if (selectedCourseId) {
      setLoading(true);
      studentService.getByCourse(selectedCourseId)
        .then(data => {
          setStudents(data);
          data.forEach(s => dispatch(fetchFeeCycles({ studentId: s.id, month: currentMonth, year: currentYear })));
        })
        .catch(() => setStudents([]))
        .finally(() => setLoading(false));
    }
  }, [selectedCourseId, dispatch, currentMonth, currentYear]);

  const getStudentFeeStatus = (studentId: string): FeeCycle | undefined => {
    return feeCycles.find(f => f.studentId === studentId && f.month === currentMonth && f.year === currentYear);
  };

  const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', PENDING: 'default',
  };

  const uniqueCourses = [...new Map(teacherTimetables.map(s => [s.courseId, s])).values()];

  return (
    <Box>
      <PageHeader
        title="Fee Status"
        subtitle={`Student fee status for ${formatMonthYear(currentMonth, currentYear)}`}
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Fee Status' }]}
      />

      <Box mb={3}>
        <TextField
          select label="Select Course" size="small" sx={{ minWidth: 300 }}
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
        >
          <MenuItem value="">-- Select a course --</MenuItem>
          {uniqueCourses.map(s => (
            <MenuItem key={s.courseId} value={s.courseId}>{s.courseName}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : selectedCourseId && students.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Due</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map(student => {
                const fee = getStudentFeeStatus(student.id);
                return (
                  <TableRow key={student.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{student.firstName} {student.lastName}</TableCell>
                    <TableCell align="right">{fee ? formatCurrency(fee.totalAmount) : '-'}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{fee ? formatCurrency(fee.paidAmount) : '-'}</TableCell>
                    <TableCell align="right" sx={{ color: fee && (fee.dueAmount ?? 0) > 0 ? 'error.main' : 'inherit' }}>
                      {fee ? formatCurrency(fee.dueAmount ?? 0) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      {fee ? (
                        <>
                          <Chip label={fee.status} color={statusColorMap[fee.status] || 'default'} size="small" />
                          {fee.cycleKind && fee.cycleKind !== 'MONTHLY' && (
                            <Chip label={cycleKindLabel(fee.cycleKind)} color={cycleKindColor(fee.cycleKind)} size="small" variant="outlined" sx={{ ml: 1 }} />
                          )}
                        </>
                      ) : (
                        <Chip label="No Data" color="default" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : selectedCourseId ? (
        <Typography color="text.secondary">No students found in this course.</Typography>
      ) : null}
    </Box>
  );
};

export default FeeStatusPage;
