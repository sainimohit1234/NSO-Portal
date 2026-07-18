import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Button,
  TextField,
  TablePagination
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../utils/api';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range and filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userNameFilter, setUserNameFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/system/audit-logs');
      setLogs(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    // Date Range Filter
    if (log.date) {
      const logDate = new Date(log.date);
      if (startDate && logDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }
    }

    // User Filter
    if (userNameFilter && !log.userName?.toLowerCase().includes(userNameFilter.toLowerCase()) && !log.userEmail?.toLowerCase().includes(userNameFilter.toLowerCase())) return false;

    return true;
  });

  const paginatedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDownload = () => {
    const headers = ['User Name', 'Email', 'Date', 'Action'];
    const rows = [];
    
    filteredLogs.forEach(log => {
      if (log.activities && log.activities.length > 0) {
        log.activities.forEach(act => {
          rows.push([
            log.userName || '',
            log.userEmail || '',
            log.date || '',
            `${act.time} - ${act.action}`
          ]);
        });
      }
    });

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_trail_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* Top Filter and Actions Bar */}
      <Box sx={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 10, 
        bgcolor: 'background.default', 
        pb: 3, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
          Audit Trail
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, height: 40 }}
          >
            Download Data
          </Button>
        </Box>
      </Box>
      
      {/* Table Container */}
      <TableContainer component={Paper} elevation={0} sx={{ 
        border: '1px solid', 
        borderColor: 'divider', 
        borderRadius: '16px',
        flexGrow: 1,
        mt: 3,
        overflowY: 'auto'
      }}>
        <Table stickyHeader>
          <TableHead>
            {/* Filter Row */}
            <TableRow>
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper', width: '25%' }}>
                <TextField
                  placeholder="Filter User Name or Email"
                  size="small"
                  value={userNameFilter}
                  onChange={(e) => { setUserNameFilter(e.target.value); setPage(0); }}
                  fullWidth
                  variant="outlined"
                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '6px 10px' } } }}
                />
              </TableCell>
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper', width: '20%' }} />
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper', width: '55%' }} />
            </TableRow>
            {/* Main Headers */}
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  No activities match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id} hover sx={{ '& td': { verticalAlign: 'top' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{log.userName}</Typography>
                      {log.userEmail && log.userEmail !== log.userName && (
                        <Typography variant="caption" color="text.secondary">
                          {log.userEmail}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.date ? new Date(log.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {log.activities && log.activities.length > 0 ? (
                        log.activities.map((act, idx) => (
                          <Box key={idx} sx={{ display: 'flex', gap: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: '70px' }}>
                              {act.time}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              – {act.action}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>No actions recorded</Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination Container */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <TablePagination
          component="div"
          count={filteredLogs.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[30]}
        />
      </Box>
    </Box>
  );
};

export default AuditTrail;
