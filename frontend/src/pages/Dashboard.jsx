import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, MenuItem, TextField, 
  Chip, CircularProgress, useTheme, IconButton, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Storefront from '@mui/icons-material/Storefront';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import Description from '@mui/icons-material/Description';
import People from '@mui/icons-material/People';
import Inventory from '@mui/icons-material/Inventory';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Upcoming from '@mui/icons-material/Upcoming';
import Cancel from '@mui/icons-material/Cancel';
import TaskAlt from '@mui/icons-material/TaskAlt';
import axios from 'axios';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';
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


  useEffect(() => {
    axios.get('/api/stores')
      .then(res => {
        setStores(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stores:', err);
        setLoading(false);
      });
  }, []);

  // No filtering applied to dashboard, show all stores
  const filteredStores = stores;

  // Helpers for Expired/Expiring soon logic
  const isLicenseExpired = (s) => {
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    let expired = false;
    if (s.fssaiExpiry && s.fssaiExpiry < todayStr) expired = true;
    if (s.rentExpiry && s.rentExpiry < todayStr) expired = true;
    return expired;
  };

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
    const model = (s.cafeModel || '').toLowerCase();
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
    const liveStoreCount = filteredStores.filter(s => s.status === 'LIVE').length;
    const totalCafeCount = filteredStores.filter(s => !isInventoryStore(s)).length;
    const upcomingStoreCount = filteredStores.filter(s => getCurrentStatus(s) === 'Upcoming Store').length;
    const closedStoreCount = filteredStores.filter(s => getCurrentStatus(s) === 'Closed').length;
    const pendingApprovalCount = filteredStores.filter(s => s.status === 'PENDING_APPROVAL').length;
    const readyToGoLiveCount = filteredStores.filter(s => getCurrentStatus(s) === 'Ready to Go Live').length;
    const readyToGoLiveStores = filteredStores.filter(s => getCurrentStatus(s) === 'Ready to Go Live');
    const fssaiThisMonthCount = filteredStores.filter(isFssaiExpiringThisMonth).length;
    const rentThisMonthCount = filteredStores.filter(isRentExpiringThisMonth).length;

    const areaManagersData = aggregateManagers(filteredStores, 'areaManager');
    const cityHeadsData = aggregateManagers(filteredStores, 'cityHead');
    const cafeManagersData = aggregateManagers(filteredStores, 'cafeManager');

    return {
      liveStoreCount,
      totalCafeCount,
      upcomingStoreCount,
      closedStoreCount,
      pendingApprovalCount,
      readyToGoLiveCount,
      readyToGoLiveStores,
      fssaiThisMonthCount,
      rentThisMonthCount,
      areaManagersData,
      cityHeadsData,
      cafeManagersData
    };
  }, [filteredStores]);

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

  // Compute monthly growth data dynamically based on store creation month (current calendar year)
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyCounts = months.map(m => ({ name: m, stores: 0 }));
    let runningTotal = 0;

    const sorted = [...filteredStores].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach(s => {
      const date = new Date(s.createdAt);
      if (date.getFullYear() === currentYear) {
        const monthIdx = date.getMonth();
        runningTotal++;
        for (let i = monthIdx; i < 12; i++) {
          monthlyCounts[i].stores = runningTotal;
        }
      }
    });

    if (runningTotal === 0) {
      return months.map(m => ({ name: m, stores: filteredStores.length }));
    }
    return monthlyCounts;
  }, [filteredStores]);

  const statCards = [
    { title: 'Total Cafe Count', value: stats.totalCafeCount, icon: <Storefront />, color: '#6366f1' },
    { title: 'Live Store Count', value: stats.liveStoreCount, icon: <CheckCircle />, color: '#10b981' },
    { title: 'Ready to Go Live Count', value: stats.readyToGoLiveCount, icon: <TaskAlt />, color: '#059669' },
    { title: 'Upcoming Store Count', value: stats.upcomingStoreCount, icon: <Upcoming />, color: '#06b6d4' },
    { title: 'Closed Store Count', value: stats.closedStoreCount, icon: <Cancel />, color: '#ef4444' },
    { title: 'Approval Pending', value: stats.pendingApprovalCount, icon: <Warning />, color: '#f59e0b' },
    { title: 'Current Month Expiry FSSAI Licence Count', value: stats.fssaiThisMonthCount, icon: <CalendarToday />, color: '#ec4899' },
    { title: 'Current Month Expiry Rent Count', value: stats.rentThisMonthCount, icon: <CalendarToday />, color: '#8b5cf6' },
    { title: 'Area Managers Count', value: stats.areaManagersData.length, icon: <People />, color: '#f97316' },
    { title: 'City Heads Count', value: stats.cityHeadsData.length, icon: <People />, color: '#a855f7' },
    { title: 'Cafe Managers Count', value: stats.cafeManagersData.length, icon: <People />, color: '#14b8a6' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Operations Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of store directory health, licenses, and approval workflows.
          </Typography>
        </Box>
      </Box>

      {/* Grid of 8 Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
            <Card sx={{ 
              bgcolor: 'background.paper', 
              transition: 'all 0.2s ease',
              '&:hover': { 
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.02)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: `${stat.color}08`, 
                    p: 1.5, 
                    borderRadius: 2.5, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: stat.color,
                    border: `1px solid ${stat.color}15`
                  }}>
                    {React.cloneElement(stat.icon, { fontSize: 'medium' })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Growth Chart & Action Center */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>Store Growth</Typography>
              <Box sx={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStores" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
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
                        backgroundColor: '#1a1d27', 
                        border: '1px solid #2d3148', 
                        borderRadius: '10px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        padding: '10px 14px'
                      }}
                      itemStyle={{ color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', fontSize: '13px', fontWeight: 600 }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}
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
        
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>Action Center</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'border-color 0.2s ease',
                    '&:hover': {
                      borderColor: '#3d4568'
                    }
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{item.label}</Typography>
                    <Box sx={{
                      bgcolor: item.bg,
                      color: item.color,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '8px',
                      fontSize: '0.825rem',
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

      {/* Ready to Go Live Stores Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={12}>
          <Card sx={{ 
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '16px'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
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
                <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No stores are currently ready to go live.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {stats.readyToGoLiveStores.map((store) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={store.id}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(255,255,255,0.02)', 
                        borderRadius: '12px', 
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {store.brand === 'BLUE_TOKAI_SUCHALI' ? (
                            <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: 36, width: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          ) : store.brand === 'GOT_TEA' ? (
                            <img src={gotTeaLogo} alt="Got Tea" style={{ height: 36, width: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          ) : (
                            <Box sx={{ height: 36, width: 36, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #cbd5e1' }}>
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
      <Grid container spacing={3}>
        {/* Area Managers List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: 500, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                        maxHeight: 300, 
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

        {/* City Heads List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: 500, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  City Heads
                </Typography>
                <Chip label={`Total: ${stats.cityHeadsData.length}`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
              </Box>

              {/* Search Bar */}
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
                              maxHeight: 300, 
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

        {/* Café Managers List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', height: 500, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                        maxHeight: 300, 
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
    </Box>
  );
}
