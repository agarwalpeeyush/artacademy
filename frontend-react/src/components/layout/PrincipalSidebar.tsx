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
import CategoryIcon from '@mui/icons-material/Category';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import EventNoteIcon from '@mui/icons-material/EventNote';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import PaletteIcon from '@mui/icons-material/Palette';

const masterDataItems = [
  { label: 'Course Types', icon: <CategoryIcon />, path: '/principal/course-types' },
];

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/principal/dashboard' },
  { label: 'Students', icon: <SchoolIcon />, path: '/principal/students' },
  { label: 'Teachers', icon: <PeopleIcon />, path: '/principal/teachers' },
  { label: 'Courses', icon: <MenuBookIcon />, path: '/principal/courses' },
  { label: 'Timetable', icon: <ScheduleIcon />, path: '/principal/timetable' },
  { label: 'Schedule View', icon: <CalendarViewWeekIcon />, path: '/principal/timetable-view' },
  { label: 'Enrollments', icon: <AssignmentIcon />, path: '/principal/enrollments' },
  { label: 'Mark Student Attendance', icon: <HowToRegIcon />, path: '/principal/mark-student-attendance' },
  { label: 'Student Fee Detail', icon: <PaymentIcon />, path: '/principal/student-fee-detail' },
  { label: 'Fee Bills', icon: <ReceiptLongIcon />, path: '/principal/fee-bills' },
  { label: 'Exam Fee', icon: <EventNoteIcon />, path: '/principal/exam-fee' },
  { label: 'Announcements', icon: <CampaignIcon />, path: '/principal/announcements' },
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/principal/notifications' },
];

// Admin-only screens (ROLE_PRINCIPAL). ADMIN-role users can enter the principal console
// to provision the first Principal (D8) but must not see these.
const adminItems = [
  { label: 'Revenue', icon: <AttachMoneyIcon />, path: '/principal/revenue' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/principal/analytics' },
  { label: 'Audit Logs', icon: <SecurityIcon />, path: '/principal/audit-logs' },
  { label: 'User Management', icon: <ManageAccountsIcon />, path: '/principal/users' },
];

const PrincipalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const roles = useSelector((state: RootState) => state.auth.roles);
  const isPrincipal = roles.includes('ROLE_PRINCIPAL');

  const isMasterDataActive = masterDataItems.some(i => location.pathname.startsWith(i.path));
  const [masterDataOpen, setMasterDataOpen] = React.useState(isMasterDataActive);

  const isAdminActive = adminItems.some(i => location.pathname.startsWith(i.path));
  const [adminOpen, setAdminOpen] = React.useState(isAdminActive);

  React.useEffect(() => {
    if (isMasterDataActive) setMasterDataOpen(true);
  }, [isMasterDataActive]);

  React.useEffect(() => {
    if (isAdminActive) setAdminOpen(true);
  }, [isAdminActive]);

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

  // The bootstrap admin can do exactly one thing — create the first Principal — so its console
  // shows only that single nav item.
  if (user?.bootstrap) {
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
            <ListItemButton
              selected={location.pathname === '/principal/create-principal'}
              onClick={() => navigate('/principal/create-principal')}
              sx={itemSx}
            >
              <ListItemIcon sx={{ minWidth: 36 }}><PersonAddIcon /></ListItemIcon>
              <ListItemText primary="Create Principal" primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          </List>
        </Box>
      </Box>
    );
  }

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

          {isPrincipal && (
            <>
              <ListItemButton
                onClick={() => setAdminOpen(open => !open)}
                sx={itemSx}
              >
                <ListItemIcon sx={{ minWidth: 36 }}><AdminPanelSettingsIcon /></ListItemIcon>
                <ListItemText primary="Admin" primaryTypographyProps={{ fontSize: 14 }} />
                {adminOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                <List dense disablePadding>
                  {adminItems.map(child => (
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
            </>
          )}
        </List>
      </Box>
    </Box>
  );
};

export default PrincipalSidebar;
