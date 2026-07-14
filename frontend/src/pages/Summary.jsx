import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Chip, useTheme, Stack
} from '@mui/material';
import FullScreenLoader from '../components/FullScreenLoader';
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
import AnalyticsIcon from '@mui/icons-material/Analytics';
import axios from '../utils/api';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { getCurrentStatus } from '../utils/status';

export default function Summary() {
  const theme = useTheme();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoresFromFirestore()
      .then(firestoreStores => {
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

  const filteredStores = useMemo(() => {
    return stores.filter(s => 
      s.isActive !== false && 
      s.isActive !== 'false' && 
      String(s.cafeModule || s.cafeModel || '').toLowerCase() !== 'test'
    );
  }, [stores]);

  const isFssaiExpiringThisMonth = (s) => {
    if (!s.fssaiExpiry) return false;
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
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
        managersMap[name].push(store);
      }
    });
    return Object.keys(managersMap);
  };

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

    const areaManagersCount = aggregateManagers(filteredStores, 'areaManager').length;
    const cityHeadsCount = aggregateManagers(filteredStores, 'cityHead').length;
    const cafeManagersCount = aggregateManagers(filteredStores, 'cafeManager').length;

    const activeCafes = targetStores.filter(s => !isInventoryStore(s) && getCurrentStatus(s) !== 'Closed');
    const statesCount = new Set(activeCafes.map(s => s.state?.trim()).filter(Boolean)).size;
    const citiesCount = new Set(activeCafes.map(s => s.city?.trim()).filter(Boolean)).size;

    return {
      totalCafeCount: totalStores.length,
      liveStoreCount: liveStores.length,
      pipelineCount: pipelineStores.length,
      upcomingStoreCount: upcomingStores.length,
      closedStoreCount: closedStores.length,
      pendingApprovalCount: pendingApprovalStores.length,
      readyToGoLiveCount: readyToGoLiveStores.length,
      fssaiThisMonthCount: fssaiThisMonthStores.length,
      rentThisMonthCount: rentThisMonthStores.length,
      areaManagersCount,
      cityHeadsCount,
      cafeManagersCount,
      statesCount,
      citiesCount
    };
  }, [filteredStores]);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <FullScreenLoader messages={[
          'Warming up the espresso machine…',
          'Preparing system metrics…',
          'Almost ready to serve ☕',
        ]} subtle />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 0.5 }}>
      {/* Title banner */}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, position: 'relative' }}>
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.68rem' }}>
                Executive Overview
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75, fontSize: { xs: '1.55rem', md: '1.95rem', lg: '2.15rem' } }}>
                Network Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680, fontSize: { xs: '0.8rem', md: '0.84rem' } }}>
                Comprehensive summary of store lifecycles, compliance alerts, territory metrics, and aggregator onboardings.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Main Grid summary card */}
      <Card sx={{ 
        bgcolor: 'background.paper',
        borderRadius: '16px',
        border: '1.5px solid rgba(63, 174, 191, 0.12)',
        boxShadow: '0 8px 32px rgba(10, 49, 77, 0.03)',
        overflow: 'hidden'
      }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em' }}>
            System Summary & Network Health
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Grid container spacing={4}>
            {/* Column 1: Store Lifecycle */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3.5 }}>
                <Box sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', p: 1, borderRadius: '10px', color: '#6366f1', display: 'flex' }}>
                  <Storefront sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Store Lifecycle
                </Typography>
              </Box>
              <Stack spacing={2.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Total Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.totalCafeCount} Cafes</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Live / Active</Typography>
                  <Chip size="small" label={`${stats.liveStoreCount}`} sx={{ fontWeight: 700, px: 1, bgcolor: '#dcfce7', color: '#15803d' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Pipeline / Upcoming</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.pipelineCount + stats.upcomingStoreCount} Cafes</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Ready to Live</Typography>
                  <Chip size="small" label={`${stats.readyToGoLiveCount}`} sx={{ fontWeight: 700, px: 1, bgcolor: '#dbeafe', color: '#1e40af' }} />
                </Box>
              </Stack>
            </Grid>

            {/* Column 2: Compliance Signal */}
            <Grid item xs={12} sm={6} md={3} sx={{ borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3.5 }}>
                <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', p: 1, borderRadius: '10px', color: '#ef4444', display: 'flex' }}>
                  <Warning sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Compliance & Risks
                </Typography>
              </Box>
              <Stack spacing={2.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>FSSAI Expired/30d</Typography>
                  {actionCenter.fssaiExpires30Days > 0 ? (
                    <Chip size="small" label={`${actionCenter.fssaiExpires30Days} Alerts`} sx={{ fontWeight: 700, px: 1, bgcolor: '#fee2e2', color: '#991b1b' }} />
                  ) : (
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>0 Issues</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Rent Expired</Typography>
                  {actionCenter.rentExpired > 0 ? (
                    <Chip size="small" label={`${actionCenter.rentExpired} Expired`} sx={{ fontWeight: 700, px: 1, bgcolor: '#fee2e2', color: '#991b1b' }} />
                  ) : (
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>0 Issues</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>FSSAI Expiring Month</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.fssaiThisMonthCount} Cafes</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Rent Expiring Month</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.rentThisMonthCount} Cafes</Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Column 3: Aggregator Integration */}
            <Grid item xs={12} sm={6} md={3} sx={{ borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3.5 }}>
                <Box sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', p: 1, borderRadius: '10px', color: '#f59e0b', display: 'flex' }}>
                  <Upcoming sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Onboarding Progress
                </Typography>
              </Box>
              <Stack spacing={2.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Missing Swiggy RIDs</Typography>
                  {actionCenter.missingSwiggy > 0 ? (
                    <Chip size="small" label={`${actionCenter.missingSwiggy}`} sx={{ fontWeight: 700, px: 1, bgcolor: '#fffbeb', color: '#b45309' }} />
                  ) : (
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>Completed</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Missing Zomato RIDs</Typography>
                  {actionCenter.missingZomato > 0 ? (
                    <Chip size="small" label={`${actionCenter.missingZomato}`} sx={{ fontWeight: 700, px: 1, bgcolor: '#fffbeb', color: '#b45309' }} />
                  ) : (
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>Completed</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Approval Pending</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: stats.pendingApprovalCount > 0 ? 'warning.main' : 'text.primary' }}>
                    {stats.pendingApprovalCount} Stores
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Closed Locations</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.closedStoreCount} Closed</Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Column 4: Geographics & Staff */}
            <Grid item xs={12} sm={6} md={3} sx={{ borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3.5 }}>
                <Box sx={{ bgcolor: 'rgba(10, 165, 233, 0.1)', p: 1, borderRadius: '10px', color: '#0ea5e9', display: 'flex' }}>
                  <People sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Territory & Staff
                </Typography>
              </Box>
              <Stack spacing={2.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>States Covered</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.statesCount} States</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Cities Covered</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.citiesCount} Cities</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Area Managers</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.areaManagersCount} Staff</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>City Heads</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{stats.cityHeadsCount} Heads</Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
