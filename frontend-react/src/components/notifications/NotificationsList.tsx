import React, { useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Stack, IconButton,
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/slices/notificationSlice';
import PageHeader from '../common/PageHeader';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

const typeColorMap: Record<string, 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
  INFO: 'info', WARNING: 'warning', SUCCESS: 'success', ERROR: 'error', ANNOUNCEMENT: 'primary',
};

interface NotificationsListProps {
  roleLabel: string;
}

const NotificationsList: React.FC<NotificationsListProps> = ({ roleLabel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { list, unreadCount, loading } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    if (user?.id) dispatch(fetchNotifications(user.id));
  }, [dispatch, user]);

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
        breadcrumbs={[{ label: roleLabel }, { label: 'Notifications' }]}
        action={unreadCount > 0 && user?.id ? (
          <Button variant="outlined" size="small" onClick={() => dispatch(markAllAsRead(user.id))}>
            Mark all as read
          </Button>
        ) : undefined}
      />

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary">No notifications.</Typography></CardContent></Card>
      ) : (
        <Stack spacing={1.5}>
          {list.map(n => (
            <Card key={n.id} variant="outlined" sx={{ bgcolor: n.isRead ? 'background.paper' : 'action.hover' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip label={n.type} color={typeColorMap[n.type] || 'info'} size="small" />
                      <Typography variant="subtitle2" fontWeight={600}>{n.title}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(n.createdAt)}</Typography>
                  </Box>
                  {!n.isRead && (
                    <IconButton size="small" title="Mark as read" onClick={() => dispatch(markAsRead(n.id))}>
                      <DoneIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default NotificationsList;
