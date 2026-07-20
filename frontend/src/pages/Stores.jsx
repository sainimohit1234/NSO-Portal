import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, TextField, Grid, 
  Button, MenuItem, IconButton, Tooltip, Switch, Dialog, DialogTitle, 
  DialogContent, DialogActions, FormControlLabel
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ConstructionIcon from '@mui/icons-material/Construction';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
import CafeJourneyModal from '../components/CafeJourneyModal';

export default function Stores() {
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [selectedGoLiveStore, setSelectedGoLiveStore] = useState(null);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);

    const statusCounts = useMemo(() => {
    const counts = { 'LIVE': 0, 'NEWLY LAUNCHED': 0, 'READY TO GO LIVE': 0, 'PENDING APPROVAL': 0, 'ON HOLD': 0, 'UPCOMING': 0, 'CLOSED': 0 };
    
    const now = new Date();
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearStr = String(now.getFullYear());
    
    stores.forEach(s => {
      let st = s.status ? s.status.toUpperCase() : '';
      if (st === 'READY_TO_GO_LIVE' || st === 'READY TO GO LIVE' || st === 'APPROVED' || st === 'NSO_APPROVED') counts['READY TO GO LIVE'] = (counts['READY TO GO LIVE'] || 0) + 1;
      else if (st === 'PENDING_APPROVAL') counts['PENDING APPROVAL'] = (counts['PENDING APPROVAL'] || 0) + 1;
      else if (st === 'ON_HOLD') counts['ON HOLD'] = (counts['ON HOLD'] || 0) + 1;
      else if (st === 'LIVE' || st === 'UPCOMING' || st === 'CLOSED') counts[st] = (counts[st] || 0) + 1;

      // Check for newly launched
      if (st === 'LIVE') {
        let isNewlyLaunched = false;
        if (s.launchDate) {
          const d = typeof s.launchDate === 'object' && s.launchDate.seconds ? new Date(s.launchDate.seconds * 1000) : new Date(s.launchDate);
          if (d && !isNaN(d.getTime())) {
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
              isNewlyLaunched = true;
            }
          }
        }
        if (!isNewlyLaunched && s.cafeLaunchMonth) {
          const launchStr = s.cafeLaunchMonth.toLowerCase();
          const matchesMonth = launchStr.includes(now.toLocaleString('default', { month: 'long' }).toLowerCase()) || 
                               launchStr.includes(now.toLocaleString('default', { month: 'short' }).toLowerCase()) || 
                               launchStr.includes(currentMonthNum);
          const matchesYear = launchStr.includes(currentYearStr);
          if (matchesMonth && matchesYear) isNewlyLaunched = true;
        }
        if (isNewlyLaunched) {
          counts['NEWLY LAUNCHED'] = (counts['NEWLY LAUNCHED'] || 0) + 1;
        }
      }
    });
    return counts;
  }, [stores]);

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

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.cafeName && s.cafeName.toLowerCase().includes(query)) ||
        (s.cafeCode && s.cafeCode.toLowerCase().includes(query)) ||
        (s.address && s.address.toLowerCase().includes(query)) ||
        (s.city && s.city.toLowerCase().includes(query))
      );
    }

    // Status Filter (from Tiles)
    if (statusFilter) {
      const now = new Date();
      const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
      const currentYearStr = String(now.getFullYear());

      result = result.filter(s => {
        let st = s.status ? s.status.toUpperCase() : '';
        if (statusFilter === 'NEWLY LAUNCHED') {
          if (st !== 'LIVE') return false;
          let isNewlyLaunched = false;
          if (s.launchDate) {
            const d = typeof s.launchDate === 'object' && s.launchDate.seconds ? new Date(s.launchDate.seconds * 1000) : new Date(s.launchDate);
            if (d && !isNaN(d.getTime())) {
              if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                isNewlyLaunched = true;
              }
            }
          }
          if (!isNewlyLaunched && s.cafeLaunchMonth) {
            const launchStr = s.cafeLaunchMonth.toLowerCase();
            const matchesMonth = launchStr.includes(now.toLocaleString('default', { month: 'long' }).toLowerCase()) || 
                                 launchStr.includes(now.toLocaleString('default', { month: 'short' }).toLowerCase()) || 
                                 launchStr.includes(currentMonthNum);
            const matchesYear = launchStr.includes(currentYearStr);
            if (matchesMonth && matchesYear) isNewlyLaunched = true;
          }
          return isNewlyLaunched;
        }
        if (statusFilter === 'READY TO GO LIVE') return st === 'READY_TO_GO_LIVE' || st === 'READY TO GO LIVE' || st === 'APPROVED' || st === 'NSO_APPROVED';
        if (statusFilter === 'PENDING APPROVAL') return st === 'PENDING_APPROVAL';
        if (statusFilter === 'ON HOLD') return st === 'ON_HOLD';
        return st === statusFilter;
      });
    }

    const sortedResult = sortStoresByCurrentStatus(result);
    setFilteredStores(sortedResult);
  }, [searchQuery, statusFilter, stores]);

  

  

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
      <Card sx={{ mb: 2, overflow: 'hidden', bgcolor: '#0f2942' }}>
        <CardContent sx={{ p: '14px 20px !important', position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              top: -72,
              right: -24,
              width: { xs: 180, md: 240 },
              height: { xs: 180, md: 240 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(111,205,220,0.15) 0%, rgba(111,205,220,0) 70%)'
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, position: 'relative' }}>
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                STORE DIRECTORY
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', fontSize: { xs: '1.4rem', md: '1.75rem', lg: '1.9rem' } }}>
                  All Stores
                </Typography>
                <Chip 
                  label={`${filteredStores.length} ${filteredStores.length === 1 ? 'Store' : 'Stores'}`} 
                  sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.15)', color: '#ffffff' }} 
                  size="small" 
                />
              </Box>
              <Typography variant="body2" sx={{ maxWidth: 680, fontSize: { xs: '0.8rem', md: '0.84rem' }, color: 'rgba(255,255,255,0.8)' }}>
                Manage, search, and view all registered cafes and kitchen locations.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, mt: -0.5 }}>
              <Button
                variant="contained"
                onClick={() => setIsJourneyModalOpen(true)}
                sx={{
                  bgcolor: '#6fccdc',
                  color: '#0f2942',
                  px: 3,
                  py: 0.75,
                  width: '150px',
                  borderRadius: '999px',
                  textTransform: 'none',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px 0 rgba(111,205,220,0.3)',
                  '&:hover': { bgcolor: '#5ebbc9', boxShadow: '0 6px 20px 0 rgba(111,205,220,0.4)' }
                }}
              >
                Cafe Journey
              </Button>
              <TextField
                placeholder="Search stores..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                  sx: { borderRadius: '999px', bgcolor: '#ffffff', height: '40px', '& fieldset': { border: 'none' } }
                }}
                sx={{ width: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Status Tiles */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, mb: 2 }}>
        <Box sx={{ flexGrow: 1, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 3 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, minWidth: 'max-content' }}>
            {[
              { label: 'LIVE', color: '#10b981', icon: <StorefrontIcon /> },
              { label: 'NEWLY LAUNCHED', color: '#ec4899', icon: <RocketLaunchIcon /> },
              { label: 'UPCOMING', color: '#0ea5e9', icon: <ConstructionIcon /> },
              { label: 'READY TO GO LIVE', color: '#f97316', icon: <CheckCircleIcon /> },
              { label: 'PENDING APPROVAL', color: '#8b5cf6', icon: <HourglassEmptyIcon /> },
              { label: 'ON HOLD', color: '#ef4444', icon: <PauseCircleIcon /> },
              { label: 'CLOSED', color: '#64748b', icon: <CancelIcon /> }
            ].map(s => {
              const isActive = statusFilter === s.label;
              return (
                  <Card 
                  key={s.label}
                  onClick={() => setStatusFilter(isActive ? null : s.label)}
                  sx={{
                    flex: '1 1 0',
                    minWidth: 150,
                    maxWidth: 220,
                    flexShrink: 0,
                    background: isActive ? s.color : `linear-gradient(135deg, #ffffff, ${s.color}15)`,
                    color: isActive ? '#ffffff' : 'inherit',
                    borderRadius: '16px',
                    border: isActive ? 'none' : '1px solid',
                    borderColor: isActive ? 'transparent' : `${s.color}40`,
                    boxShadow: isActive 
                      ? `0 6px 16px ${s.color}60`
                      : '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: statusFilter !== null && !isActive ? 0.5 : 1,
                    transform: isActive ? 'scale(1.02)' : 'none',
                    '&:hover': {
                      transform: isActive ? 'scale(1.02) translateY(-2px)' : 'translateY(-3px)',
                      boxShadow: isActive 
                        ? `0 10px 20px ${s.color}70`
                        : `0 6px 12px ${s.color}30`,
                      background: isActive ? s.color : `linear-gradient(135deg, #ffffff, ${s.color}25)`,
                      borderColor: isActive ? 'transparent' : s.color,
                    }
                  }}
                >
                  <CardContent sx={{ p: '12px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box 
                        sx={{ 
                          p: 0.8, 
                          borderRadius: '10px', 
                          bgcolor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${s.color}12`,
                          color: isActive ? '#ffffff' : s.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {s.icon}
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: isActive ? '#ffffff' : 'text.primary' }}>
                        {statusCounts[s.label] || 0}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'text.secondary', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.label}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      </Box>

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

                <TableCell sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Integration Status</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap', px: 1, py: 1, fontSize: '0.75rem' }}>Locked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10 + (isSuperAdmin ? 1 : 0)} align="center" sx={{ py: 6, color: 'text.secondary' }}>
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
                          disabled={!isSuperAdmin || (!store.isLocked && store.status !== 'LIVE' && store.status !== 'Live')}
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

      {selectedGoLiveStore && (
        <GoLiveDialog
          open={goLiveDialogOpen}
          onClose={() => {
            setGoLiveDialogOpen(false);
            setSelectedGoLiveStore(null);
          }}
          store={selectedGoLiveStore}
          onSuccess={(updatedStore) => {
            setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
            setFilteredStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
          }}
        />
      )}
      <CafeJourneyModal 
        open={isJourneyModalOpen} 
        onClose={() => setIsJourneyModalOpen(false)} 
      />
    </Box>
  );
}
