import React from 'react';
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import RoomPreferencesIcon from '@mui/icons-material/RoomPreferences';
import EventNoteIcon from '@mui/icons-material/EventNote';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import RuleIcon from '@mui/icons-material/Rule';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentIcon from '@mui/icons-material/Payment';
import WarningIcon from '@mui/icons-material/Warning';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useNavigate, useLocation } from 'react-router-dom';
import PaletteIcon from '@mui/icons-material/Palette';

const masterDataItems = [
  { label: 'Students', icon: <SchoolIcon />, path: '/principal/students' },
  { label: 'Teachers', icon: <PeopleIcon />, path: '/principal/teachers' },
  { label: 'Rooms', icon: <RoomPreferencesIcon />, path: '/principal/rooms' },
  { label: 'Courses', icon: <MenuBookIcon />, path: '/principal/courses' },
  { label: 'Classes', icon: <ClassIcon />, path: '/principal/classes' },
];

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/principal/dashboard' },
  { label: 'Enrollments', icon: <AssignmentIcon />, path: '/principal/enrollments' },
  { label: 'Timetable', icon: <ScheduleIcon />, path: '/principal/timetable' },
  { label: 'Room Availability', icon: <MeetingRoomIcon />, path: '/principal/room-availability' },
  { label: 'Attendance Report', icon: <EventNoteIcon />, path: '/principal/attendance' },
  { label: 'Teacher Attendance', icon: <HowToRegIcon />, path: '/principal/teacher-attendance' },
  { label: 'Attendance Corrections', icon: <RuleIcon />, path: '/principal/attendance-corrections' },
  { label: 'Revenue', icon: <AttachMoneyIcon />, path: '/principal/revenue' },
  { label: 'Payments', icon: <PaymentIcon />, path: '/principal/payments' },
  { label: 'Defaulters', icon: <WarningIcon />, path: '/principal/defaulters' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/principal/analytics' },
  { label: 'Audit Logs', icon: <SecurityIcon />, path: '/principal/audit-logs' },
  { label: 'User Management', icon: <ManageAccountsIcon />, path: '/principal/users' },
  { label: 'Announcements', icon: <CampaignIcon />, path: '/principal/announcements' },
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/principal/notifications' },
];

const PrincipalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isMasterDataActive = masterDataItems.some(i => location.pathname.startsWith(i.path));
  const [masterDataOpen, setMasterDataOpen] = React.useState(isMasterDataActive);

  React.useEffect(() => {
    if (isMasterDataActive) setMasterDataOpen(true);
  }, [isMasterDataActive]);

  const itemSx = {
    mx: 1,
    borderRadius: 2,
    mb: 0.5,
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: 'white',
      '& .MuiListItemIcon-root': { color: 'white' },
      '&:hover': { bgcolor: 'primary.dark' },
    },
  };

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
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            const button = (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={itemSx}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            );

            // Insert the Master Data group directly below Dashboard (first item)
            if (idx === 0) {
              return (
                <React.Fragment key="dashboard-and-master-data">
                  {button}
                  <ListItemButton
                    onClick={() => setMasterDataOpen(open => !open)}
                    sx={itemSx}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}><StorageIcon /></ListItemIcon>
                    <ListItemText primary="Master Data" primaryTypographyProps={{ fontSize: 14 }} />
                    {masterDataOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={masterDataOpen} timeout="auto" unmountOnExit>
                    <List dense disablePadding>
                      {masterDataItems.map(child => (
                        <ListItemButton
                          key={child.path}
                          selected={location.pathname === child.path}
                          onClick={() => navigate(child.path)}
                          sx={{ ...itemSx, pl: 4 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>{child.icon}</ListItemIcon>
                          <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            }

            return button;
          })}
        </List>
      </Box>
    </Box>
  );
};

export default PrincipalSidebar;
