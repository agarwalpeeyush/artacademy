import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PageHeader from '../../components/common/PageHeader';
import api from '../../services/api';

interface UserSummary {
  id: string;
  username: string;
  email: string;
  status: string;
  roles: string[];
  createdAt: string;
}

interface SpringPage<T> {
  content: T[];
  totalElements: number;
}

const ALL_ROLES = ['STUDENT', 'TEACHER', 'PRINCIPAL', 'ADMIN'];

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'INACTIVE') return 'warning';
  if (status === 'SUSPENDED') return 'error';
  return 'default';
};

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // Role edit dialog
  const [roleDialogUser, setRoleDialogUser] = useState<UserSummary | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: SpringPage<UserSummary> }>('/auth/users', {
        params: { page, size: pageSize },
      });
      const pageData: SpringPage<UserSummary> = res.data?.data ?? (res.data as any);
      setUsers(pageData.content ?? []);
      setTotal(pageData.totalElements ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleStatus = async (user: UserSummary) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/auth/users/${user.id}/status`, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch {
      // silently ignore — toast could be added later
    }
  };

  const openRoleDialog = (user: UserSummary) => {
    setRoleDialogUser(user);
    setSelectedRoles(user.roles);
  };

  const handleRoleSave = async () => {
    if (!roleDialogUser) return;
    setSaving(true);
    try {
      const res = await api.put<{ data: UserSummary }>(`/auth/users/${roleDialogUser.id}/roles`, {
        roles: selectedRoles,
      });
      const updated: UserSummary = res.data?.data ?? (res.data as any);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setRoleDialogUser(null);
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="User Management" subtitle="Manage user accounts and roles" />

      <Paper elevation={0} variant="outlined">
        <TableContainer>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.status} color={statusColor(user.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {user.roles.map(r => (
                          <Chip key={r} label={r} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => toggleStatus(user)}>
                          {user.status === 'ACTIVE'
                            ? <BlockIcon fontSize="small" color="error" />
                            : <CheckCircleOutlineIcon fontSize="small" color="success" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit roles">
                        <IconButton size="small" onClick={() => openRoleDialog(user)}>
                          <ManageAccountsIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
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

      {/* Role Edit Dialog */}
      <Dialog open={!!roleDialogUser} onClose={() => setRoleDialogUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Roles — {roleDialogUser?.username}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              value={selectedRoles}
              onChange={(e: SelectChangeEvent<string[]>) =>
                setSelectedRoles(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
              }
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(r => <Chip key={r} label={r} size="small" />)}
                </Box>
              )}
            >
              {ALL_ROLES.map(role => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={selectedRoles.includes(role)} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogUser(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRoleSave}
            disabled={saving || selectedRoles.length === 0}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;
