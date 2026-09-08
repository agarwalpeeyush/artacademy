import React, { useEffect } from 'react';
import {
  Box, Paper, Typography, List, ListItemButton, ListItemText, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchScheduleHistory, fetchHistoryVersion } from '../../store/slices/scheduleSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime, getDayName, formatDateTime } from '../../utils/formatters';

const ScheduleHistoryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { history, selectedVersion, loading } = useSelector((state: RootState) => state.schedules);

  useEffect(() => {
    dispatch(fetchScheduleHistory());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedVersion && history.length > 0) {
      dispatch(fetchHistoryVersion(history[0].id));
    }
  }, [dispatch, history, selectedVersion]);

  return (
    <Box>
      <PageHeader
        title="Schedule History"
        subtitle="Previously published timetable versions"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Schedule History' }]}
      />

      {loading && history.length === 0 ? (
        <LoadingSpinner />
      ) : history.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No published versions yet.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined">
              <List dense>
                {history.map(v => (
                  <ListItemButton
                    key={v.id}
                    selected={selectedVersion?.id === v.id}
                    onClick={() => dispatch(fetchHistoryVersion(v.id))}
                  >
                    <ListItemText
                      primary={`Version ${v.versionNumber}`}
                      secondary={`${formatDateTime(v.publishedAt)} · ${v.entryCount} entries`}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            {selectedVersion ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedVersion.entries || []).length === 0 ? (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No entries.</TableCell></TableRow>
                    ) : (selectedVersion.entries || []).map((e, i) => (
                      <TableRow key={`${e.scheduleId}-${i}`}>
                        <TableCell>{getDayName(e.dayOfWeek)}</TableCell>
                        <TableCell>{formatTime(e.startTime)} – {formatTime(e.endTime)}</TableCell>
                        <TableCell>{e.roomName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Select a version to view its entries.</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ScheduleHistoryPage;
