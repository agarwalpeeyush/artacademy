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
import EventNoteIcon from '@mui/icons-material/EventNote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useNavigate, useLocation } from 'react-router-dom';
import PaletteIcon from '@mui/icons-material/Palette';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/teacher/dashboard' },
  { label: 'Mark Attendance', icon: <EventNoteIcon />, path: '/teacher/attendance' },
  { label: 'My Attendance', icon: <EventAvailableIcon />, path: '/teacher/my-attendance' },
  { label: 'Corrections', icon: <EditNoteIcon />, path: '/teacher/corrections' },
  { label: 'Enrollments', icon: <AssignmentIcon />, path: '/teacher/enrollments' },
  { label: 'My Students', icon: <PeopleIcon />, path: '/teacher/students' },
  { label: 'Fee Status', icon: <AttachMoneyIcon />, path: '/teacher/fee-status' },
  { label: 'Schedule', icon: <ScheduleIcon />, path: '/teacher/schedule' },
  { label: 'Availability Exceptions', icon: <EventBusyIcon />, path: '/teacher/availability-exceptions' },
];

const TeacherSidebar: React.FC = () => {
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

export default TeacherSidebar;
