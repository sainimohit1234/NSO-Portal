import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Button, Stack, Link, useTheme,
  Grid, TextField, MenuItem 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';

export default function Compliance() {
  const [stores, setStores] = useState([]);
  const [fssaiFilter, setFssaiFilter] = useState('all');
  const [gstFilter, setGstFilter] = useState('all');
  const [rentFilter, setRentFilter] = useState('all');
  const [complianceStatusFilter, setComplianceStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();

  const fetchStores = () => {
    fetchStoresFromFirestore()
      .then(stores => {
        // Show stores that are NSO_APPROVED, legacy APPROVED, COMPLIANCE_APPROVED, or LIVE
        const filtered = stores.filter(s => 
          s.status === 'NSO_APPROVED' || 
          s.status === 'APPROVED' || 
          s.status === 'COMPLIANCE_APPROVED' ||
          s.status === 'LIVE'
        );
        setStores(filtered);
      })
      .catch(async err => {
        console.error('Failed to load stores from Firestore, falling back to API:', err);
        try {
          const res = await axios.get('/api/stores');
          const stores = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          const filtered = stores.filter(s => 
            s.status === 'NSO_APPROVED' || 
            s.status === 'APPROVED' || 
            s.status === 'COMPLIANCE_APPROVED' ||
            s.status === 'LIVE'
          );
          setStores(filtered);
        } catch (apiError) {
          console.error(apiError);
        }
      });
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const getDocStatus = (hasNo, hasDoc) => {
    if (hasNo && hasDoc) {
      return <Chip icon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />} label="Completed" color="success" size="small" sx={{ fontWeight: 700, borderRadius: '6px' }} />;
    }
    return <Chip icon={<PendingIcon sx={{ fontSize: '16px !important' }} />} label="Pending" color="warning" size="small" sx={{ fontWeight: 700, borderRadius: '6px' }} />;
  };

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'COMPLIANCE_APPROVED':
      case 'LIVE':
        return { bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' };
      case 'NSO_APPROVED':
      case 'APPROVED':
        return { bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' };
      default:
        return { bgcolor: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', borderColor: 'rgba(156, 163, 175, 0.2)' };
    }
  };

  const filteredStores = stores.filter(store => {
    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = store.cafeName?.toLowerCase().includes(q);
      const matchesCode = store.cafeCode?.toLowerCase().includes(q);
      if (!matchesName && !matchesCode) return false;
    }

    // FSSAI Filter
    if (fssaiFilter === 'completed') {
      if (!(store.fssaiNo && store.fssaiLicense)) return false;
    } else if (fssaiFilter === 'pending') {
      if (store.fssaiNo && store.fssaiLicense) return false;
    }

    // GST Filter
    if (gstFilter === 'completed') {
      if (!(store.gstNo && store.gstCertificateLink)) return false;
    } else if (gstFilter === 'pending') {
      if (store.gstNo && store.gstCertificateLink) return false;
    }

    // Rent Agreement Filter
    if (rentFilter === 'completed') {
      if (!(store.rentExpiry && store.rentAgreementLink)) return false;
    } else if (rentFilter === 'pending') {
      if (store.rentExpiry && store.rentAgreementLink) return false;
    }

    // Compliance Status Filter
    if (complianceStatusFilter === 'approved') {
      if (store.status !== 'COMPLIANCE_APPROVED' && store.status !== 'LIVE') return false;
    } else if (complianceStatusFilter === 'awaiting') {
      if (store.status === 'COMPLIANCE_APPROVED' || store.status === 'LIVE') return false;
    }

    return true;
  });

  const isFilterVisible = user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE';

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Compliance & Lease Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update and approve mandatory legal, GST, FSSAI, and Rent Agreement details before store integration.
        </Typography>
      </Box>

      {/* Filter Row */}
      <Card sx={{ p: 3, mb: 3, borderRadius: '16px', bgcolor: 'background.paper' }}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: isFilterVisible ? 2.4 : 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Cafe Name or Code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          {isFilterVisible && (
            <>
              <Grid size={{ xs: 12, sm: 2.4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="FSSAI Status"
                  value={fssaiFilter}
                  onChange={(e) => setFssaiFilter(e.target.value)}
                >
                  <MenuItem value="all">All FSSAI</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 2.4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="GST Status"
                  value={gstFilter}
                  onChange={(e) => setGstFilter(e.target.value)}
                >
                  <MenuItem value="all">All GST</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 2.4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Rent Agreement Status"
                  value={rentFilter}
                  onChange={(e) => setRentFilter(e.target.value)}
                >
                  <MenuItem value="all">All Rent Agreement</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 2.4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Compliance Status"
                  value={complianceStatusFilter}
                  onChange={(e) => setComplianceStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="awaiting">Awaiting Compliance</MenuItem>
                  <MenuItem value="approved">Compliance Approved</MenuItem>
                </TextField>
              </Grid>
            </>
          )}
        </Grid>
      </Card>

      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden', borderRadius: '16px' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.01)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Cafe Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cafe Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>FSSAI Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>GST Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rent Agreement</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Compliance Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Approved By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Approved Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8, color: 'text.secondary', fontWeight: 600 }}>
                    No stores match the active filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const style = getStatusChipStyle(store.status);
                  return (
                    <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{store.cafeCode}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>{store.cafeName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        {(() => {
                          const addr = store.cafeAddress || store.address || '';
                          const city = store.city || '';
                          const state = store.state || '';
                          const pin = store.pinCode || '';
                          
                          const parts = [];
                          if (addr) parts.push(addr);
                          if (city) parts.push(city);
                          if (state) parts.push(state);
                          
                          let result = parts.join(', ');
                          if (pin) {
                            result += result ? ` - ${pin}` : pin;
                          }
                          return result || 'N/A';
                        })()}
                      </TableCell>
                      <TableCell>{getDocStatus(store.fssaiNo, store.fssaiLicense)}</TableCell>
                      <TableCell>{getDocStatus(store.gstNo, store.gstCertificateLink)}</TableCell>
                      <TableCell>{getDocStatus(store.rentExpiry, store.rentAgreementLink)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={(store.status === 'COMPLIANCE_APPROVED' || store.status === 'LIVE') ? 'COMPLIANCE APPROVED' : 'AWAITING COMPLIANCE'} 
                          variant="outlined" 
                          size="small" 
                          sx={{ 
                            fontWeight: 800, 
                            fontSize: '0.65rem',
                            borderRadius: '6px',
                            bgcolor: style.bgcolor,
                            color: style.color,
                            borderColor: style.borderColor
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.secondary' }}>
                        {store.complianceApprovedBy || '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.secondary' }}>
                        {store.complianceApprovedAt ? new Date(store.complianceApprovedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/compliance/${store.id}`)}
                          sx={{ 
                            borderRadius: '8px', 
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 1.5,
                          }}
                        >
                          Manage Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
