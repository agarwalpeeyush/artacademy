import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Alert,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { broadcastAnnouncement } from '../../store/slices/announcementSlice';
import announcementService from '../../services/announcementService';
import studentService from '../../services/studentService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherAnnouncementsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);

  const [canBroadcast, setCanBroadcast] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchTeacherTimetables(user.id));
    announcementService.getPermission(user.id)
      .then(p => setCanBroadcast(p.canBroadcast))
      .catch(() => setCanBroadcast(false));
  }, [dispatch, user]);

  const handleSend = async () => {
    if (!user?.id || !title.trim() || !body.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      const classIds = [...new Set(teacherTimetables.map(t => t.classId))];
      const studentLists = await Promise.all(classIds.map(id => studentService.getByClass(id)));
      const recipientUserIds = [...new Set(studentLists.flat().map(s => s.id))];

      if (recipientUserIds.length === 0) {
        setFeedback('You have no students to announce to.');
        return;
      }

      await dispatch(broadcastAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience: 'TEACHER_STUDENTS',
        senderUserId: user.id,
        senderRole: 'ROLE_TEACHER',
        recipientUserIds,
      })).unwrap();

      setFeedback(`Announcement sent to ${recipientUserIds.length} student(s).`);
      setTitle('');
      setBody('');
    } catch {
      setFeedback('Failed to send announcement.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Announcements"
        subtitle="Broadcast an announcement to your students"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Announcements' }]}
      />

      {canBroadcast === null ? (
        <LoadingSpinner />
      ) : !canBroadcast ? (
        <Alert severity="info">
          You do not have permission to send announcements. Please contact your Principal to request access.
        </Alert>
      ) : (
        <Card sx={{ maxWidth: 640 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Compose Announcement</Typography>
            {feedback && <Alert severity="info" sx={{ mb: 2 }}>{feedback}</Alert>}
            <TextField
              label="Title" fullWidth size="small" sx={{ mb: 2 }}
              value={title} onChange={e => setTitle(e.target.value)}
            />
            <TextField
              label="Message" fullWidth size="small" multiline minRows={4} sx={{ mb: 2 }}
              value={body} onChange={e => setBody(e.target.value)}
            />
            <Button
              variant="contained" fullWidth
              disabled={sending || !title.trim() || !body.trim()}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : 'Send to My Students'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TeacherAnnouncementsPage;
