import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, TextField, Grid, 
  Button, IconButton, CircularProgress, Alert, Dialog, DialogTitle, 
  DialogContent, DialogActions, InputAdornment, MenuItem, Switch
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { getCurrentStatusTextFormat } from '../utils/status';

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

  // Delete Confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      // Optimistic update
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: newActiveState } : s));
      await axios.put(`/api/stores/${storeId}/toggle-active`, { isActive: newActiveState });
    } catch (err) {
      console.error('Failed to toggle active status:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to update active status.');
      // Revert if failed
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: !newActiveState } : s));
    }
  };

  // Filtered stores list
  const filteredStores = stores.filter(store => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (searchType === 'name') {
      return store.cafeName?.toLowerCase().includes(q);
    } else {
      return store.cafeCode?.toLowerCase().includes(q);
    }
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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', p: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 3 }}>
        Store Control Center
      </Typography>

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
    </Box>
  );
}
