import React, { useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PageHeader from '../../components/common/PageHeader';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import reportService from '../../services/reportService';
import { DashboardStats } from '../../types';
import { formatCurrency } from '../../utils/formatters';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <Card>
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await reportService.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const displayStats: DashboardStats = stats || {
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalClasses: 0,
    revenueThisMonth: 0,
    pendingFeesThisMonth: 0,
    activeEnrollments: 0,
    todayAttendance: 0,
  };

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to Art Academy Management Platform"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Dashboard' }]}
      />

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error} — showing placeholder data.</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Total Students"
            value={displayStats.totalStudents}
            icon={<SchoolIcon fontSize="large" />}
            color="#1565C0"
            subtitle="Active enrollments"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Total Teachers"
            value={displayStats.totalTeachers}
            icon={<PeopleIcon fontSize="large" />}
            color="#2E7D32"
            subtitle="On staff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Courses"
            value={displayStats.totalCourses}
            icon={<MenuBookIcon fontSize="large" />}
            color="#F57C00"
            subtitle="Active courses"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Classes"
            value={displayStats.totalClasses}
            icon={<ClassIcon fontSize="large" />}
            color="#7B1FA2"
            subtitle="Active classes"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Active Enrollments"
            value={displayStats.activeEnrollments}
            icon={<AssignmentIcon fontSize="large" />}
            color="#00838F"
            subtitle="Course enrollments"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Revenue This Month"
            value={formatCurrency(displayStats.revenueThisMonth)}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#1B5E20"
            subtitle="Collected amount"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Pending Fees"
            value={formatCurrency(displayStats.pendingFeesThisMonth)}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#B71C1C"
            subtitle="Outstanding this month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Today's Attendance"
            value={`${displayStats.todayAttendance ?? 0}%`}
            icon={<SchoolIcon fontSize="large" />}
            color="#1565C0"
            subtitle="Student attendance rate"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
