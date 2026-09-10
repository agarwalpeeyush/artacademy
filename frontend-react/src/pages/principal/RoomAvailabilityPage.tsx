import React, { useEffect, useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, Paper, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchRoomAvailability } from '../../store/slices/timetableSlice';
import { Room } from '../../types';
import roomService from '../../services/roomService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime, getDayName } from '../../utils/formatters';
import { format } from 'date-fns';

const RoomAvailabilityPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { roomAvailability, loading } = useSelector((state: RootState) => state.timetables);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    roomService.getAll().then(setRooms).catch(() => {});
  }, []);

  useEffect(() => {
    if (roomId && date) dispatch(fetchRoomAvailability({ roomId, date }));
  }, [dispatch, roomId, date]);

  return (
    <Box>
      <PageHeader
        title="Room Availability"
        subtitle="Occupied and free slots for a room on a given day"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Room Availability' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={5}>
          <TextField select label="Room" size="small" fullWidth value={roomId}
            onChange={e => setRoomId(e.target.value)}>
            {rooms.length === 0
              ? <MenuItem value="" disabled>No rooms available</MenuItem>
              : rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.roomName} (cap: {r.capacity})</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Date" type="date" size="small" fullWidth value={date}
            onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>

      {!roomId ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a room to view availability.</Typography>
        </Paper>
      ) : loading ? (
        <LoadingSpinner />
      ) : !roomAvailability ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No availability data.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={600}>
              {roomAvailability.roomName} — {getDayName(roomAvailability.dayOfWeek)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#FDECEA' }}>
                      Occupied <Chip label={roomAvailability.occupied.length} size="small" color="error" sx={{ ml: 1 }} />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roomAvailability.occupied.length === 0 ? (
                    <TableRow><TableCell colSpan={2} align="center" sx={{ py: 2 }}>None</TableCell></TableRow>
                  ) : roomAvailability.occupied.map((s, i) => (
                    <TableRow key={s.timetableId || i}>
                      <TableCell>{formatTime(s.startTime)} – {formatTime(s.endTime)}</TableCell>
                      <TableCell>{s.classId ? `Class ${s.classId.slice(0, 8)}` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#E8F5E9' }}>
                      Free <Chip label={roomAvailability.free.length} size="small" color="success" sx={{ ml: 1 }} />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roomAvailability.free.length === 0 ? (
                    <TableRow><TableCell align="center" sx={{ py: 2 }}>None</TableCell></TableRow>
                  ) : roomAvailability.free.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatTime(s.startTime)} – {formatTime(s.endTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default RoomAvailabilityPage;
