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
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NotificationsIcon from '@mui/icons-material/Notifications';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import { useNavigate, useLocation } from 'react-router-dom';
import PaletteIcon from '@mui/icons-material/Palette';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/parent/dashboard' },
  { label: 'My Children', icon: <FamilyRestroomIcon />, path: '/parent/children' },
  { label: 'Attendance', icon: <EventNoteIcon />, path: '/parent/attendance' },
  { label: 'Upcoming Classes', icon: <UpcomingIcon />, path: '/parent/upcoming' },
  { label: 'Fees', icon: <AttachMoneyIcon />, path: '/parent/fees' },
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/parent/notifications' },
];

const ParentSidebar: React.FC = () => {
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

export default ParentSidebar;
