import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, TextField, Grid, 
  Button, MenuItem, Tooltip 
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { sortStoresByCurrentStatus } from '../utils/status';

export default function UpcomingStores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUser = user?.role === 'USER';

  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [filters, setFilters] = useState({
    brand: '',
    searchType: 'name',
    searchQuery: '',
    city: '',
    launchMonthYear: '',
    workflowStatus: ''
  });

  const hasActiveFilters = !!(
    filters.brand ||
    (filters.searchQuery || '').trim() ||
    filters.city ||
    filters.launchMonthYear ||
    filters.workflowStatus
  );

  useEffect(() => {
    axios.get('/api/stores')
      .then(res => {
        // Filter: store launchStatus is "Upcoming Store" or default (empty and not LIVE/CLOSED)
        const upcoming = res.data.filter(s => 
          s.launchStatus === 'Upcoming Store' || 
          (!s.launchStatus && s.status !== 'LIVE' && s.status !== 'CLOSED')
        );
        setStores(upcoming);
        setFilteredStores(upcoming);
      })
      .catch(err => console.error('Failed to fetch stores:', err));
  }, []);

  useEffect(() => {
    let result = stores;

    // Brand Filter
    if (filters.brand) {
      result = result.filter(s => {
        if (filters.brand === 'BLUE_TOKAI_SUCHALI') {
          return !s.brand || s.brand === 'BLUE_TOKAI_SUCHALI';
        }
        return s.brand === filters.brand;
      });
    }

    // Search Filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (filters.searchType === 'name') {
        result = result.filter(s => s.cafeName?.toLowerCase().includes(query));
      } else if (filters.searchType === 'code') {
        result = result.filter(s => s.cafeCode?.toLowerCase().includes(query));
      }
    }

    // City Filter
    if (filters.city) {
      result = result.filter(s => s.city === filters.city);
    }

    // Tentative Launch Month Year Filter
    if (filters.launchMonthYear) {
      const [year, month] = filters.launchMonthYear.split('-');
      result = result.filter(s => {
        if (s.tentativeDryLaunchDate) {
          const parts = s.tentativeDryLaunchDate.split('-');
          return parts.length >= 2 && parts[0] === year && parts[1] === month;
        }
        return false;
      });
    }

    // Workflow Status Filter
    if (filters.workflowStatus) {
      if (filters.workflowStatus === 'APPROVED') {
        result = result.filter(s => s.status === 'APPROVED' || s.status === 'NSO_APPROVED');
      } else {
        result = result.filter(s => s.status === filters.workflowStatus);
      }
    }

    const sortedResult = sortStoresByCurrentStatus(result);
    setFilteredStores(sortedResult);
  }, [filters, stores]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleClearFilters = () => {
    setFilters({
      brand: '',
      searchType: 'name',
      searchQuery: '',
      city: '',
      launchMonthYear: '',
      workflowStatus: ''
    });
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'LIVE':
        return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', borderColor: 'rgba(34, 197, 94, 0.3)' };   // Green
      case 'APPROVED':
      case 'NSO_APPROVED':
        return { bgcolor: 'rgba(234, 179, 8, 0.12)', color: '#a16207', borderColor: 'rgba(234, 179, 8, 0.35)' };  // Yellow
      case 'COMPLIANCE_APPROVED':
      case 'PENDING_APPROVAL':
        return { bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', borderColor: 'rgba(249, 115, 22, 0.3)' }; // Orange
      case 'ON_HOLD':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };   // Red
      case 'INCOMPLETE_INFORMATION':
        return { bgcolor: 'rgba(100, 116, 139, 0.10)', color: '#475569', borderColor: 'rgba(100, 116, 139, 0.25)' }; // Grey
      case 'DRAFT':
        return { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' };
      case 'REJECTED':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bgcolor: '#f1f3f4', color: '#5f6368', borderColor: '#dadce0' };
    }
  };

  // Get unique cities from the upcoming stores list for dynamic filtering
  const uniqueCities = Array.from(new Set(stores.map(s => s.city).filter(Boolean))).sort();

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
              All Upcoming Stores
            </Typography>
            <Chip 
              label={`${filteredStores.length} ${filteredStores.length === 1 ? 'Store' : 'Stores'}`} 
              color="primary" 
              size="small" 
              sx={{ fontWeight: 700 }} 
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Monitor, filter, and plan for upcoming cafe setups and dry launches.
          </Typography>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>Filter Upcoming Stores</Typography>
          <Grid container spacing={2} alignItems="center">
            {/* Brand Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Brand"
                name="brand"
                value={filters.brand}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Brands</MenuItem>
                <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's</MenuItem>
                <MenuItem value="GOT_TEA">Got Tea</MenuItem>
              </TextField>
            </Grid>

            {/* Search Type Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Search By"
                name="searchType"
                value={filters.searchType}
                onChange={handleFilterChange}
              >
                <MenuItem value="name">Branch Name</MenuItem>
                <MenuItem value="code">Branch Code</MenuItem>
              </TextField>
            </Grid>

            {/* Search Query Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2.6 }}>
              <TextField
                fullWidth
                size="small"
                label={filters.searchType === 'name' ? 'Branch Name' : 'Branch Code'}
                placeholder={filters.searchType === 'name' ? 'Search by name...' : 'Search by code...'}
                name="searchQuery"
                value={filters.searchQuery}
                onChange={handleFilterChange}
              />
            </Grid>

            {/* City Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="City"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Cities</MenuItem>
                {uniqueCities.map(city => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Dry Launch Date Range */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                type="month"
                fullWidth
                size="small"
                label="Dry Launch Month"
                name="launchMonthYear"
                value={filters.launchMonthYear}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Workflow Status Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Workflow Status"
                name="workflowStatus"
                value={filters.workflowStatus}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="PENDING_APPROVAL">Sent to NSO Team for Approval</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="ON_HOLD">On Hold</MenuItem>
                <MenuItem value="INCOMPLETE_INFORMATION">Incomplete Information</MenuItem>
                <MenuItem value="COMPLIANCE_APPROVED">Compliance Approved</MenuItem>
                <MenuItem value="UPCOMING">Upcoming</MenuItem>
                <MenuItem value="LIVE">Live</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>
            </Grid>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Grid size={{ xs: 12, md: 1 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={handleClearFilters}
                  sx={{ height: 40, borderRadius: '8px', fontWeight: 700 }}
                >
                  Clear
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Stores List Card */}
      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cafe Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expected Sale</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Project Start</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Handover Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dry Launch Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Workflow Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Approved By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No upcoming stores found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const badgeStyle = getStatusChipStyle(store.status);
                  const isStoreApproved = ['NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(store.status);
                  const isStoreEditable = (!isUser && store.status === 'INCOMPLETE_INFORMATION') || (user?.role === 'SUPER_ADMIN' && isStoreApproved);
                  
                  return (
                    <TableRow 
                      key={store.id} 
                      hover={isStoreEditable} 
                      onClick={() => isStoreEditable && navigate(`/stores/${store.id}`, { state: { from: '/upcoming-stores' } })}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 }, 
                        cursor: isStoreEditable ? 'pointer' : 'default' 
                      }}
                    >
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: isStoreEditable ? 'primary.main' : 'text.primary',
                        textDecoration: isStoreEditable ? 'underline' : 'none'
                      }}>
                        {store.cafeCode}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {store.cafeName}
                          {store.isLocked && (
                            <Tooltip title="Store Locked">
                              <LockIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                        {(() => {
                          const city = store.city || '';
                          const zone = store.zone || '';
                          const parts = [];
                          if (city) parts.push(city);
                          if (zone) parts.push(zone);
                          return parts.join(' - ') || 'N/A';
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {store.expectedSales || '—'}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        {formatDateString(store.projectStartDate)}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        {formatDateString(store.projectHandoverDate)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                        {formatDateString(store.tentativeDryLaunchDate)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={
                            store.status === 'LIVE' || store.status === 'COMPLIANCE_APPROVED' ? (
                              <Box 
                                sx={{ 
                                  width: 6, 
                                  height: 6, 
                                  borderRadius: '50%', 
                                  bgcolor: store.status === 'LIVE' ? '#22c55e' : '#f97316',
                                  boxShadow: `0 0 6px ${store.status === 'LIVE' ? '#22c55e' : '#f97316'}`,
                                  ml: '4px !important',
                                  mr: '-2px !important',
                                  animation: 'pulse 1.8s infinite ease-in-out',
                                  '@keyframes pulse': {
                                    '0%': {
                                      transform: 'scale(0.85)',
                                      boxShadow: `0 0 0 0 ${store.status === 'LIVE' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(249, 115, 22, 0.7)'}`
                                    },
                                    '70%': {
                                      transform: 'scale(1.15)',
                                      boxShadow: `0 0 0 5px ${store.status === 'LIVE' ? 'rgba(34, 197, 94, 0)' : 'rgba(249, 115, 22, 0)'}`
                                    },
                                    '100%': {
                                      transform: 'scale(0.85)',
                                      boxShadow: `0 0 0 0 ${store.status === 'LIVE' ? 'rgba(34, 197, 94, 0)' : 'rgba(249, 115, 22, 0)'}`
                                    }
                                  }
                                }} 
                              />
                            ) : undefined
                          }
                          label={
                            store.status === 'PENDING_APPROVAL' ? 'SENT TO NSO TEAM FOR APPROVAL' : 
                            store.status === 'INCOMPLETE_INFORMATION' ? 'INCOMPLETE INFORMATION' : 
                            store.status === 'ON_HOLD' ? 'ON HOLD' : 
                            (store.status === 'APPROVED' || store.status === 'NSO_APPROVED') ? 'AWAITING COMPLIANCE' : 
                            (store.status ? store.status.replace(/_/g, ' ') : '')
                          }
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.725rem',
                            bgcolor: badgeStyle.bgcolor,
                            color: badgeStyle.color,
                            border: '1px solid',
                            borderColor: badgeStyle.borderColor,
                            borderRadius: '6px',
                            px: 0.5,
                            width: 190,
                            justifyContent: 'center'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.825rem', color: 'text.secondary' }}>
                        {store.approvedBy ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.825rem' }}>
                              {store.approvedBy}
                            </Typography>
                            {store.complianceApprovedBy && store.complianceApprovedBy !== store.approvedBy && (
                              <Typography variant="caption" sx={{ color: 'success.main', display: 'block' }}>
                                Compliance: {store.complianceApprovedBy}
                              </Typography>
                            )}
                          </Box>
                        ) : store.complianceApprovedBy ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.825rem' }}>
                            {store.complianceApprovedBy}
                          </Typography>
                        ) : '—'}
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
