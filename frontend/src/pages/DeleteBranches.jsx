import { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, TextField, Grid, 
  Button, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, MenuItem, Switch
} from '@mui/material';
import FullScreenLoader from '../components/FullScreenLoader';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { getCurrentStatusTextFormat, getCurrentStatus } from '../utils/status';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';


export default function DeleteBranches() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasDeletePermission = user?.permissions ? user.permissions.split(',').map(p => p.trim()).includes('DELETE_BRANCH') : false;

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name'); // name or code
  const [activeMetricFilter, setActiveMetricFilter] = useState('ALL');

  // Delete Confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [liveCodesOpen, setLiveCodesOpen] = useState(false);

  const getLiveCafeCodes = () => {
    return stores
      .filter(s => s.isActive !== false)
      .filter(s => {
        const code = (s.cafeCode || '').toUpperCase();
        return code.startsWith('CA') || code.startsWith('GOT') || code.startsWith('CAGT');
      })
      .filter(s => s.status === 'LIVE')
      .map(s => s.cafeCode)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .join('\n');
  };


  const fetchStores = async () => {
    try {
      setLoading(true);
      const firestoreStores = await fetchStoresFromFirestore();
      setStores(firestoreStores);
      setErrorMsg('');
    } catch (err) {
      console.error('Failed to load stores from Firestore, falling back to API:', err);
      try {
        const res = await axios.get('/api/stores');
        setStores(normalizeListResponse(res.data, ['stores', 'data', 'items']));
        setErrorMsg('');
      } catch (apiError) {
        console.error(apiError);
        setErrorMsg('Failed to load stores.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchStores();
    }
  }, [isSuperAdmin]);

  const handleDeleteClick = (store) => {
    setSelectedStore(store);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStore) return;

    setDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axios.delete(`/api/stores/${selectedStore.id}`);
      setSuccessMsg(`Store "${selectedStore.cafeName}" (${selectedStore.cafeCode}) deleted successfully.`);
      setDeleteConfirmOpen(false);
      setSelectedStore(null);
      await fetchStores();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to delete store.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (storeId, newActiveState) => {
    try {
      // Optimistic update in UI
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: newActiveState } : s));
      // Hit backend API to update DB and cache invalidation metadata
      await axios.put(`/api/stores/${storeId}/toggle-active`, { isActive: newActiveState });
    } catch (err) {
      console.error('Failed to toggle active status:', err);
      setErrorMsg('Failed to update active status. Please try again.');
      // Revert optimistic update on failure
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: !newActiveState } : s));
    }
  };

  // Filtered stores list
  const filteredStores = stores.filter(store => {
    // Apply search query first
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchSearch = searchType === 'name' 
        ? store.cafeName?.toLowerCase().includes(q)
        : store.cafeCode?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Apply metric filter
    if (activeMetricFilter === 'ACTIVE_STATUS') {
      return getCurrentStatus(store) === 'Active';
    }
    if (activeMetricFilter === 'CLOSED_STATUS') {
      return getCurrentStatus(store) === 'Closed';
    }
    if (activeMetricFilter === 'ACTIVE_TOGGLE') {
      return store.isActive !== false;
    }
    if (activeMetricFilter === 'INACTIVE_TOGGLE') {
      return store.isActive === false;
    }

    return true;
  });

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          Access Denied. Only Super Administrators are allowed to access this module.
        </Alert>
      </Box>
    );
  }

  if (loading && stores.length === 0) {
    return <FullScreenLoader messages={[
      'Warming up the espresso machine…',
      'Grinding the freshest beans…',
      'Loading active branches…',
      'Plating the details…',
      'Almost ready to serve ☕',
    ]} />;
  }

  return (
    <Box sx={{ width: '100%', py: 1, px: { xs: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
          Store Control Center
        </Typography>
        <Button
            variant="outlined"
            color="primary"
            onClick={() => setLiveCodesOpen(true)}
            disabled={loading || stores.length === 0}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            View Live Cafe Codes
          </Button>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      {!hasDeletePermission && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '8px' }}>
          You do not have sub-access permission to delete branches. Please contact system administrators or enable it in Settings.
        </Alert>
      )}

      {/* Summary Stats snap-row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))'
          },
          gap: 2.25,
          mb: 4
        }}
      >
        <Card 
          onClick={() => setActiveMetricFilter('ALL')}
          sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: '12px', 
            border: '2px solid', 
            borderColor: activeMetricFilter === 'ALL' ? 'primary.main' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMetricFilter === 'ALL' ? '0 8px 24px rgba(63, 174, 191, 0.15)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: activeMetricFilter === 'ALL' ? 'primary.main' : 'text.secondary'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.66rem' }}>
              Total Cafe Entries
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
              {stores.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All database records
            </Typography>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveMetricFilter('ACTIVE_STATUS')}
          sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: '12px', 
            border: '2px solid', 
            borderColor: activeMetricFilter === 'ACTIVE_STATUS' ? '#16a34a' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMetricFilter === 'ACTIVE_STATUS' ? '0 8px 24px rgba(34, 197, 94, 0.15)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: activeMetricFilter === 'ACTIVE_STATUS' ? '#16a34a' : 'text.secondary'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.66rem' }}>
              Current Status: Active
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a', mb: 0.25 }}>
              {stores.filter(s => getCurrentStatus(s) === 'Active').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Operating cafes count
            </Typography>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveMetricFilter('CLOSED_STATUS')}
          sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: '12px', 
            border: '2px solid', 
            borderColor: activeMetricFilter === 'CLOSED_STATUS' ? '#ef4444' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMetricFilter === 'CLOSED_STATUS' ? '0 8px 24px rgba(239, 68, 68, 0.15)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: activeMetricFilter === 'CLOSED_STATUS' ? '#ef4444' : 'text.secondary'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.66rem' }}>
              Current Status: Closed
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ef4444', mb: 0.25 }}>
              {stores.filter(s => getCurrentStatus(s) === 'Closed').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Closed status count
            </Typography>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveMetricFilter('ACTIVE_TOGGLE')}
          sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: '12px', 
            border: '2px solid', 
            borderColor: activeMetricFilter === 'ACTIVE_TOGGLE' ? 'primary.main' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMetricFilter === 'ACTIVE_TOGGLE' ? '0 8px 24px rgba(63, 174, 191, 0.15)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: activeMetricFilter === 'ACTIVE_TOGGLE' ? 'primary.main' : 'text.secondary'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.66rem' }}>
              Active Toggle Count
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.25 }}>
              {stores.filter(s => s.isActive !== false).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Included in counts
            </Typography>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveMetricFilter('INACTIVE_TOGGLE')}
          sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: '12px', 
            border: '2px solid', 
            borderColor: activeMetricFilter === 'INACTIVE_TOGGLE' ? 'text.secondary' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMetricFilter === 'INACTIVE_TOGGLE' ? '0 8px 24px rgba(100, 116, 139, 0.15)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: activeMetricFilter === 'INACTIVE_TOGGLE' ? 'text.secondary' : 'text.secondary'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.66rem' }}>
              Inactive Toggle Count
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.secondary', mb: 0.25 }}>
              {stores.filter(s => s.isActive === false).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Excluded from counts
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Filters Row */}
          <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Search By"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              >
                <MenuItem value="name">Branch Name</MenuItem>
                <MenuItem value="code">Branch Code</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={9} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder={searchType === 'name' ? 'Search by branch name...' : 'Search by branch code...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
            </Grid>
          </Grid>

          {/* Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Cafe Code</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Cafe Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Current Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Active/Inactive</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                      No branches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map(store => (
                    <TableRow key={store.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{store.cafeCode}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{store.cafeName}</TableCell>
                      <TableCell>{store.city || '—'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getCurrentStatusTextFormat(store)} 
                          size="small" 
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={store.isActive !== false}
                          onChange={(e) => handleToggleActive(store.id, e.target.checked)}
                          color="primary"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteClick(store)}
                          disabled={!hasDeletePermission}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', maxWidth: 500 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon />
          Delete Branch
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500, lineHeight: 1.6 }}>
            Are you sure you want to delete this branch? If you proceed, all branch details and related data will be permanently removed from the dashboard.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.5 }}>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            variant="outlined" 
            sx={{ borderRadius: '8px', minWidth: 80, textTransform: 'none', fontWeight: 600 }}
          >
            No
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            sx={{ borderRadius: '8px', minWidth: 80, textTransform: 'none', fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live Cafe Codes Dialog */}
      <Dialog
        open={liveCodesOpen}
        onClose={() => setLiveCodesOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', maxWidth: 600, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Live Cafe Codes ({getLiveCafeCodes().split('\n').filter(Boolean).length})
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={getLiveCafeCodes()}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.9rem' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(getLiveCafeCodes());
              setSuccessMsg('Copied cafe codes to clipboard!');
              setLiveCodesOpen(false);
            }}
            variant="contained"
            color="primary"
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Copy All
          </Button>
          <Button 
            onClick={() => setLiveCodesOpen(false)} 
            variant="outlined" 
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
