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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../utils/api';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  // Date range and column filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [userNameFilter, setUserNameFilter] = useState('');

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

  const handleViewAction = (log) => {
    setSelectedAction(log);
  };

  const closeDialog = () => {
    setSelectedAction(null);
  };

  const getActionType = (activity) => {
    const act = activity?.toLowerCase() || '';
    if (act.includes('create')) return 'Created';
    if (act.includes('delete') || act.includes('remove')) return 'Deleted';
    return 'Modify';
  };

  // Helper to format activity dynamically with category/sub-category/store names
  const formatActivity = (log) => {
    let baseActivity = log.activity;
    try {
      // If Email Mappings
      if (log.module === 'Email Directory' && log.activity.toLowerCase().includes('mapping')) {
        const oldVal = log.oldValue ? JSON.parse(log.oldValue) : [];
        const newVal = log.newValue ? JSON.parse(log.newValue) : [];
        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
          const oldKeys = oldVal.map(item => item.subCategory);
          const newKeys = newVal.map(item => item.subCategory);
          const added = newVal.filter(item => !oldKeys.includes(item.subCategory));
          const deleted = oldVal.filter(item => !newKeys.includes(item.subCategory));
          const modified = newVal.filter(newItem => {
            const oldItem = oldVal.find(item => item.subCategory === newItem.subCategory);
            return oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem);
          });
          
          const names = [...added, ...deleted, ...modified].map(item => item.subCategory);
          if (names.length > 0) {
            return `${baseActivity} (${names.join(', ')})`;
          }
        }
      }
      
      // If Email Templates
      if (log.module === 'Email Directory' && log.activity.toLowerCase().includes('template')) {
        const oldVal = log.oldValue ? JSON.parse(log.oldValue) : {};
        const newVal = log.newValue ? JSON.parse(log.newValue) : {};
        const keys = Object.keys(newVal).filter(k => JSON.stringify(oldVal[k]) !== JSON.stringify(newVal[k]));
        if (keys.length > 0) {
          return `${baseActivity} (${keys.join(', ')})`;
        }
      }

      // If Store
      if (log.module === 'store') {
        const oldVal = log.oldValue ? JSON.parse(log.oldValue) : {};
        const newVal = log.newValue ? JSON.parse(log.newValue) : {};
        const name = newVal.cafeName || oldVal.cafeName || newVal.storeName || oldVal.storeName;
        if (name) {
          return `${baseActivity} (${name})`;
        }
      }

      // If User Management
      if (log.module === 'User Management') {
        const oldVal = log.oldValue ? JSON.parse(log.oldValue) : {};
        const newVal = log.newValue ? JSON.parse(log.newValue) : {};
        const name = newVal.name || oldVal.name || newVal.email || oldVal.email;
        if (name) {
          return `${baseActivity} (${name})`;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return baseActivity;
  };

  const filteredLogs = logs.filter(log => {
    // 1. Date Range Filter
    if (log.timestamp) {
      const date = new Date(log.timestamp);
      if (startDate && date < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
    } else if (startDate || endDate) {
      return false;
    }

    // 2. Column-wise Filters
    if (moduleFilter && !log.module?.toLowerCase().includes(moduleFilter.toLowerCase())) return false;
    
    if (actionTypeFilter) {
      const type = getActionType(log.activity);
      if (type !== actionTypeFilter) return false;
    }

    const formattedAct = formatActivity(log);
    if (activityFilter && !formattedAct.toLowerCase().includes(activityFilter.toLowerCase())) return false;
    if (userNameFilter && !log.userName?.toLowerCase().includes(userNameFilter.toLowerCase())) return false;

    return true;
  });

  const formatValueForCsv = (val) => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.map(item => {
          if (typeof item === 'object' && item !== null) {
            return Object.entries(item)
              .filter(([k]) => !['id', 'createdAt', 'updatedAt', 'lastActiveAt', 'lastLoginAt'].includes(k))
              .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join('\n');
          }
          return String(item);
        }).join('\n---\n');
      } else {
        return Object.entries(val)
          .filter(([k]) => !['id', 'createdAt', 'updatedAt', 'lastActiveAt', 'lastLoginAt'].includes(k))
          .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('\n');
      }
    }
    const str = String(val);
    return str.replace(/<br\s*\/?>/gi, '\n');
  };

  const handleDownload = () => {
    const headers = ['Module', 'Action Type', 'Activity', 'User Name', 'Date & Time', 'Old Value', 'New Value'];
    const rows = filteredLogs.map(log => [
      log.module || '',
      getActionType(log.activity),
      formatActivity(log),
      log.userName || '',
      log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'N/A',
      formatValueForCsv(log.oldValue),
      formatValueForCsv(log.newValue)
    ]);

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

  const getItemKey = (item) => {
    if (typeof item === 'string') return item;
    return item.id || item.subCategory || item.name || JSON.stringify(item);
  };

  const getItemLabel = (item) => {
    if (typeof item === 'string') return item;
    if (item.category && item.subCategory) {
      return `${item.subCategory} (${item.category})`;
    }
    return item.subCategory || item.name || item.id || 'Item';
  };

  const renderItemSummary = (item) => {
    if (typeof item === 'string') return <Typography variant="body2">{item}</Typography>;
    if (item.category && item.subCategory) {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.subCategory} ({item.category})</Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 0.5 }}>To: {Array.isArray(item.to) ? item.to.join(', ') : item.to || 'N/A'}</Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Cc: {Array.isArray(item.cc) ? item.cc.join(', ') : item.cc || 'N/A'}</Typography>
        </Box>
      );
    }
    return <pre style={{ margin: 0, fontSize: '11px', overflowX: 'auto' }}>{JSON.stringify(item, null, 2)}</pre>;
  };

  const formatTextValue = (val) => {
    if (val === undefined || val === null) return 'N/A';
    const str = String(val);
    return str.replace(/<br\s*\/?>/gi, '\n');
  };

  const renderObjectDiff = (oldObj, newObj) => {
    const allKeys = Array.from(new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]));
    const changes = [];

    allKeys.forEach(key => {
      if (['id', 'createdAt', 'updatedAt', 'lastActiveAt', 'lastLoginAt'].includes(key)) return;

      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, oldVal, newVal });
      }
    });

    if (changes.length === 0) {
      return <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.9rem' }}>No field changes detected.</Typography>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 4.5fr 4.5fr', gap: 2, pb: 1, borderBottom: '2px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>FIELD</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>OLD VALUE</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>REPLACE WITH</Typography>
        </Box>
        {changes.map((change, idx) => {
          const fieldName = change.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          
          const isOldValObj = typeof change.oldVal === 'object' && change.oldVal !== null && !Array.isArray(change.oldVal);
          const isNewValObj = typeof change.newVal === 'object' && change.newVal !== null && !Array.isArray(change.newVal);

          if (isOldValObj || isNewValObj) {
            return (
              <Box key={idx} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                  {fieldName}
                </Typography>
                {renderObjectDiff(change.oldVal || {}, change.newVal || {})}
              </Box>
            );
          }

          let oldDisplay = formatTextValue(change.oldVal);
          let newDisplay = formatTextValue(change.newVal);

          return (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '3fr 4.5fr 4.5fr', gap: 2, alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>{fieldName}</Typography>
              <Box>
                {change.oldVal !== undefined ? (
                  <Typography variant="body2" sx={{ color: 'error.main', textDecoration: 'line-through', bgcolor: '#fef2f2', px: 1, py: 0.5, borderRadius: '6px', fontSize: '0.8rem', display: 'inline-block', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                    {oldDisplay}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontStyle: 'italic' }}>N/A</Typography>
                )}
              </Box>
              <Box>
                {change.newVal !== undefined ? (
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', bgcolor: '#f0fdf4', px: 1, py: 0.5, borderRadius: '6px', fontSize: '0.8rem', display: 'inline-block', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                    {newDisplay}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontStyle: 'italic' }}>N/A</Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderArrayDiff = (oldArr, newArr) => {
    const oldKeys = oldArr.map(getItemKey);
    const newKeys = newArr.map(getItemKey);

    const added = newArr.filter(item => !oldKeys.includes(getItemKey(item)));
    const deleted = oldArr.filter(item => !newKeys.includes(getItemKey(item)));
    
    const updated = [];
    newArr.forEach(newItem => {
      const key = getItemKey(newItem);
      const oldItem = oldArr.find(item => getItemKey(item) === key);
      if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        updated.push({ oldItem, newItem });
      }
    });

    if (added.length === 0 && deleted.length === 0 && updated.length === 0) {
      return <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.9rem' }}>No item changes detected.</Typography>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {added.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              Added Items ({added.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {added.map((item, idx) => (
                <Box key={idx} sx={{ p: 1.75, bgcolor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  {renderItemSummary(item)}
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        {deleted.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
              Deleted Items ({deleted.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {deleted.map((item, idx) => (
                <Box key={idx} sx={{ p: 1.75, bgcolor: '#fef2f2', borderRadius: '12px', border: '1px solid #fca5a5' }}>
                  {renderItemSummary(item)}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {updated.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />
              Modified Items ({updated.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {updated.map((item, idx) => (
                <Box key={idx} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                    {getItemLabel(item.newItem)}
                  </Typography>
                  {renderObjectDiff(item.oldItem, item.newItem)}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderDiff = (oldValStr, newValStr) => {
    let oldVal, newVal;
    try { oldVal = oldValStr ? JSON.parse(oldValStr) : null; } catch { oldVal = oldValStr; }
    try { newVal = newValStr ? JSON.parse(newValStr) : null; } catch { newVal = newValStr; }

    if (!oldVal && !newVal) return <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No details available.</Typography>;

    const oldIsObj = typeof oldVal === 'object' && oldVal !== null;
    const newIsObj = typeof newVal === 'object' && newVal !== null;
    const oldIsArr = Array.isArray(oldVal);
    const newIsArr = Array.isArray(newVal);

    if (oldIsArr || newIsArr) {
      return renderArrayDiff(Array.isArray(oldVal) ? oldVal : [], Array.isArray(newVal) ? newVal : []);
    }

    if (oldIsObj || newIsObj) {
      return renderObjectDiff(oldIsObj ? oldVal : {}, newIsObj ? newVal : {});
    }

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>Old Value</Typography>
          <Box sx={{ bgcolor: '#fef2f2', color: 'error.main', p: 2, borderRadius: '8px', border: '1px solid #fca5a5', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            {formatTextValue(oldVal)}
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>Replace with</Typography>
          <Box sx={{ bgcolor: '#f0fdf4', color: 'success.main', p: 2, borderRadius: '8px', border: '1px solid #bbf7d0', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            {formatTextValue(newVal)}
          </Box>
        </Box>
      </Box>
    );
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
      {/* Top Filter and Actions Bar - Stays Frozen */}
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
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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
      
      {/* Table Container - Scrolls Internally with Fixed Headers and Filters */}
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
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }}>
                <TextField
                  placeholder="Filter Module"
                  size="small"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  fullWidth
                  variant="outlined"
                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '6px 10px' } } }}
                />
              </TableCell>
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }}>
                <TextField
                  select
                  size="small"
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  fullWidth
                  variant="outlined"
                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '6px 10px' } } }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Created">Created</MenuItem>
                  <MenuItem value="Deleted">Deleted</MenuItem>
                  <MenuItem value="Modify">Modify</MenuItem>
                </TextField>
              </TableCell>
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }}>
                <TextField
                  placeholder="Filter Activity"
                  size="small"
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  fullWidth
                  variant="outlined"
                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '6px 10px' } } }}
                />
              </TableCell>
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }}>
                <TextField
                  placeholder="Filter User"
                  size="small"
                  value={userNameFilter}
                  onChange={(e) => setUserNameFilter(e.target.value)}
                  fullWidth
                  variant="outlined"
                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '6px 10px' } } }}
                />
              </TableCell>
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }} />
              <TableCell sx={{ py: 1, px: 1.5, borderBottom: 'none', position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }} />
            </TableRow>
            {/* Main Headers */}
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Module</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Action Type</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Activity</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>User Name</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', position: 'sticky', top: 56, zIndex: 11 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  No activities match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{log.module}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        bgcolor: 
                          getActionType(log.activity) === 'Created' ? '#f0fdf4' :
                          getActionType(log.activity) === 'Deleted' ? '#fef2f2' : '#eff6ff',
                        color:
                          getActionType(log.activity) === 'Created' ? 'success.main' :
                          getActionType(log.activity) === 'Deleted' ? 'error.main' : 'primary.main',
                        border: '1px solid',
                        borderColor:
                          getActionType(log.activity) === 'Created' ? '#bbf7d0' :
                          getActionType(log.activity) === 'Deleted' ? '#fca5a5' : '#bfdbfe'
                      }}
                    >
                      {getActionType(log.activity)}
                    </Box>
                  </TableCell>
                  <TableCell>{formatActivity(log)}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" onClick={() => handleViewAction(log)} sx={{ borderRadius: '8px', textTransform: 'none' }}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!selectedAction} onClose={closeDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
          Activity Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedAction && renderDiff(selectedAction.oldValue, selectedAction.newValue)}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={closeDialog} color="inherit" sx={{ fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrail;
