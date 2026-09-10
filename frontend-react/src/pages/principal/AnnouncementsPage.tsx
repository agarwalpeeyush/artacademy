import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, MenuItem, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Switch, Alert, Divider,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  broadcastAnnouncement, fetchAnnouncements, fetchPermissions, setPermission,
} from '../../store/slices/announcementSlice';
import studentService from '../../services/studentService';
import teacherService from '../../services/teacherService';
import { Teacher } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../utils/formatters';

const AUDIENCES = [
  { value: 'ALL_STUDENTS', label: 'All Students' },
  { value: 'ALL_TEACHERS', label: 'All Teachers' },
] as const;

const PrincipalAnnouncementsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { list, permissions, loading, error } = useSelector((state: RootState) => state.announcements);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'ALL_STUDENTS' | 'ALL_TEACHERS'>('ALL_STUDENTS');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAnnouncements());
    dispatch(fetchPermissions());
    teacherService.getAll().then(setTeachers).catch(() => setTeachers([]));
  }, [dispatch]);

  const permissionFor = (teacherId: string): boolean =>
    permissions.find(p => p.teacherId === teacherId)?.canBroadcast ?? false;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      const recipientUserIds = audience === 'ALL_STUDENTS'
        ? (await studentService.getAll()).map(s => s.id)
        : (await teacherService.getAll()).map(t => t.id);

      if (recipientUserIds.length === 0) {
        setFeedback('No recipients found for the selected audience.');
        return;
      }

      await dispatch(broadcastAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience,
        senderUserId: user?.id,
        senderRole: 'ROLE_PRINCIPAL',
        recipientUserIds,
      })).unwrap();

      setFeedback(`Announcement sent to ${recipientUserIds.length} recipient(s).`);
      setTitle('');
      setBody('');
    } catch {
      setFeedback(null);
    } finally {
      setSending(false);
    }
  };

  const handleTogglePermission = (teacherId: string, next: boolean) => {
    dispatch(setPermission({ teacherId, canBroadcast: next }));
  };

  return (
    <Box>
      <PageHeader
        title="Announcements"
        subtitle="Broadcast to students or teachers and manage teacher broadcast permissions"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Administration' }, { label: 'Announcements' }]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Compose Announcement</Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {feedback && <Alert severity="info" sx={{ mb: 2 }}>{feedback}</Alert>}
              <TextField
                label="Title" fullWidth size="small" sx={{ mb: 2 }}
                value={title} onChange={e => setTitle(e.target.value)}
              />
              <TextField
                label="Message" fullWidth size="small" multiline minRows={4} sx={{ mb: 2 }}
                value={body} onChange={e => setBody(e.target.value)}
              />
              <TextField
                select label="Audience" fullWidth size="small" sx={{ mb: 2 }}
                value={audience} onChange={e => setAudience(e.target.value as 'ALL_STUDENTS' | 'ALL_TEACHERS')}
              >
                {AUDIENCES.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
              </TextField>
              <Button
                variant="contained" fullWidth
                disabled={sending || loading || !title.trim() || !body.trim()}
                onClick={handleSend}
              >
                {sending ? 'Sending…' : 'Send Announcement'}
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Teacher Broadcast Permissions</Typography>
              <Divider sx={{ mb: 1 }} />
              {teachers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No teachers found.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Teacher</TableCell>
                        <TableCell align="center">Can Broadcast</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teachers.map(t => (
                        <TableRow key={t.id} hover>
                          <TableCell>{t.firstName} {t.lastName}</TableCell>
                          <TableCell align="center">
                            <Switch
                              checked={permissionFor(t.id)}
                              onChange={(_, checked) => handleTogglePermission(t.id, checked)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>History</Typography>
              {list.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No announcements sent yet.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Audience</TableCell>
                        <TableCell align="right">Recipients</TableCell>
                        <TableCell>Sent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {list.map(a => (
                        <TableRow key={a.id} hover>
                          <TableCell>{a.title}</TableCell>
                          <TableCell>{a.audience}</TableCell>
                          <TableCell align="right">{a.recipientCount}</TableCell>
                          <TableCell>{formatDate(a.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PrincipalAnnouncementsPage;
