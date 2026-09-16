import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Autocomplete, TextField, Grid, Typography, Paper, Button, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchScopedStudents, generateExamBills } from '../../store/slices/feeSlice';
import feeService from '../../services/feeService';
import teacherService from '../../services/teacherService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, feeTypeLabel } from '../../utils/formatters';
import { ScopedStudent, Teacher, FeeDetailLine } from '../../types';

interface CourseOption { courseId: string; courseName: string; }

interface CohortRow {
  student: ScopedStudent;
  examLine: FeeDetailLine | null;
}

const ExamFeePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { students } = useSelector((state: RootState) => state.fees);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [course, setCourse] = useState<CourseOption | null>(null);

  const [cohort, setCohort] = useState<CohortRow[]>([]);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchScopedStudents(undefined));
    teacherService.getAll().then(setTeachers).catch(() => setTeachers([]));
  }, [dispatch]);

  // Courses available for the chosen teacher, derived from the scoped student list.
  const courseOptions = useMemo<CourseOption[]>(() => {
    const scoped = teacher ? students.filter(s => s.teacherId === teacher.id) : students;
    const map = new Map<string, string>();
    scoped.forEach(s => {
      if (s.courseId) map.set(s.courseId, s.courseName ?? s.courseId);
    });
    return Array.from(map.entries()).map(([courseId, courseName]) => ({ courseId, courseName }));
  }, [students, teacher]);

  useEffect(() => { setCourse(null); }, [teacher]);

  const loadCohort = async (courseId: string) => {
    const roster = students.filter(s => s.courseId === courseId && (!teacher || s.teacherId === teacher.id));
    setLoadingCohort(true);
    setError(null);
    try {
      const rows = await Promise.all(roster.map(async (student) => {
        const lines = await feeService.getDetails(student.enrollmentId);
        const examLine = lines.find(l => l.feeType === 'EXAM') ?? null;
        return { student, examLine };
      }));
      setCohort(rows);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to load exam cohort');
      setCohort([]);
    } finally {
      setLoadingCohort(false);
    }
  };

  useEffect(() => {
    if (course) loadCohort(course.courseId);
    else setCohort([]);
  }, [course]);

  const withExam = cohort.filter(r => r.examLine);

  const generate = async () => {
    if (!course) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const bills = await dispatch(generateExamBills(course.courseId)).unwrap();
      setNotice(`${bills.length} exam bill(s) generated`);
      loadCohort(course.courseId);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to generate exam bills');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Exam Fee"
        subtitle="Batch-bill the exam fee for a course cohort"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Exam Fee' }]}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Autocomplete
            options={teachers}
            value={teacher}
            onChange={(_, v) => setTeacher(v)}
            getOptionLabel={(t) => `${t.firstName} ${t.lastName}`.trim() || t.employeeCode}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Teacher (optional)" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Autocomplete
            options={courseOptions}
            value={course}
            onChange={(_, v) => setCourse(v)}
            getOptionLabel={(o) => o.courseName}
            isOptionEqualToValue={(a, b) => a.courseId === b.courseId}
            renderInput={(params) => <TextField {...params} label="Course" size="small" />}
          />
        </Grid>
      </Grid>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}

      {!course ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a course to view its exam-fee cohort.</Typography>
        </Paper>
      ) : loadingCohort ? (
        <LoadingSpinner />
      ) : (
        <>
          <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<ReceiptLongIcon />}
              disabled={busy || withExam.length === 0}
              onClick={generate}
            >
              Generate Exam Fee Bill
            </Button>
            <Typography variant="body2" color="text.secondary">
              {withExam.length} student(s) with an exam fee line
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell align="right">Exam Fee</TableCell>
                  <TableCell>Institute Share</TableCell>
                  <TableCell align="center">Exam Line</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cohort.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">No students in this course.</TableCell></TableRow>
                ) : cohort.map(({ student, examLine }) => (
                  <TableRow key={student.enrollmentId} hover>
                    <TableCell>{student.studentName ?? student.studentId}</TableCell>
                    <TableCell>{student.courseName ?? '-'}</TableCell>
                    <TableCell align="right">{examLine ? formatCurrency(examLine.amount) : '-'}</TableCell>
                    <TableCell>
                      {examLine?.instituteShareType
                        ? (examLine.instituteShareType === 'PERCENTAGE'
                            ? `${examLine.instituteShareValue}%`
                            : formatCurrency(examLine.instituteShareValue ?? 0))
                        : 'No cut'}
                    </TableCell>
                    <TableCell align="center">
                      {examLine
                        ? <Chip label={feeTypeLabel('EXAM')} size="small" color="secondary" />
                        : <Chip label="None" size="small" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default ExamFeePage;
