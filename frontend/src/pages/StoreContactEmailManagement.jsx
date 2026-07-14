import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, InputAdornment,
  CircularProgress, Select, MenuItem, Grid, Paper
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from '../utils/api';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { useAuth } from '../context/AuthContext';

export default function StoreContactEmailManagement() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasPermission = user?.permissions && user.permissions.includes('store_contact_email');
  const canEdit = isSuperAdmin || hasPermission;

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      fetchStoresFromFirestore()
        .then(firestoreStores => {
          setStores(firestoreStores);
          setLoading(false);
        })
        .catch(async err => {
          console.error('Failed to load stores from Firestore, falling back to API:', err);
          try {
            const res = await axios.get('/api/stores');
            const normalizedStores = normalizeListResponse(res.data, ['stores', 'data', 'items']);
            setStores(normalizedStores);
          } catch (apiError) {
            console.error(apiError);
          } finally {
            setLoading(false);
          }
        });
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store => {
    const storeStatus = store.itEmailStatus || 'Pending';
    if (filterStatus && storeStatus !== filterStatus) return false;

    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    return (
      (store.cafeCode || '').toLowerCase().includes(searchLower) ||
      (store.cafeName || '').toLowerCase().includes(searchLower) ||
      (store.cafeAddress || store.address || '').toLowerCase().includes(searchLower) ||
      (store.itCafeMailId || '').toLowerCase().includes(searchLower) ||
      (store.itCmMailId || '').toLowerCase().includes(searchLower) ||
      (store.cafePhoneNumber || '').toLowerCase().includes(searchLower) ||
      storeStatus.toLowerCase().includes(searchLower)
    );
  });

  const handleStatusChange = async (storeId, newStatus) => {
    try {
      setUpdating(true);
      await axios.put(`/api/stores/${storeId}`, { itEmailStatus: newStatus });
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, itEmailStatus: newStatus } : s));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto', py: 4, px: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Store Contact & Email Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and view contact information and email addresses for all stores.
          </Typography>
        </Box>
        <TextField
          variant="outlined"
          placeholder="Search stores..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#0A314D' }} />
              </InputAdornment>
            ),
          }}
          sx={{ 
            width: { xs: '100%', sm: 350 }, 
            bgcolor: '#ffffff', 
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'transparent' },
              '&.Mui-focused fieldset': { borderColor: 'transparent' },
            }
          }}
        />
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'All Stores', value: '', color: '#3b82f6', icon: '🏪' },
          { label: 'Pending', value: 'Pending', color: '#f59e0b', icon: '⏳' },
          { label: 'Completed', value: 'Done', color: '#10b981', icon: '✅' }
        ].map((tile) => {
          const count = stores.filter(s => tile.value ? (s.itEmailStatus || 'Pending') === tile.value : true).length;
          return (
            <Grid item xs={12} sm={4} key={tile.label}>
              <Paper
                onClick={() => setFilterStatus(tile.value)}
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  border: filterStatus === tile.value ? `2px solid ${tile.color}` : '2px solid transparent',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  borderRadius: 3,
                  boxShadow: filterStatus === tile.value ? `0 4px 12px ${tile.color}25` : '0 2px 8px rgba(0,0,0,0.05)',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${tile.color}15` }
                }}
              >
                <Typography variant="h2" sx={{ fontWeight: 800, color: tile.color, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1.5rem' }}>{tile.icon}</span>
                  {count}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {tile.label}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0A314D' }}>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap' }}>Cafe Code</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap' }}>Cafe Name</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, minWidth: 200 }}>Complete Address</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap' }}>Cafe mail ID</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap' }}>CM Mail id</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap' }}>Cafe Contact Number</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading store contacts...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchQuery ? 'No stores match your search.' : 'No stores found.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow 
                      key={store.id} 
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{store.cafeCode || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{store.cafeName || '-'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', maxWidth: 300 }}>{store.cafeAddress || store.address || '-'}</TableCell>
                      <TableCell>{store.itCafeMailId || '-'}</TableCell>
                      <TableCell>{store.itCmMailId || '-'}</TableCell>
                      <TableCell>{store.cafePhoneNumber || '-'}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select
                            value={store.itEmailStatus || 'Pending'}
                            onChange={(e) => handleStatusChange(store.id, e.target.value)}
                            size="small"
                            disabled={updating}
                            sx={{
                              minWidth: 120,
                              height: 32,
                              fontSize: '0.875rem',
                              bgcolor: store.itEmailStatus === 'Done' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                              color: store.itEmailStatus === 'Done' ? '#15803d' : '#b45309',
                              fontWeight: 600,
                              borderRadius: 1.5,
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }}
                          >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Done">Done</MenuItem>
                          </Select>
                        ) : (
                          <Typography variant="body2" sx={{
                            fontWeight: 600,
                            color: store.itEmailStatus === 'Done' ? '#15803d' : '#b45309',
                            bgcolor: store.itEmailStatus === 'Done' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                            px: 1.5, py: 0.5, borderRadius: 1.5, display: 'inline-block'
                          }}>
                            {store.itEmailStatus || 'Pending'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
