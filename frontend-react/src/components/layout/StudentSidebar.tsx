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
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ScheduleIcon from '@mui/icons-material/Schedule';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate, useLocation } from 'react-router-dom';
import PaletteIcon from '@mui/icons-material/Palette';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/student/dashboard' },
  { label: 'My Profile', icon: <PersonIcon />, path: '/student/profile' },
  { label: 'Attendance', icon: <EventNoteIcon />, path: '/student/attendance' },
  { label: 'Schedule', icon: <ScheduleIcon />, path: '/student/schedule' },
  { label: 'Upcoming Classes', icon: <UpcomingIcon />, path: '/student/upcoming' },
  { label: 'Enrollments', icon: <AssignmentIcon />, path: '/student/enrollments' },
  { label: 'Fees', icon: <AttachMoneyIcon />, path: '/student/fees' },
  { label: 'Receipts', icon: <ReceiptIcon />, path: '/student/receipts' },
];

const StudentSidebar: React.FC = () => {
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

export default StudentSidebar;
