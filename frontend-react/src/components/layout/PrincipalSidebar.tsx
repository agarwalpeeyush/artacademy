import React from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import RoomPreferencesIcon from '@mui/icons-material/RoomPreferences';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PublishIcon from '@mui/icons-material/Publish';
import HistoryIcon from '@mui/icons-material/History';
import EventNoteIcon from '@mui/icons-material/EventNote';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import RuleIcon from '@mui/icons-material/Rule';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningIcon from '@mui/icons-material/Warning';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { useNavigate, useLocation } from 'react-router-dom';
import PaletteIcon from '@mui/icons-material/Palette';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/principal/dashboard' },
  { label: 'Teachers', icon: <PeopleIcon />, path: '/principal/teachers' },
  { label: 'Students', icon: <SchoolIcon />, path: '/principal/students' },
  { label: 'Courses', icon: <MenuBookIcon />, path: '/principal/courses' },
  { label: 'Classes', icon: <ClassIcon />, path: '/principal/classes' },
  { label: 'Rooms', icon: <RoomPreferencesIcon />, path: '/principal/rooms' },
  { label: 'Enrollments', icon: <AssignmentIcon />, path: '/principal/enrollments' },
  { label: 'Timetable', icon: <ScheduleIcon />, path: '/principal/timetable' },
  { label: 'Room Availability', icon: <MeetingRoomIcon />, path: '/principal/room-availability' },
  { label: 'Conflicts', icon: <ReportProblemIcon />, path: '/principal/conflicts' },
  { label: 'Publish Schedule', icon: <PublishIcon />, path: '/principal/schedule-publish' },
  { label: 'Schedule History', icon: <HistoryIcon />, path: '/principal/schedule-history' },
  { label: 'Attendance', icon: <EventNoteIcon />, path: '/principal/attendance' },
  { label: 'Teacher Attendance', icon: <HowToRegIcon />, path: '/principal/teacher-attendance' },
  { label: 'Attendance Corrections', icon: <RuleIcon />, path: '/principal/attendance-corrections' },
  { label: 'Revenue', icon: <AttachMoneyIcon />, path: '/principal/revenue' },
  { label: 'Defaulters', icon: <WarningIcon />, path: '/principal/defaulters' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/principal/analytics' },
  { label: 'Audit Logs', icon: <SecurityIcon />, path: '/principal/audit-logs' },
  { label: 'User Management', icon: <ManageAccountsIcon />, path: '/principal/users' },
];

const PrincipalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar>
        <PaletteIcon sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" fontWeight={700} color="primary.main" noWrap>
          Art Academy
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto', mt: 1 }}>
        <List dense>
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default PrincipalSidebar;
