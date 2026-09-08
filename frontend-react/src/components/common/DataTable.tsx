import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface Column<T> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
}

type Order = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField?: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  rowsPerPageOptions?: number[];
  onRowClick?: (row: T) => void;
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField = 'id' as keyof T,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found.',
  rowsPerPageOptions = [10, 25, 50],
  onRowClick,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<Order>('asc');

  const filteredRows = searchable && searchQuery
    ? rows.filter(row =>
        Object.values(row).some(val =>
          String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : rows;

  const compare = (a: unknown, b: unknown): number => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  };

  const sortedRows = orderBy
    ? [...filteredRows].sort((a, b) => {
        const result = compare(a[orderBy as keyof T], b[orderBy as keyof T]);
        return order === 'asc' ? result : -result;
      })
    : filteredRows;

  const handleSort = (columnId: string) => {
    if (orderBy === columnId) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(columnId);
      setOrder('asc');
    }
  };

  const paginatedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    const value = row[column.id as keyof T];
    if (column.format) {
      return column.format(value, row);
    }
    return value != null ? String(value) : '-';
  };

  return (
    <Paper elevation={0} variant="outlined">
      {searchable && (
        <Box p={2} borderBottom="1px solid" borderColor="divider">
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>
      )}
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map(col => {
                const colId = String(col.id);
                const isSortable = col.sortable !== false;
                return (
                  <TableCell
                    key={colId}
                    align={col.align || 'left'}
                    style={{ minWidth: col.minWidth }}
                    sortDirection={orderBy === colId ? order : false}
                  >
                    {isSortable ? (
                      <TableSortLabel
                        active={orderBy === colId}
                        direction={orderBy === colId ? order : 'asc'}
                        onClick={() => handleSort(colId)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, rowIndex) => (
                <TableRow
                  key={String(row[keyField] ?? rowIndex)}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map(col => (
                    <TableCell key={String(col.id)} align={col.align || 'left'}>
                      {getCellValue(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
      />
    </Paper>
  );
}

export default DataTable;
