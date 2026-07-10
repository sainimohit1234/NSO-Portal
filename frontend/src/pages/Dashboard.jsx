import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, TextField,
  Chip, useTheme, IconButton, InputAdornment, Select, MenuItem
} from '@mui/material';
import FullScreenLoader from '../components/FullScreenLoader';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Storefront from '@mui/icons-material/Storefront';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import People from '@mui/icons-material/People';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Upcoming from '@mui/icons-material/Upcoming';
import Cancel from '@mui/icons-material/Cancel';
import TaskAlt from '@mui/icons-material/TaskAlt';
import LocationCity from '@mui/icons-material/LocationCity';
import MapIcon from '@mui/icons-material/Map';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DashboardStoreDetailsModal from '../components/DashboardStoreDetailsModal';
import axios from '../utils/api';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { getCurrentStatus } from '../utils/status';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const theme = useTheme();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityHeadSearch, setCityHeadSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [activeModalTile, setActiveModalTile] = useState(null);

  useEffect(() => {
    fetchStoresFromFirestore()
      .then(firestoreStores => {
        console.log('[Dashboard] Loaded stores from Firestore.', {
          count: firestoreStores.length
        });
        setStores(firestoreStores);
        setLoading(false);
      })
      .catch(async err => {
        console.error('Failed to fetch stores from Firestore, falling back to API:', err);
        try {
          const res = await axios.get('/api/stores');
          const normalizedStores = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          setStores(normalizedStores);
        } catch (apiError) {
          console.error('Failed to fetch stores:', apiError);
        } finally {
          setLoading(false);
        }
      });
  }, []);

  // Only count active stores in dashboard stats, excluding test models
  const filteredStores = useMemo(() => {
    return stores.filter(s => 
      s.isActive !== false && 
      s.isActive !== 'false' && 
      String(s.cafeModule || s.cafeModel || '').toLowerCase() !== 'test'
    );
  }, [stores]);

  // Helpers for Expired/Expiring soon logic

  const isFssaiExpiringThisMonth = (s) => {
    if (!s.fssaiExpiry) return false;
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0'); // e.g. "06"
    const parts = s.fssaiExpiry.split('-');
    return parts.length >= 2 && parts[1] === currentMonth;
  };

  const isRentExpiringThisMonth = (s) => {
    if (!s.rentExpiry) return false;
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const parts = s.rentExpiry.split('-');
    return parts.length >= 2 && parts[1] === currentMonth;
  };

  const isInventoryStore = (s) => {
    const model = (s.cafeModule || s.cafeModel || '').toLowerCase();
    const type = (s.storeType || '').toLowerCase();
    return model.includes('inventory') || type.includes('inventory');
  };

  // Managers aggregation function
  const aggregateManagers = (storeList, fieldName) => {
    const managersMap = {};
    storeList.forEach(store => {
      let name = '';
      if (fieldName === 'areaManager') name = store.areaManagerName;
      else if (fieldName === 'cityHead') name = store.cityHeadName;
      else if (fieldName === 'cafeManager') name = store.cafeManagerName;

      if (name && name.trim()) {
        if (!managersMap[name]) {
          managersMap[name] = [];
        }
        managersMap[name].push({
          id: store.id,
          name: store.cafeName,
          code: store.cafeCode
        });
      }
    });
    return Object.entries(managersMap).map(([name, cafes]) => ({ name, cafes }));
  };

  // Compute stats dynamically
  const stats = useMemo(() => {
    const isTargetStore = (s) => {
      const code = (s.cafeCode || '').toUpperCase();
      return code.startsWith('CA') || code.startsWith('GOT') || code.startsWith('CAGT') || !s.cafeCode;
    };
    const targetStores = filteredStores.filter(isTargetStore);

    const liveStores = targetStores.filter(s => s.status === 'LIVE' && s.isActive !== false && s.isActive !== 'false');
    const closedStores = filteredStores.filter(s => getCurrentStatus(s) === 'Closed');
    const totalStores = targetStores.filter(s => !isInventoryStore(s) && getCurrentStatus(s) !== 'Closed').concat(closedStores);
    
    const pipelineStores = filteredStores.filter(s => {
      const isLocked = s.isLocked === true || s.isLocked === 'true';
      if (isLocked || s.status === 'LIVE' || s.status === 'Live' || getCurrentStatus(s) === 'Closed') {
        return false;
      }
      if (s.status === 'Ready for Construction') {
        return false;
      }
      return true;
    });

    const upcomingStores = targetStores.filter(s => getCurrentStatus(s) === 'Upcoming Store');
    const pendingApprovalStores = targetStores.filter(s => s.status === 'PENDING_APPROVAL');
    const readyToGoLiveStores = targetStores.filter(s => getCurrentStatus(s) === 'Ready to Go Live');
    const fssaiThisMonthStores = targetStores.filter(isFssaiExpiringThisMonth);
    const rentThisMonthStores = targetStores.filter(isRentExpiringThisMonth);

    const areaManagersData = aggregateManagers(filteredStores, 'areaManager');
    const cityHeadsData = aggregateManagers(filteredStores, 'cityHead');
    const cafeManagersData = aggregateManagers(filteredStores, 'cafeManager');
    
    const areaManagerStores = filteredStores.filter(s => s.areaManagerName?.trim());
    const cityHeadStores = filteredStores.filter(s => s.cityHeadName?.trim());
    const cafeManagerStores = filteredStores.filter(s => s.cafeManagerName?.trim());

    const activeCafes = targetStores.filter(s => !isInventoryStore(s) && getCurrentStatus(s) !== 'Closed');
    
    const statesList = [...new Set(activeCafes.map(s => s.state?.trim()).filter(Boolean))].sort();
    const citiesList = [...new Set(activeCafes.map(s => s.city?.trim()).filter(Boolean))].sort();
    
    const selectedStateStores = selectedState === 'All' 
      ? activeCafes
      : activeCafes.filter(s => s.state?.trim() === selectedState);
      
    const selectedCityStores = selectedCity === 'All' 
      ? activeCafes
      : activeCafes.filter(s => s.city?.trim() === selectedCity);

    const selectedStateUniqueCount = new Set(selectedStateStores.map(s => s.state?.trim()).filter(Boolean)).size;
    const selectedCityUniqueCount = new Set(selectedCityStores.map(s => s.city?.trim()).filter(Boolean)).size;

    return {
      liveStoreCount: liveStores.length,
      liveStores,
      totalCafeCount: totalStores.length,
      totalStores,
      pipelineCount: pipelineStores.length,
      pipelineStores,
      upcomingStoreCount: upcomingStores.length,
      upcomingStores,
      closedStoreCount: closedStores.length,
      closedStores,
      pendingApprovalCount: pendingApprovalStores.length,
      pendingApprovalStores,
      readyToGoLiveCount: readyToGoLiveStores.length,
      readyToGoLiveStores,
      fssaiThisMonthCount: fssaiThisMonthStores.length,
      fssaiThisMonthStores,
      rentThisMonthCount: rentThisMonthStores.length,
      rentThisMonthStores,
      areaManagersData,
      areaManagerStores,
      cityHeadsData,
      cityHeadStores,
      cafeManagersData,
      cafeManagerStores,
      incompleteInfoCount: 0,
      statesList,
      citiesList,
      selectedStateCount: selectedStateUniqueCount,
      selectedStateStores,
      selectedCityCount: selectedCityUniqueCount,
      selectedCityStores
    };
  }, [filteredStores, selectedCity, selectedState]);

  // Compute Action Center counts
  const actionCenter = useMemo(() => {
    const missingSwiggy = filteredStores.filter(s => !s.blueTokaiSwiggyRID && !s.suchaliSwiggyRID && !s.gotTeaSwiggyRID).length;
    const missingZomato = filteredStores.filter(s => !s.blueTokaiZomatoRID && !s.suchaliZomatoRID && !s.gotTeaZomatoRID).length;
    const fssaiExpires30Days = filteredStores.filter(s => {
      if (!s.fssaiExpiry) return false;
      const expiry = new Date(s.fssaiExpiry).getTime();
      const now = new Date().getTime();
      const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 30;
    }).length;
    const rentExpired = filteredStores.filter(s => {
      if (!s.rentExpiry) return false;
      return new Date(s.rentExpiry).getTime() < new Date().getTime();
    }).length;

    return {
      missingSwiggy,
      missingZomato,
      fssaiExpires30Days,
      rentExpired
    };
  }, [filteredStores]);

  const getStoreLaunchDate = (store) => {
    const candidateDates = [
      store?.inStoreLiveDate,
      store?.deliveryLiveDate,
      store?.launchDate
    ]
      .filter(Boolean)
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());

    return candidateDates[0] || null;
  };

  // Compute rolling 12-month cumulative growth based on actual store launch dates
  const chartData = useMemo(() => {
    const today = new Date();
    const launchDates = filteredStores
      .filter(store => store?.status === 'LIVE' || store?.status === 'Live')
      .map(getStoreLaunchDate)
      .filter(date => date && date <= today)
      .sort((left, right) => left.getTime() - right.getTime());

    if (launchDates.length === 0) {
      return [];
    }

    const monthWindows = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - (11 - index), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

      return {
        name: monthDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        monthEnd
      };
    });

    return monthWindows.map(({ name, monthEnd }) => ({
      name,
      stores: launchDates.filter(date => date.getTime() <= monthEnd.getTime()).length
    }));
  }, [filteredStores]);

  const statCards = [
    { id: 'total', title: 'Total Cafe Count', value: stats.totalCafeCount, icon: <Storefront />, color: '#6366f1', subtitle: 'Portfolio size', dataset: stats.totalStores },
    { id: 'live', title: 'Live Store Count', value: stats.liveStoreCount, icon: <CheckCircle />, color: '#10b981', subtitle: 'Currently active', dataset: stats.liveStores },
    { 
      id: 'state',
      title: 'States Covered', 
      value: stats.selectedStateCount, 
      icon: <MapIcon />, 
      color: '#3b82f6', 
      subtitle: 'By state',
      dataset: stats.selectedStateStores,
      dropdown: {
        value: selectedState,
        onChange: setSelectedState,
        options: stats.statesList,
        label: 'States'
      }
    },
    { 
      id: 'city',
      title: 'Cities Covered', 
      value: stats.selectedCityCount, 
      icon: <LocationCity />, 
      color: '#0ea5e9', 
      subtitle: 'By city',
      dataset: stats.selectedCityStores,
      dropdown: {
        value: selectedCity,
        onChange: setSelectedCity,
        options: stats.citiesList,
        label: 'Cities'
      }
    },
    { id: 'closed', title: 'Closed Store Count', value: stats.closedStoreCount, icon: <Cancel />, color: '#ef4444', subtitle: 'Inactive locations', dataset: stats.closedStores },
    { id: 'upcoming', title: 'Upcoming Store Count', value: stats.upcomingStoreCount, icon: <Upcoming />, color: '#06b6d4', subtitle: 'Future pipeline', dataset: stats.upcomingStores },
    { id: 'ready', title: 'Ready to Go Live Count', value: stats.readyToGoLiveCount, icon: <TaskAlt />, color: '#059669', subtitle: 'Awaiting launch', dataset: stats.readyToGoLiveStores },
    { id: 'pipeline', title: 'Pipeline Count', value: stats.pipelineCount, icon: <Upcoming />, color: '#0ea5e9', subtitle: 'Pipeline phase', dataset: stats.pipelineStores },
    { id: 'pending', title: 'Approval Pending', value: stats.pendingApprovalCount, icon: <Warning />, color: '#f59e0b', subtitle: 'Needs review', dataset: stats.pendingApprovalStores },

    { id: 'fssai', title: 'Current Month Expiry FSSAI Licence Count', value: stats.fssaiThisMonthCount, icon: <CalendarToday />, color: '#ec4899', subtitle: 'Compliance attention', dataset: stats.fssaiThisMonthStores },
    { id: 'rent', title: 'Current Month Expiry Rent Count', value: stats.rentThisMonthCount, icon: <CalendarToday />, color: '#8b5cf6', subtitle: 'Lease attention', dataset: stats.rentThisMonthStores },
    { id: 'area_managers', title: 'Area Managers Count', value: stats.areaManagersData.length, icon: <People />, color: '#f97316', subtitle: 'Regional owners', dataset: stats.areaManagerStores },
    { id: 'city_heads', title: 'City Heads Count', value: stats.cityHeadsData.length, icon: <People />, color: '#a855f7', subtitle: 'City supervisors', dataset: stats.cityHeadStores },
    { id: 'cafe_managers', title: 'Cafe Managers Count', value: stats.cafeManagersData.length, icon: <People />, color: '#14b8a6', subtitle: 'On-ground managers', dataset: stats.cafeManagerStores },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <FullScreenLoader messages={[
          'Warming up the espresso machine…',
          'Grinding the freshest beans…',
          'Fetching dashboard analytics…',
          'Plating the details…',
          'Almost ready to serve ☕',
        ]} subtle />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 0.5 }}>
      <Card sx={{ mb: 2.5, overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 }, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              top: -72,
              right: -24,
              width: { xs: 180, md: 240 },
              height: { xs: 180, md: 240 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(111,205,220,0.22) 0%, rgba(111,205,220,0) 70%)'
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', flexWrap: 'wrap', gap: 2, position: 'relative' }}>
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.68rem' }}>
                Executive Overview
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75, fontSize: { xs: '1.55rem', md: '1.95rem', lg: '2.15rem' } }}>
                Operations Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680, fontSize: { xs: '0.8rem', md: '0.84rem' } }}>
                Live view of store growth, readiness, approvals, and compliance signals across the network.
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(3, minmax(92px, 1fr))' }, gap: 1, minWidth: { xs: '100%', md: 320 }, alignSelf: 'flex-start' }}>
              <Chip label={`${stats.liveStoreCount} Live`} sx={{ justifyContent: 'center', bgcolor: 'rgba(111,205,220,0.18)', color: 'text.primary' }} />
              <Chip label={`${stats.upcomingStoreCount} Upcoming`} sx={{ justifyContent: 'center', bgcolor: 'rgba(139,108,240,0.14)', color: 'text.primary' }} />
              <Chip label={`${stats.pendingApprovalCount} Pending`} sx={{ justifyContent: 'center', bgcolor: 'rgba(217,154,40,0.18)', color: 'text.primary' }} />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2.25, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.3, fontSize: { xs: '1.45rem', md: '1.8rem' } }}>
            Performance Snapshot
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', md: '0.82rem' } }}>
            Core metrics for current portfolio health and expansion workflow.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))'
          },
          gap: 1.75,
          mb: 2.5
        }}
      >
        {statCards.map((stat, idx) => (
          <Box key={idx}>
            <Card 
              onClick={() => setActiveModalTile(stat)}
              sx={{ 
                bgcolor: 'background.paper',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                border: activeModalTile?.id === stat.id ? `2px solid ${stat.color}` : '2px solid transparent',
                boxShadow: activeModalTile?.id === stat.id 
                  ? `0 8px 24px ${stat.color}40` 
                  : '0 4px 12px rgba(10, 49, 77, 0.04)',
                transform: activeModalTile?.id === stat.id ? 'translateY(-4px)' : 'none',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: activeModalTile?.id === stat.id 
                    ? `0 12px 32px ${stat.color}50`
                    : '0 16px 36px rgba(10, 49, 77, 0.08)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  bgcolor: stat.color
                }
              }}>
              <CardContent sx={{ p: 2, pt: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.65 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.66rem' }}>
                        {stat.title}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalTile(stat);
                        }}
                        sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: stat.color, bgcolor: `${stat.color}14` } }}
                      >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.9rem', md: '2.15rem' }, lineHeight: 1.05, mb: 0.35 }}>
                      {stat.value}
                    </Typography>
                    {stat.dropdown ? (
                      <Select
                        size="small"
                        value={stat.dropdown.value}
                        onChange={(e) => stat.dropdown.onChange(e.target.value)}
                        variant="standard"
                        disableUnderline
                        sx={{ 
                          fontSize: '0.75rem', 
                          color: 'text.secondary', 
                          mt: 0.25,
                          '& .MuiSelect-select': { py: 0, px: 0 },
                          '& .MuiSvgIcon-root': { fontSize: '1rem', right: -4 }
                        }}
                      >
                        <MenuItem value="All" sx={{ fontSize: '0.75rem' }}>All {stat.dropdown.label}</MenuItem>
                        {stat.dropdown.options.map(opt => (
                          <MenuItem key={opt} value={opt} sx={{ fontSize: '0.75rem' }}>{opt}</MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {stat.subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ 
                    bgcolor: `${stat.color}14`, 
                    p: 1, 
                    borderRadius: 3.5, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: stat.color,
                    border: `1px solid ${stat.color}20`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45)`,
                    flexShrink: 0
                  }}>
                    {React.cloneElement(stat.icon, { sx: { fontSize: 20 } })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 7.5 }}>
          <Card sx={{ bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography variant="h6" sx={{ fontWeight: 750, mb: 2, color: 'text.primary' }}>Store Growth</Typography>
              <Box sx={{ height: { xs: 250, md: 290 }, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStores" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(22,49,58,0.08)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#475569" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}
                      dx={-5}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255,255,255,0.88)', 
                        border: '1px solid rgba(63,174,191,0.14)', 
                        borderRadius: '10px', 
                        boxShadow: '0 16px 30px rgba(15,23,42,0.10)',
                        padding: '10px 14px'
                      }}
                      itemStyle={{ color: '#16313a', fontFamily: 'Plus Jakarta Sans', fontSize: '13px', fontWeight: 600 }}
                      labelStyle={{ color: '#4c6b75', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="stores" 
                      stroke={theme.palette.primary.main} 
                      fillOpacity={1} 
                      fill="url(#colorStores)" 
                      strokeWidth={2.5} 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, lg: 4.5 }}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography variant="h6" sx={{ fontWeight: 750, mb: 2, color: 'text.primary' }}>Action Center</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'Missing Swiggy IDs', count: actionCenter.missingSwiggy, color: theme.palette.warning.main, bg: theme.palette.warning.light },
                  { label: 'Missing Zomato IDs', count: actionCenter.missingZomato, color: theme.palette.error.main, bg: theme.palette.error.light },
                  { label: 'FSSAI Expires in 30 Days', count: actionCenter.fssaiExpires30Days, color: theme.palette.warning.main, bg: theme.palette.warning.light },
                  { label: 'Rent Agreement Expired', count: actionCenter.rentExpired, color: theme.palette.error.main, bg: theme.palette.error.light },
                ].map((item, idx) => (
                  <Box key={idx} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1.5,
                    bgcolor: 'rgba(255,255,255,0.34)',
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'border-color 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(63,174,191,0.24)'
                    }
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{item.label}</Typography>
                    <Box sx={{
                      bgcolor: item.bg,
                      color: item.color,
                      minWidth: 42,
                      textAlign: 'center',
                      px: 1.1,
                      py: 0.45,
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}>
                      {item.count}
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={12}>
          <Card sx={{ 
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '16px'
          }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                    Ready to Go Live Stores
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stores that have been approved and are ready to transition to the Live stage.
                  </Typography>
                </Box>
                <Chip 
                  label={`${stats.readyToGoLiveStores.length} Store${stats.readyToGoLiveStores.length !== 1 ? 's' : ''}`} 
                  color="success" 
                  sx={{ fontWeight: 700, borderRadius: '8px' }} 
                />
              </Box>

              {stats.readyToGoLiveStores.length === 0 ? (
                  <Box sx={{ py: 3.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.28)', borderRadius: '16px', border: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No stores are currently ready to go live.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {stats.readyToGoLiveStores.map((store) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={store.id}>
                      <Box sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(255,255,255,0.34)', 
                        borderRadius: '14px', 
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          borderColor: '#059669',
                          bgcolor: 'rgba(5, 150, 105, 0.02)'
                        }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.15 }}>
                          {store.brand === 'BLUE_TOKAI_SUCHALI' ? (
                            <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: 34, width: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          ) : store.brand === 'GOT_TEA' ? (
                            <img src={gotTeaLogo} alt="Got Tea" style={{ height: 34, width: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          ) : (
                            <Box sx={{ height: 34, width: 34, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontWeight: 700, fontSize: '0.76rem', border: '1px solid rgba(63,174,191,0.14)' }}>
                              BT
                            </Box>
                          )}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {store.cafeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Code: {store.cafeCode}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={getCurrentStatus(store).toUpperCase()} 
                          size="small" 
                          color="success" 
                          variant="outlined" 
                          sx={{ fontWeight: 700, fontSize: '0.65rem', borderRadius: '6px' }} 
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Operations Teams & Assignments Grid */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: 440, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.25, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Area Managers
                </Typography>
                <Chip label={`Total: ${stats.areaManagersData.length}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {stats.areaManagersData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No assigned Area Managers.
                  </Typography>
                ) : (
                  stats.areaManagersData.map((am, idx) => (
                    <Box key={idx} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{am.name}</Typography>
                        <Chip label={`${am.cafes.length} Café${am.cafes.length > 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 0.75, 
                        maxHeight: 250, 
                        overflowY: 'auto', 
                        pr: 0.5 
                      }}>
                        {am.cafes.map((cafe, cIdx) => (
                          <Chip 
                            key={cIdx} 
                            label={`${cafe.name} (${cafe.code || 'N/A'})`} 
                            size="small" 
                            sx={{ 
                              fontSize: '0.725rem', 
                              bgcolor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid',
                              borderColor: 'divider',
                              color: 'text.secondary',
                              width: '100%',
                              justifyContent: 'flex-start',
                              height: 'auto',
                              '& .MuiChip-label': {
                                px: 1,
                                py: 0.3,
                                whiteSpace: 'normal',
                              }
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: 440, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.25, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  City Heads
                </Typography>
                <Chip label={`Total: ${stats.cityHeadsData.length}`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
              </Box>

              {(() => {
                const q = cityHeadSearch.trim().toLowerCase();
                const filteredCityHeads = q
                  ? stats.cityHeadsData
                      .map(ch => {
                        const headMatches = ch.name.toLowerCase().includes(q);
                        if (headMatches) {
                          // Head name matches → keep ALL cafes for this group
                          return ch;
                        }
                        // Head name doesn't match → only keep cafes that match
                        const matchedCafes = ch.cafes.filter(
                          cafe =>
                            cafe.name?.toLowerCase().includes(q) ||
                            (cafe.code || '').toLowerCase().includes(q)
                        );
                        return { ...ch, cafes: matchedCafes };
                      })
                      .filter(ch => ch.name.toLowerCase().includes(q) || ch.cafes.length > 0)
                  : stats.cityHeadsData;

                return (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search by City Head, Cafe name or Code…"
                      value={cityHeadSearch}
                      onChange={e => setCityHeadSearch(e.target.value)}
                      sx={{ mb: 1.5 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                          endAdornment: cityHeadSearch ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setCityHeadSearch('')}
                                edge="end"
                                aria-label="clear search"
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ) : null
                        }
                      }}
                    />

                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                      {filteredCityHeads.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                          {cityHeadSearch ? 'No results found.' : 'No assigned City Heads.'}
                        </Typography>
                      ) : (
                        filteredCityHeads.map((ch, idx) => (
                          <Box key={idx} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{ch.name}</Typography>
                              <Chip label={`${ch.cafes.length} Café${ch.cafes.length > 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            </Box>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 0.75, 
                              maxHeight: 250, 
                              overflowY: 'auto', 
                              pr: 0.5 
                            }}>
                              {ch.cafes.map((cafe, cIdx) => (
                                <Chip 
                                  key={cIdx} 
                                  label={`${cafe.name} (${cafe.code || 'N/A'})`} 
                                  size="small" 
                                  sx={{ 
                                    fontSize: '0.725rem', 
                                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    height: 'auto',
                                    '& .MuiChip-label': {
                                      px: 1,
                                      py: 0.3,
                                      whiteSpace: 'normal',
                                    }
                                  }} 
                                />
                              ))}
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: 440, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.25, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Café Managers
                </Typography>
                <Chip label={`Total: ${stats.cafeManagersData.length}`} size="small" color="success" sx={{ fontWeight: 700 }} />
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {stats.cafeManagersData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No assigned Café Managers.
                  </Typography>
                ) : (
                  stats.cafeManagersData.map((cm, idx) => (
                    <Box key={idx} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{cm.name}</Typography>
                        <Chip label={`${cm.cafes.length} Café${cm.cafes.length > 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 0.75, 
                        maxHeight: 250, 
                        overflowY: 'auto', 
                        pr: 0.5 
                      }}>
                        {cm.cafes.map((cafe, cIdx) => (
                          <Chip 
                            key={cIdx} 
                            label={`${cafe.name} (${cafe.code || 'N/A'})`} 
                            size="small" 
                            sx={{ 
                              fontSize: '0.725rem', 
                              bgcolor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid',
                              borderColor: 'divider',
                              color: 'text.secondary',
                              width: '100%',
                              justifyContent: 'flex-start',
                              height: 'auto',
                              '& .MuiChip-label': {
                                px: 1,
                                py: 0.3,
                                whiteSpace: 'normal',
                              }
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {activeModalTile && (
        <DashboardStoreDetailsModal
          open={!!activeModalTile}
          onClose={() => setActiveModalTile(null)}
          title={activeModalTile.title}
          dataset={activeModalTile.dataset}
        />
      )}
    </Box>
  );
}
