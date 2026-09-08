import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Typography,
  TablePagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PageHeader from '../../components/common/PageHeader';
import api from '../../services/api';

interface AuditLogEntry {
  id: string;
  username: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  success: boolean;
  occurredAt: string;
}

interface SpringPage<T> {
  content: T[];
  totalElements: number;
}

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(usernameFilter), 400);
    return () => clearTimeout(t);
  }, [usernameFilter]);

  useEffect(() => {
    setPage(0);
  }, [debouncedFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: pageSize };
      if (debouncedFilter.trim()) params.username = debouncedFilter.trim();
      const res = await api.get<{ data: SpringPage<AuditLogEntry> }>('/auth/audit-logs', { params });
      const pageData: SpringPage<AuditLogEntry> = res.data?.data ?? (res.data as any);
      setLogs(pageData.content ?? []);
      setTotal(pageData.totalElements ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Box>
      <PageHeader title="Audit Logs" subtitle="Authentication and security event history" />

      <Box sx={{ mb: 2, maxWidth: 320 }}>
        <TextField
          size="small"
          placeholder="Filter by username…"
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          fullWidth
        />
      </Box>

      <Paper elevation={0} variant="outlined">
        <TableContainer>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No audit log entries found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(entry.occurredAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.username}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.success ? 'Success' : 'Failed'}
                        color={entry.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{entry.ipAddress ?? '—'}</TableCell>
                    <TableCell>{entry.detail ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>
    </Box>
  );
};

export default AuditLogsPage;
