import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, TextField, Grid, 
  Button, MenuItem, IconButton, Tooltip, Switch, Dialog, DialogTitle, 
  DialogContent, DialogActions, FormControlLabel
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { 
  getCurrentStatus, 
  getCurrentStatusDotColor, 
  getCurrentStatusChipStyle, 
  getStatusRgb, 
  sortStoresByCurrentStatus,
  computeIntegrationStatus
} from '../utils/status';
import GoLiveDialog from '../components/GoLiveDialog';

export default function Stores() {
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [selectedGoLiveStore, setSelectedGoLiveStore] = useState(null);

  const getCurrentMonthValue = () => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0');
  };


  const MONTHS = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val === 'object') {
      if (val.seconds !== undefined) return new Date(val.seconds * 1000);
      if (typeof val.toDate === 'function') return val.toDate();
      return null;
    }
    return new Date(val);
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = parseDate(dateStr);
      if (!d || isNaN(d.getTime())) {
        return typeof dateStr === 'object' ? '—' : String(dateStr);
      }
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return typeof dateStr === 'object' ? '—' : String(dateStr);
    }
  };

  const getDayCount = (liveDateStr, closureDateStr, isLive, isClosed) => {
    if (!liveDateStr) return '—';
    const liveDate = parseDate(liveDateStr);
    if (!liveDate || isNaN(liveDate.getTime())) return '—';
    
    let endDate;
    if (isClosed && closureDateStr) {
      endDate = parseDate(closureDateStr);
    } else if (isLive) {
      endDate = new Date();
    } else {
      return '—';
    }

    if (!endDate || isNaN(endDate.getTime())) return '—';
    
    const diffTime = endDate.getTime() - liveDate.getTime();
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    return `${diffDays} Day${diffDays === 1 ? '' : 's'}`;
  };

  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [filters, setFilters] = useState({ 
    brand: '',
    searchType: 'name',
    searchQuery: '',
    expiryType: '', 
    expiryMonth: getCurrentMonthValue(), 
    mailStatus: '',
    launchStatusType: '',
    launchMonthYear: ''
  });

  const hasActiveFilters = !!(
    filters.brand ||
    (filters.searchQuery || '').trim() ||
    filters.expiryType ||
    filters.mailStatus ||
    filters.launchStatusType ||
    filters.launchMonthYear
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasGoLiveAccess = user?.permissions?.includes('GO_LIVE') || isSuperAdmin;

  useEffect(() => {
    fetchStoresFromFirestore()
      .then(firestoreStores => {
        setStores(firestoreStores);
        setFilteredStores(firestoreStores);
      })
      .catch(async err => {
        console.error('Failed to load stores from Firestore, falling back to API:', err);
        try {
          const res = await axios.get('/api/stores');
          const normalizedStores = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          setStores(normalizedStores);
          setFilteredStores(normalizedStores);
        } catch (apiError) {
          console.error(apiError);
        }
      });
  }, []);

  const handleToggleLock = async (storeId, newLockedState) => {
    try {
      await axios.put(`/api/stores/${storeId}`, { isLocked: newLockedState });
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isLocked: newLockedState } : s));
      setFilteredStores(prev => prev.map(s => s.id === storeId ? { ...s, isLocked: newLockedState } : s));
    } catch (err) {
      console.error('Failed to toggle lock state:', err);
      alert(err.response?.data?.error || 'Failed to toggle lock state.');
    }
  };

  const handleChangeStatus = async (storeId, newStatus, additionalData = {}) => {
    try {
      await axios.put(`/api/stores/${storeId}`, { status: newStatus, ...additionalData });
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, status: newStatus, ...additionalData } : s));
      setFilteredStores(prev => prev.map(s => s.id === storeId ? { ...s, status: newStatus, ...additionalData } : s));
    } catch (err) {
      console.error('Failed to change status:', err);
      alert(err.response?.data?.error || 'Failed to change status.');
    }
  };

  useEffect(() => {
    let result = stores;

    // Filter out inactive stores (isActive is false)
    // Removed to show all stores

    // Brand Filter
    if (filters.brand) {
      result = result.filter(s => {
        if (filters.brand === 'BLUE_TOKAI_SUCHALI') {
          // include legacy records with null/empty brand
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

    // Expiry Month Filter
    if (filters.expiryType && filters.expiryMonth) {
      if (filters.expiryType === 'fssai') {
        result = result.filter(s => {
          if (!s.fssaiExpiry) return false;
          const fssaiStr = typeof s.fssaiExpiry === 'string' ? s.fssaiExpiry : (s.fssaiExpiry?.seconds ? new Date(s.fssaiExpiry.seconds * 1000).toISOString().split('T')[0] : '');
          if (!fssaiStr) return false;
          const parts = fssaiStr.split('-');
          return parts.length >= 2 && parts[1] === filters.expiryMonth;
        });
      } else if (filters.expiryType === 'rent') {
        result = result.filter(s => {
          if (!s.rentExpiry) return false;
          const rentStr = typeof s.rentExpiry === 'string' ? s.rentExpiry : (s.rentExpiry?.seconds ? new Date(s.rentExpiry.seconds * 1000).toISOString().split('T')[0] : '');
          if (!rentStr) return false;
          const parts = rentStr.split('-');
          return parts.length >= 2 && parts[1] === filters.expiryMonth;
        });
      }
    }

    // Launch & Status Filter
    if (filters.launchStatusType) {
      if (filters.launchStatusType === 'newly_launched') {
        const now = new Date();
        const currentMonthName = now.toLocaleString('default', { month: 'long' }).toLowerCase();
        const currentMonthShort = now.toLocaleString('default', { month: 'short' }).toLowerCase();
        const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
        const currentYearStr = String(now.getFullYear());

        result = result.filter(s => {
          if (s.status !== 'LIVE') return false;
          if (s.launchDate) {
            const launchDateObj = parseDate(s.launchDate);
            if (launchDateObj && !isNaN(launchDateObj.getTime())) {
              return launchDateObj.getMonth() === now.getMonth() && 
                     launchDateObj.getFullYear() === now.getFullYear();
            }
          }
          if (s.cafeLaunchMonth) {
            const launchStr = s.cafeLaunchMonth.toLowerCase();
            const matchesMonth = launchStr.includes(currentMonthName) || 
                                 launchStr.includes(currentMonthShort) || 
                                 launchStr.includes(currentMonthNum);
            const matchesYear = launchStr.includes(currentYearStr);
            return matchesMonth && matchesYear;
          }
          return false;
        });
      } else {
        if (filters.launchStatusType === 'live') {
          result = result.filter(s => s.status === 'LIVE');
        } else if (filters.launchStatusType === 'upcoming') {
          result = result.filter(s => s.status === 'UPCOMING' || s.status === 'Upcoming');
        } else if (filters.launchStatusType === 'closed') {
          result = result.filter(s => s.status === 'CLOSED' || s.status === 'Closed');
        } else if (filters.launchStatusType === 'approved') {
          result = result.filter(s => s.status === 'APPROVED' || s.status === 'NSO_APPROVED');
        } else if (filters.launchStatusType === 'pending_approval') {
          result = result.filter(s => s.status === 'PENDING_APPROVAL');
        } else if (filters.launchStatusType === 'on_hold') {
          result = result.filter(s => s.status === 'ON_HOLD');
        }

        // Apply Range Month & Year filter if set
        if (filters.launchMonthYear) {
          const [year, month] = filters.launchMonthYear.split('-');
          const monthNum = parseInt(month, 10);
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june', 
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const monthLabel = monthNames[monthNum - 1];
          const monthLabelShort = monthLabel.substring(0, 3);

          result = result.filter(s => {
            if (s.launchDate) {
              const d = parseDate(s.launchDate);
              if (d && !isNaN(d.getTime())) {
                return d.getFullYear() === parseInt(year, 10) && (d.getMonth() + 1) === monthNum;
              }
            }
            if (!s.cafeLaunchMonth) return false;
            const launchStr = s.cafeLaunchMonth.toLowerCase();
            const matchesMonth = launchStr.includes(monthLabel) || 
                                 launchStr.includes(monthLabelShort) || 
                                 launchStr.includes(month);
            const matchesYear = launchStr.includes(year);
            return matchesMonth && matchesYear;
          });
        }
      }
    }

    // Integration Status Filter
    if (filters.integrationStatus) {
      result = result.filter(s => {
        const intStatus = computeIntegrationStatus(s);
        if (filters.integrationStatus === 'Integration Completed') return intStatus.label === 'Integration Completed';
        if (filters.integrationStatus === 'Pending') return intStatus.label === 'Pending';
        if (filters.integrationStatus === 'Mail Sent') return intStatus.label.startsWith('Mail Sent') || intStatus.label.startsWith('Follow-up');
        if (filters.integrationStatus === 'Needs Follow-up') return intStatus.label.startsWith('Needs Follow-up');
        return true;
      });
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
      expiryType: '', 
      expiryMonth: getCurrentMonthValue(), 
      integrationStatus: '',
      launchStatusType: '',
      launchMonthYear: ''
    });
  };

  const getStatusChipStyle = (status) => {
    switch(status) {
      case 'LIVE':
        return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', borderColor: 'rgba(34, 197, 94, 0.3)' };   // Green
      case 'APPROVED':
      case 'NSO_APPROVED':
        return { bgcolor: 'rgba(234, 179, 8, 0.12)', color: '#a16207', borderColor: 'rgba(234, 179, 8, 0.35)' };  // Yellow
      case 'READY_TO_GO_LIVE':
        return { bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', borderColor: 'rgba(249, 115, 22, 0.3)' }; // Orange
      case 'PENDING_APPROVAL':
        return { bgcolor: '#f1f3f4', color: '#5f6368', borderColor: '#dadce0' }; // Match Under Construction
      case 'ON_HOLD':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };   // Red

        return { bgcolor: 'rgba(100, 116, 139, 0.10)', color: '#475569', borderColor: 'rgba(100, 116, 139, 0.25)' }; // Grey
      case 'UPCOMING':
        return { bgcolor: '#e0f7fa', color: '#006064', borderColor: '#b2ebf2' };
      case 'CLOSED':
        return { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' };
      case 'REJECTED':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bgcolor: '#f1f3f4', color: '#5f6368', borderColor: '#dadce0' };
    }
  };




  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
              All Stores
            </Typography>
            <Chip 
              label={`${filteredStores.length} ${filteredStores.length === 1 ? 'Store' : 'Stores'}`} 
              color="primary" 
              size="small" 
              sx={{ fontWeight: 700 }} 
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage, search, and view all registered cafes and kitchen locations.
          </Typography>
        </Box>
      </Box>

      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Filter Stores</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            {/* Brand Filter */}
            <TextField
              select
              size="small"
              label="Brand"
              name="brand"
              value={filters.brand}
              onChange={handleFilterChange}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Brands</MenuItem>
              <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's</MenuItem>
              <MenuItem value="GOT_TEA">Got Tea</MenuItem>
            </TextField>

            {/* Search By Dropdown */}
            <TextField
              select
              size="small"
              label="Search By"
              name="searchType"
              value={filters.searchType}
              onChange={handleFilterChange}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="name">Branch Name</MenuItem>
              <MenuItem value="code">Branch Code</MenuItem>
            </TextField>

            {/* Search Input */}
            <TextField
              size="small"
              label={filters.searchType === 'name' ? 'Branch Name' : 'Branch Code'}
              placeholder={filters.searchType === 'name' ? 'Search by name...' : 'Search by code...'}
              name="searchQuery"
              value={filters.searchQuery}
              onChange={handleFilterChange}
              sx={{ minWidth: 200 }}
            />

            {/* Integration Status filter */}
            <TextField
              select
              size="small"
              label="Integration Status"
              name="integrationStatus"
              value={filters.integrationStatus || ''}
              onChange={handleFilterChange}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Integration Completed">Integration Completed</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Mail Sent">Mail Sent</MenuItem>
              <MenuItem value="Needs Follow-up">Needs Follow-up with S/Z</MenuItem>
            </TextField>

            {/* Filter Expiries */}
            <TextField
              select
              size="small"
              label="Filter Expiries"
              name="expiryType"
              value={filters.expiryType}
              onChange={handleFilterChange}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">None (All Data)</MenuItem>
              <MenuItem value="fssai">FSSAI Expiry</MenuItem>
              <MenuItem value="rent">Rent Expiry</MenuItem>
            </TextField>

            {/* Expiry Month */}
            <TextField
              select
              size="small"
              label="Expiry Month"
              name="expiryMonth"
              value={filters.expiryMonth}
              onChange={handleFilterChange}
              disabled={!filters.expiryType}
              sx={{ minWidth: 150 }}
            >
              {MONTHS.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>

            {/* Store Status */}
            <TextField
              select
              size="small"
              label="Store Status"
              name="launchStatusType"
              value={filters.launchStatusType}
              onChange={handleFilterChange}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">None (All Data)</MenuItem>
              <MenuItem value="newly_launched">Newly Launch Stores</MenuItem>
              <MenuItem value="live">Live Stores</MenuItem>
              <MenuItem value="approved">Approved Stores</MenuItem>
              <MenuItem value="pending_approval">Sent to NSO Team for Approval</MenuItem>

              <MenuItem value="on_hold">On Hold Stores</MenuItem>
              <MenuItem value="upcoming">Upcoming Stores</MenuItem>
              <MenuItem value="closed">Closed Stores</MenuItem>
            </TextField>

            {/* Launch Month & Year Range */}
            <TextField
              type="month"
              size="small"
              label="Launch Month & Year"
              name="launchMonthYear"
              value={filters.launchMonthYear}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              disabled={!['live', 'upcoming', 'closed', 'approved', 'pending_approval', 'on_hold'].includes(filters.launchStatusType)}
              sx={{ minWidth: 190 }}
            />

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleClearFilters}
                sx={{ height: 40, borderRadius: '8px', fontWeight: 700, minWidth: 90 }}
              >
                Clear
              </Button>
            )}
          </Box>

        </CardContent>
      </Card>

      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Brand</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Current Status</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Cafe Code</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Cafe Name</TableCell>
                <TableCell sx={{ px: 1, py: 1, fontSize: '0.75rem', minWidth: 150 }}>Address</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Status</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Live Date</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Closure Date</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Day Count</TableCell>
                {filters.expiryType === 'fssai' && <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>FSSAI Expiry</TableCell>}
                {filters.expiryType === 'rent' && <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Rent Expiry</TableCell>}
                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Integration Status</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Locked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10 + (filters.expiryType ? 1 : 0) + (isSuperAdmin ? 1 : 0)} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No stores found. Create a new store to get started!
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const badgeStyle = getStatusChipStyle(store.status);
                  const intStatus = computeIntegrationStatus(store);
                  const currentStatusVal = getCurrentStatus(store);
                  const currentStatusColor = getCurrentStatusDotColor(currentStatusVal);
                  const currentStatusRgb = getStatusRgb(currentStatusVal);
                  const animName = `pulse-${currentStatusVal.replace(/\s+/g, '-').toLowerCase()}`;

                  return (
                    <TableRow 
                      key={store.id} 
                      hover 
                      onClick={() => navigate(`/stores/${store.id}`, { state: { from: '/stores' } })}
                      sx={{ 
                        '&:last-child td, &:last-child th': { borderBottom: 0 }, 
                        cursor: 'pointer' 
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        {store.brand === 'BLUE_TOKAI_SUCHALI' ? "Blue Tokai / Suchali's" : store.brand === 'GOT_TEA' ? 'Got Tea' : (store.brand || '—')}
                      </TableCell>
                      <TableCell sx={{ px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        <Chip 
                          icon={
                            <Box 
                              sx={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                bgcolor: currentStatusColor,
                                ml: '4px !important',
                                mr: '-2px !important',
                                boxShadow: `0 0 6px ${currentStatusColor}`,
                                animation: `${animName} 1.8s infinite ease-in-out`,
                                [`@keyframes ${animName}`]: {
                                  '0%': {
                                    transform: 'scale(0.85)',
                                    boxShadow: `0 0 0 0 rgba(${currentStatusRgb}, 0.7)`
                                  },
                                  '70%': {
                                    transform: 'scale(1.15)',
                                    boxShadow: `0 0 0 5px rgba(${currentStatusRgb}, 0)`
                                  },
                                  '100%': {
                                    transform: 'scale(0.85)',
                                    boxShadow: `0 0 0 0 rgba(${currentStatusRgb}, 0)`
                                  }
                                }
                              }} 
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span>{currentStatusVal}</span>
                              {store.inStoreLive && !store.inStoreClosed && (
                                <Tooltip title="In-Store Live">
                                  <Box 
                                    sx={{ 
                                      width: 8, 
                                      height: 8, 
                                      borderRadius: '50%', 
                                      bgcolor: '#22c55e',
                                      boxShadow: '0 0 6px #22c55e',
                                      animation: 'pulse-live-green-current 1.8s infinite ease-in-out',
                                      '@keyframes pulse-live-green-current': {
                                        '0%': { transform: 'scale(0.85)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
                                        '70%': { transform: 'scale(1.15)', boxShadow: '0 0 0 5px rgba(34, 197, 94, 0)' },
                                        '100%': { transform: 'scale(0.85)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' }
                                      }
                                    }} 
                                  />
                                </Tooltip>
                              )}
                              {store.deliveryLive && !store.deliveryClosed && (
                                <Tooltip title="Delivery Live">
                                  <Box 
                                    sx={{ 
                                      width: 8, 
                                      height: 8, 
                                      borderRadius: '50%', 
                                      bgcolor: '#f97316',
                                      boxShadow: '0 0 6px #f97316',
                                      animation: 'pulse-live-orange-current 1.8s infinite ease-in-out',
                                      '@keyframes pulse-live-orange-current': {
                                        '0%': { transform: 'scale(0.85)', boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.7)' },
                                        '70%': { transform: 'scale(1.15)', boxShadow: '0 0 0 5px rgba(249, 115, 22, 0)' },
                                        '100%': { transform: 'scale(0.85)', boxShadow: '0 0 0 0 rgba(249, 115, 22, 0)' }
                                      }
                                    }} 
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          }
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.7rem',
                            bgcolor: getCurrentStatusChipStyle(currentStatusVal).bgcolor,
                            color: getCurrentStatusChipStyle(currentStatusVal).color,
                            border: '1px solid',
                            borderColor: getCurrentStatusChipStyle(currentStatusVal).borderColor,
                            borderRadius: '6px',
                            px: 0.25,
                            width: 140,
                            justifyContent: 'center'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.75rem', px: 1, py: 0.75, whiteSpace: 'nowrap' }}>{store.cafeCode}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.75rem', px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {store.cafeName}
                          {store.isLocked && (
                            <Tooltip title="Store Locked">
                              <LockIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600, px: 1, py: 0.75, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                      <TableCell onClick={(e) => e.stopPropagation()} sx={{ px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        {((store.status === 'APPROVED' || store.status === 'NSO_APPROVED' || store.status === 'READY_TO_GO_LIVE') && hasGoLiveAccess) ? (
                          <TextField
                            select
                            size="small"
                            value="READY_TO_GO_LIVE"
                            onChange={(e) => {
                              if (e.target.value === 'LIVE') {
                                setSelectedGoLiveStore(store);
                                setGoLiveDialogOpen(true);
                              }
                            }}
                            sx={{ 
                              width: 140,
                              '& .MuiOutlinedInput-root': { 
                                height: 26, 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                borderRadius: '6px',
                                bgcolor: badgeStyle.bgcolor,
                                color: badgeStyle.color,
                                '& fieldset': {
                                  borderColor: badgeStyle.borderColor,
                                },
                                '&:hover fieldset': {
                                  borderColor: badgeStyle.borderColor,
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: badgeStyle.borderColor,
                                }
                              },
                              '& .MuiSelect-select': { 
                                py: 0.25, 
                                px: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }
                            }}
                          >
                            <MenuItem value="READY_TO_GO_LIVE" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>Ready to Go Live</MenuItem>
                            <MenuItem value="LIVE" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e' }}>Live</MenuItem>
                          </TextField>
                        ) : (
                          <Chip 
                            icon={
                              store.status === 'LIVE' || store.status === 'READY_TO_GO_LIVE' ? (
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
                              store.status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : 
                              (store.status === 'APPROVED' || store.status === 'NSO_APPROVED') ? 'Ready to Go Live' :
                              (store.status ? store.status.replace(/_/g, ' ') : '')
                            }
                            size="small" 
                            onClick={(store.status === 'LIVE' || store.status === 'CLOSED') && hasGoLiveAccess ? () => {
                              setSelectedGoLiveStore(store);
                              setGoLiveDialogOpen(true);
                            } : undefined}
                            sx={{ 
                              cursor: ((store.status === 'LIVE' || store.status === 'CLOSED') && hasGoLiveAccess) ? 'pointer' : 'default',
                              fontWeight: 700, 
                              fontSize: '0.7rem',
                              bgcolor: badgeStyle.bgcolor,
                              color: badgeStyle.color,
                              border: '1px solid',
                              borderColor: badgeStyle.borderColor,
                              borderRadius: '6px',
                              px: 0.25,
                              width: 140,
                              justifyContent: 'center'
                            }} 
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {store.inStoreLive && (
                            <Box sx={{ color: 'text.secondary' }}>
                              <span style={{ fontWeight: 800 }}>In-Store:</span> {formatDateString(store.inStoreLiveDate)}
                            </Box>
                          )}
                          {store.deliveryLive && (
                            <Box sx={{ color: 'text.secondary' }}>
                              <span style={{ fontWeight: 800 }}>Delivery:</span> {formatDateString(store.deliveryLiveDate)}
                            </Box>
                          )}
                          {!store.inStoreLive && !store.deliveryLive && '—'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {store.inStoreClosed && (
                            <Box sx={{ color: 'text.secondary' }}>
                              <span style={{ fontWeight: 800 }}>In-Store:</span> {formatDateString(store.inStoreClosedDate)}
                            </Box>
                          )}
                          {store.deliveryClosed && (
                            <Box sx={{ color: 'text.secondary' }}>
                              <span style={{ fontWeight: 800 }}>Delivery:</span> {formatDateString(store.deliveryClosedDate)}
                            </Box>
                          )}
                          {!store.inStoreClosed && !store.deliveryClosed && '—'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ color: 'text.secondary' }}>
                            <span style={{ fontWeight: 800 }}>In-Store:</span> {getDayCount(store.inStoreLiveDate, store.inStoreClosedDate, store.inStoreLive, store.inStoreClosed)}
                          </Box>
                          <Box sx={{ color: 'text.secondary' }}>
                            <span style={{ fontWeight: 800 }}>Delivery:</span> {getDayCount(store.deliveryLiveDate, store.deliveryClosedDate, store.deliveryLive, store.deliveryClosed)}
                          </Box>
                        </Box>
                      </TableCell>
                      {filters.expiryType === 'fssai' && (
                        <TableCell sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.75rem', px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                          {formatDateString(store.fssaiExpiry)}
                        </TableCell>
                      )}
                      {filters.expiryType === 'rent' && (
                        <TableCell sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.75rem', px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                          {formatDateString(store.rentExpiry)}
                        </TableCell>
                      )}
                      <TableCell sx={{ px: 1, py: 0.75, whiteSpace: 'nowrap' }}>
                        <Chip 
                          label={intStatus.label} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.7rem',
                            bgcolor: intStatus.bg,
                            color: intStatus.color,
                            border: '1px solid',
                            borderColor: intStatus.border,
                            borderRadius: '6px',
                            px: 0.5,
                            width: 140,
                            justifyContent: 'center'
                          }} 
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ px: 1, py: 0.75, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={store.isLocked || false}
                          onChange={(e) => handleToggleLock(store.id, e.target.checked)}
                          disabled={!isSuperAdmin}
                          color="success"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <GoLiveDialog 
        open={goLiveDialogOpen}
        onClose={() => {
          setGoLiveDialogOpen(false);
          setSelectedGoLiveStore(null);
        }}
        store={selectedGoLiveStore}
        onSave={async (payload) => {
          if (selectedGoLiveStore) {
            await handleChangeStatus(selectedGoLiveStore.id, 'LIVE', payload);
            setGoLiveDialogOpen(false);
            setSelectedGoLiveStore(null);
          }
        }}
      />
    </Box>
  );
}
