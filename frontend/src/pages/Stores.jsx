import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, TextField,
  Button, MenuItem, Tooltip, Switch
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { getCurrentStatus, getCurrentStatusDotColor, getCurrentStatusChipStyle, getStatusRgb, sortStoresByCurrentStatus } from '../utils/status';

export default function Stores() {
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

  useEffect(() => {
    let result = stores;

    // Filter out inactive stores (isActive is false)
    result = result.filter(s => s.isActive !== false && s.isActive !== 'false');

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
        } else if (filters.launchStatusType === 'incomplete_information') {
          result = result.filter(s => s.status === 'INCOMPLETE_INFORMATION');
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

    // Mail Status Filter
    if (filters.mailStatus) {
      result = result.filter(s => (s.mailStatus || 'Pending for S/Z') === filters.mailStatus);
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
      mailStatus: '',
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
      case 'COMPLIANCE_APPROVED':
      case 'PENDING_APPROVAL':
        return { bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', borderColor: 'rgba(249, 115, 22, 0.3)' }; // Orange
      case 'ON_HOLD':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };   // Red
      case 'INCOMPLETE_INFORMATION':
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

  const getMailStatusChipStyle = (status) => {
    switch(status) {
      case 'Mail sent':
        return { bgcolor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' };
      case 'Pending for S/Z':
      default:
        return { bgcolor: '#fef7e0', color: '#b06000', borderColor: '#feebc8' };
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
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>Filter Stores</Typography>
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

            {/* Mail Status filter — Super Admin only */}
            {isSuperAdmin && (
              <TextField
                select
                size="small"
                label="Mail Status"
                name="mailStatus"
                value={filters.mailStatus}
                onChange={handleFilterChange}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Pending for S/Z">Pending for S/Z</MenuItem>
                <MenuItem value="Mail sent">Mail sent</MenuItem>
              </TextField>
            )}

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
              <MenuItem value="incomplete_information">Incomplete Information Stores</MenuItem>
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
              disabled={!['live', 'upcoming', 'closed', 'approved', 'pending_approval', 'incomplete_information', 'on_hold'].includes(filters.launchStatusType)}
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
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Current Status</TableCell>
                <TableCell>Cafe Code</TableCell>
                <TableCell>Cafe Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Live Date</TableCell>
                <TableCell>Closure Date</TableCell>
                <TableCell>Day Count</TableCell>
                {filters.expiryType === 'fssai' && <TableCell>FSSAI Expiry</TableCell>}
                {filters.expiryType === 'rent' && <TableCell>Rent Expiry</TableCell>}
                {isSuperAdmin && <TableCell>Mail Status</TableCell>}
                <TableCell align="center">Locked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9 + (filters.expiryType ? 1 : 0) + (isSuperAdmin ? 1 : 0)} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No stores found. Create a new store to get started!
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const badgeStyle = getStatusChipStyle(store.status);
                  const mailBadgeStyle = getMailStatusChipStyle(store.mailStatus);
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
                      <TableCell>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
                            fontSize: '0.75rem',
                            bgcolor: getCurrentStatusChipStyle(currentStatusVal).bgcolor,
                            color: getCurrentStatusChipStyle(currentStatusVal).color,
                            border: '1px solid',
                            borderColor: getCurrentStatusChipStyle(currentStatusVal).borderColor,
                            borderRadius: '6px',
                            px: 0.5,
                            width: 190,
                            justifyContent: 'center'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{store.cafeCode}</TableCell>
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
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem', fontWeight: 800 }}>
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
                            store.status === 'PENDING_APPROVAL' ? 'APPROVAL PENDING' : 
                            store.status === 'INCOMPLETE_INFORMATION' ? 'INCOMPLETE INFORMATION' : 
                            store.status === 'ON_HOLD' ? 'ON HOLD' : 
                            (store.status === 'APPROVED' || store.status === 'NSO_APPROVED') ? 'APPROVED' : 
                            (store.status ? store.status.replace(/_/g, ' ') : '')
                          }
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.75rem',
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

                      <TableCell sx={{ fontSize: '0.825rem', fontWeight: 800 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {store.inStoreLive && (
                            <Box sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 800 }}>In-Store:</span> {formatDateString(store.inStoreLiveDate)}
                            </Box>
                          )}
                          {store.deliveryLive && (
                            <Box sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 800 }}>Delivery:</span> {formatDateString(store.deliveryLiveDate)}
                            </Box>
                          )}
                          {!store.inStoreLive && !store.deliveryLive && '—'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.825rem', fontWeight: 800 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {store.inStoreClosed && (
                            <Box sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 800 }}>In-Store:</span> {formatDateString(store.inStoreClosedDate)}
                            </Box>
                          )}
                          {store.deliveryClosed && (
                            <Box sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 800 }}>Delivery:</span> {formatDateString(store.deliveryClosedDate)}
                            </Box>
                          )}
                          {!store.inStoreClosed && !store.deliveryClosed && '—'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.825rem', fontWeight: 800 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800 }}>In-Store:</span> {getDayCount(store.inStoreLiveDate, store.inStoreClosedDate, store.inStoreLive, store.inStoreClosed)}
                          </Box>
                          <Box sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800 }}>Delivery:</span> {getDayCount(store.deliveryLiveDate, store.deliveryClosedDate, store.deliveryLive, store.deliveryClosed)}
                          </Box>
                        </Box>
                      </TableCell>
                      {filters.expiryType === 'fssai' && (
                        <TableCell sx={{ fontWeight: 800, color: 'error.main' }}>
                          {formatDateString(store.fssaiExpiry)}
                        </TableCell>
                      )}
                      {filters.expiryType === 'rent' && (
                        <TableCell sx={{ fontWeight: 800, color: 'error.main' }}>
                          {formatDateString(store.rentExpiry)}
                        </TableCell>
                      )}
                      {isSuperAdmin && (
                        <TableCell>
                          {store.status !== 'REJECTED' ? (
                            <Chip 
                              label={store.mailStatus || 'Pending for S/Z'} 
                              size="small" 
                              sx={{ 
                                fontWeight: 700, 
                                fontSize: '0.75rem',
                                bgcolor: mailBadgeStyle.bgcolor,
                                color: mailBadgeStyle.color,
                                border: '1px solid',
                                borderColor: mailBadgeStyle.borderColor,
                                borderRadius: '6px',
                                px: 0.5
                              }} 
                            />
                          ) : (
                            ''
                          )}
                        </TableCell>
                      )}
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={store.isLocked}
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
    </Box>
  );
}
