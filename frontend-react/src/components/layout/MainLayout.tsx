import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  Drawer,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { logoutThunk } from '../../store/slices/authSlice';
import { fetchNotifications, fetchUnreadCount, markAsRead } from '../../store/slices/notificationSlice';
import { formatDate } from '../../utils/formatters';

const DRAWER_WIDTH = 240;

interface MainLayoutProps {
  sidebar: React.ReactNode;
  title: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { unreadCount, list } = useSelector((state: RootState) => state.notifications);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await dispatch(logoutThunk());
    navigate('/login');
  };

  const roleBase = (() => {
    const roles = user?.roles ?? [];
    if (roles.includes('ROLE_PRINCIPAL')) return '/principal';
    if (roles.includes('ROLE_TEACHER')) return '/teacher';
    if (roles.includes('ROLE_STUDENT')) return '/student';
    if (roles.includes('ROLE_PARENT')) return '/parent';
    return null;
  })();

  const profilePath = roleBase ? `${roleBase}/profile` : null;
  const notificationsPath = roleBase ? `${roleBase}/notifications` : null;

  // Poll unread count on mount and every 60s.
  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchUnreadCount(user.id));
    const interval = setInterval(() => dispatch(fetchUnreadCount(user.id)), 60000);
    return () => clearInterval(interval);
  }, [dispatch, user]);

  const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
    if (user?.id) dispatch(fetchNotifications(user.id));
  };

  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleNotifClick = (id: string, isRead: boolean) => {
    if (!isRead) dispatch(markAsRead(id));
    handleNotifClose();
    if (notificationsPath) navigate(notificationsPath);
  };

  const handleViewAll = () => {
    handleNotifClose();
    if (notificationsPath) navigate(notificationsPath);
  };

  const handleProfile = () => {
    handleMenuClose();
    if (profilePath) navigate(profilePath);
  };

  const drawerContent = <Box sx={{ width: DRAWER_WIDTH }}>{sidebar}</Box>;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: theme.zIndex.drawer + 1, backgroundColor: 'primary.main' }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
            {title}
          </Typography>
          <IconButton color="inherit" sx={{ mr: 1 }} onClick={handleNotifOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Popover
            anchorEl={notifAnchorEl}
            open={Boolean(notifAnchorEl)}
            onClose={handleNotifClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { sx: { width: 340, maxWidth: '90vw' } } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
            </Box>
            <Divider />
            {list.length === 0 ? (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No notifications</Typography>
              </Box>
            ) : (
              <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
                {list.slice(0, 6).map(n => (
                  <ListItemButton
                    key={n.id}
                    onClick={() => handleNotifClick(n.id, n.isRead)}
                    sx={{ bgcolor: n.isRead ? 'inherit' : 'action.hover', alignItems: 'flex-start' }}
                  >
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: '50%', mt: 0.9, mr: 1,
                        bgcolor: n.isRead ? 'transparent' : 'error.main', flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={n.title}
                      secondary={
                        <>
                          <Typography variant="caption" component="span" display="block" noWrap color="text.secondary">
                            {n.message}
                          </Typography>
                          <Typography variant="caption" component="span" color="text.disabled">
                            {formatDate(n.createdAt)}
                          </Typography>
                        </>
                      }
                      primaryTypographyProps={{ variant: 'body2', fontWeight: n.isRead ? 400 : 600, noWrap: true }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
            <Divider />
            <MenuItem onClick={handleViewAll} sx={{ justifyContent: 'center', py: 1 }}>
              <Typography variant="body2" color="primary.main">View all</Typography>
            </MenuItem>
          </Popover>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
              {user?.username?.[0]?.toUpperCase() || <AccountCircleIcon />}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="subtitle2">{user?.username}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            {profilePath && (
              <MenuItem onClick={handleProfile}>
                <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                My Profile
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav">
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: 'background.default',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
