import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, TextField, Grid,
  Button, MenuItem, Tooltip, Select, Dialog, DialogTitle, DialogContent, DialogActions, Alert, InputAdornment, IconButton, Stack
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ConstructionIcon from '@mui/icons-material/Construction';
import SearchIcon from '@mui/icons-material/Search';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { sortStoresByCurrentStatus } from '../utils/status';

const formatIndianCurrencyHint = (value) => {
  if (!value) return '';
  const num = Number(value.toString().replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num <= 0) return value;
  
  if (num >= 10000000) {
    const formatted = (num / 10000000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Crore`;
  }
  if (num >= 100000) {
    const formatted = (num / 100000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Lakh`;
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Thousand`;
  }
  return `₹${num}`;
};

export default function UpcomingStores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasUpcomingEditor = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.permissions?.includes('EDITOR');
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const fetchStores = () => {
    fetchStoresFromFirestore()
      .then(stores => {
        // Filter: Removed as per new requirement so that cafe entries never disappear
        setStores(stores);
        setFilteredStores(stores);
      })
      .catch(async err => {
        console.error('Failed to fetch stores from Firestore, falling back to API:', err);
        try {
          const res = await axios.get('/api/stores');
          const storesList = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          setStores(storesList);
          setFilteredStores(storesList);
        } catch (apiError) {
          console.error('Failed to fetch stores:', apiError);
        }
      });
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const [ucDialogOpen, setUcDialogOpen] = useState(false);
  const [ucDialogStore, setUcDialogStore] = useState(null);
  const [ucStartDate, setUcStartDate] = useState('');
  const [ucHandoverDate, setUcHandoverDate] = useState('');
  const [ucDryLaunchDate, setUcDryLaunchDate] = useState('');
  const [ucLaunchDate, setUcLaunchDate] = useState('');
  const [ucLaunchMonth, setUcLaunchMonth] = useState('');
  const [ucDialogError, setUcDialogError] = useState('');

  const handleUcHandoverChange = (e) => {
    const val = e.target.value;
    setUcHandoverDate(val);
    if (val) {
      const d = new Date(val);
      d.setDate(d.getDate() + 3);
      setUcDryLaunchDate(d.toISOString().split('T')[0]);
    }
  };

  const handleUcLaunchChange = (e) => {
    const val = e.target.value;
    setUcLaunchDate(val);
    if (val) {
      const d = new Date(val);
      const monthStr = d.toLocaleString('en-US', { month: 'short' });
      const yearStr = d.getFullYear();
      setUcLaunchMonth(`${monthStr} ${yearStr}`);
    } else {
      setUcLaunchMonth('');
    }
  };

  const [draftDialog, setDraftDialog] = useState({ open: false, store: null, to: '', cc: '', subject: '', body: '' });
  const [isDraftEditing, setIsDraftEditing] = useState(false);
  const [draftSending, setDraftSending] = useState(false);
  const bodyRef = React.useRef(null);

  const replacePlaceholders = (text, storeData) => {
    if (!text || !storeData) return text;
    const completeAddress = [storeData.address, storeData.city, storeData.state, storeData.pinCode].filter(Boolean).join(', ');
    const placeholderMap = {
      '[Cafe Name]': storeData.cafeName || '',
      '[Cafe Code]': storeData.cafeCode || '',
      '[Brand]': storeData.brand || '',
      '[Location]': storeData.location || completeAddress || '',
      '[City]': storeData.city || '',
      '[State]': storeData.state || '',
      '[Pin Code]': storeData.pinCode || '',
      '[Cafe Address]': storeData.cafeAddress || storeData.address || '',
      '[Expected Sale]': formatIndianCurrencyHint(storeData.expectedSales || storeData.expectedSalesVal) || '',
      '[Cafe Launch Month & Year]': storeData.cafeLaunchMonth || '',
      '[Cafe Launch Month &amp; Year]': storeData.cafeLaunchMonth || '',
      '[Cafe Launch Month and Year]': storeData.cafeLaunchMonth || '',
      '[Launch Date]': storeData.launchDate ? new Date(storeData.launchDate).toLocaleDateString('en-IN') : '',
    };
    let result = text;
    for (const [token, value] of Object.entries(placeholderMap)) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'gi'), value);
    }
    return result.replace(/<br\s*[\/]?>/gi, '\n');
  };

  const handleOpenDraftDialog = async (store) => {
    try {
      const [templatesRes, mappingsRes] = await Promise.all([
        axios.get('/api/system/email-templates'),
        axios.get('/api/system/email-mappings'),
      ]);
      const templates = templatesRes.data || {};
      const mappings = Array.isArray(mappingsRes.data) ? mappingsRes.data : [];
      
      const subCategoryKey = 'Hiring Alart';
      const mapping = mappings.find(m => m.subCategory?.toLowerCase() === subCategoryKey.toLowerCase());
      const template = templates[subCategoryKey] || {};
      
      const rawSubject = template.subject || `Hiring Alert | ${store.cafeName}`;
      const rawBody = template.body || '';

      const subject = replacePlaceholders(rawSubject, store);
      const body = replacePlaceholders(rawBody, store).replace(/\n/g, '<br/>');

      setDraftDialog({
        open: true,
        store: store,
        to: mapping?.to?.join(', ') || '',
        cc: mapping?.cc?.join(', ') || '',
        subject,
        body
      });
      setIsDraftEditing(false);
    } catch (err) {
      console.error('Error fetching template:', err);
    }
  };

  const handleSendDraftEmail = async () => {
    if (!draftDialog.store) return;
    setDraftSending(true);
    try {
      await axios.post(`/api/stores/${draftDialog.store.id}/send-hiring-alert-email`, {
        to: draftDialog.to,
        cc: draftDialog.cc,
        subject: draftDialog.subject,
        body: draftDialog.body
      });
      setDraftDialog(prev => ({ ...prev, open: false }));
      fetchStores();
    } catch (err) {
      console.error('Error sending email:', err);
      alert(err.response?.data?.error || 'Failed to send email.');
    } finally {
      setDraftSending(false);
    }
  };

  const handleConfirmUc = async () => {
    if (!ucHandoverDate || !ucLaunchDate) {
      setUcDialogError('Project Handover Date and Launch Date are mandatory.');
      return;
    }
    setUcDialogError('');
    
    try {
      const payload = {
        status: 'Under Construction',
        isLocked: false,
        isLockedAutoApplied: false,
        projectStartDate: ucStartDate || null,
        projectHandoverDate: ucHandoverDate || null,
        tentativeDryLaunchDate: ucDryLaunchDate || null,
        launchDate: ucLaunchDate || null
      };
      
      if (ucLaunchMonth) {
        payload.cafeLaunchMonth = ucLaunchMonth;
      }

      await axios.put(`/api/stores/${ucDialogStore.id}`, payload);
      setUcDialogOpen(false);
      setUcDialogStore(null);
      fetchStores();
    } catch (err) {
      setUcDialogError(err.response?.data?.error || 'Failed to update store.');
    }
  };

  const handleCancelUc = () => {
    setUcDialogOpen(false);
    setUcDialogError('');
    setUcDialogStore(null);
  };


  useEffect(() => {
    let result = stores;

    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      result = result.filter(s => 
        s.cafeName?.toLowerCase().includes(q) ||
        s.cafeCode?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.pinCode?.toString().includes(q) ||
        s.brand?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q)
      );
    }

    if (selectedStatusFilter) {
      if (selectedStatusFilter === 'APPROVED') {
        result = result.filter(s => s.status === 'APPROVED' || s.status === 'NSO_APPROVED');
      } else {
        result = result.filter(s => s.status === selectedStatusFilter);
      }
    }

    const sortedResult = sortStoresByCurrentStatus(result);
    setFilteredStores(sortedResult);
  }, [globalSearch, selectedStatusFilter, stores]);

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

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'LIVE':
        return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', borderColor: 'rgba(34, 197, 94, 0.3)' };   // Green
      case 'APPROVED':
      case 'NSO_APPROVED':
        return {
          bgcolor: 'rgba(253, 224, 71, 0.2)', // Yellow for NSO Approved
          color: '#b45309',
          border: '1px solid rgba(250, 204, 21, 0.4)',
          boxShadow: '0 2px 4px rgba(250, 204, 21, 0.1)'
        };
      case 'READY_TO_GO_LIVE':
        return {
          bgcolor: 'rgba(34, 197, 94, 0.15)',
          color: '#166534',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 2px 4px rgba(34, 197, 94, 0.1)'
        };
      case 'PENDING_APPROVAL':
        return { bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', borderColor: 'rgba(249, 115, 22, 0.3)' }; // Orange
      case 'ON_HOLD':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };   // Red
      case 'DRAFT':
        return { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' };
      case 'REJECTED':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bgcolor: '#f1f3f4', color: '#5f6368', borderColor: '#dadce0' };
    }
  };

  // Get unique cities from the upcoming stores list for dynamic filtering
  const pipelineCount = stores.filter(s => s.status === 'In Pipeline' || s.status === 'IN_PIPELINE' || s.status === 'Pipeline').length;
  const rfcCount = stores.filter(s => s.status === 'Ready for Construction').length;
  const ucCount = stores.filter(s => s.status === 'Under Construction').length;
  const pendingApprovalCount = stores.filter(s => s.status === 'PENDING_APPROVAL' || s.status === 'Approval Pending' || s.status === 'Pending Approval' || s.status === 'Sent to NSO Team for Approval').length;
  const onHoldCount = stores.filter(s => s.status === 'ON_HOLD' || s.status === 'On Hold').length;
  const approvedCount = stores.filter(s => s.status === 'APPROVED' || s.status === 'NSO_APPROVED').length;

  const handleTileClick = (status) => {
    setSelectedStatusFilter(status);
  };

  return (
    <Box sx={{ py: 1 }}>
      <Card sx={{ mb: 4, overflow: 'hidden', bgcolor: '#0f2942' }}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 }, position: 'relative' }}>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, position: 'relative' }}>
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                PROJECT TRACKER
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', fontSize: { xs: '1.55rem', md: '1.95rem', lg: '2.15rem' } }}>
                  All Upcoming Stores
                </Typography>
                <Chip 
                  label={`${filteredStores.length} ${filteredStores.length === 1 ? 'Store' : 'Stores'}`} 
                  sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.15)', color: '#ffffff' }} 
                  size="small" 
                />
              </Box>
              <Typography variant="body2" sx={{ maxWidth: 680, fontSize: { xs: '0.8rem', md: '0.84rem' }, color: 'rgba(255,255,255,0.8)' }}>
                Monitor, filter, and plan for upcoming cafe setups and dry launches.
              </Typography>
            </Box>
            
            <TextField 
              size="small" 
              placeholder="Global Search..." 
              value={globalSearch} 
              onChange={e => setGlobalSearch(e.target.value)} 
              sx={{ 
                bgcolor: '#ffffff',
                borderRadius: '10px',
                width: { xs: '100%', sm: 220 },
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  borderRadius: '10px',
                  '& fieldset': { border: 'none' }
                },
                '& .MuiInputBase-input': {
                  padding: '0 8px 0 0',
                  fontSize: '0.8rem',
                  color: '#0f2942',
                  fontWeight: 700
                }
              }} 
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#0f2942', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Status Summary Tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2.25, mb: 3.5 }}>
        {[
          {
            key: 'pipeline',
            label: 'In Pipeline',
            count: pipelineCount,
            filterValue: 'In Pipeline',
            icon: <TimelineIcon />,
            color: '#0ea5e9'
          },
          {
            key: 'rfc',
            label: 'Ready for Const.',
            count: rfcCount,
            filterValue: 'Ready for Construction',
            icon: <AssignmentIcon />,
            color: '#3b82f6'
          },
          {
            key: 'construction',
            label: 'Under Const.',
            count: ucCount,
            filterValue: 'Under Construction',
            icon: <ConstructionIcon />,
            color: '#6366f1'
          },
          {
            key: 'approvalPending',
            label: 'Approval Pend.',
            count: pendingApprovalCount,
            filterValue: 'PENDING_APPROVAL',
            icon: <PendingActionsIcon />,
            color: '#4f46e5'
          },
          {
            key: 'onHold',
            label: 'On Hold',
            count: onHoldCount,
            filterValue: 'ON_HOLD',
            icon: <PauseCircleIcon />,
            color: '#1e3a8a'
          },
          {
            key: 'approved',
            label: 'Approved',
            count: approvedCount,
            filterValue: 'APPROVED',
            icon: <CheckCircleIcon />,
            color: '#0284c7'
          }
        ].map((tile) => {
          const isActive = selectedStatusFilter === tile.filterValue;
          return (
            <Card
              key={tile.key}
              onClick={() => handleTileClick(isActive ? '' : tile.filterValue)}
              sx={{
                bgcolor: '#f8fafc',
                background: isActive ? `linear-gradient(135deg, ${tile.color} 0%, ${tile.color}cc 100%)` : `linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)`,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: isActive ? tile.color : 'rgba(148, 163, 184, 0.2)',
                boxShadow: isActive 
                  ? `0 12px 24px ${tile.color}33, inset 0 2px 0 rgba(255,255,255,0.3)`
                  : '0 4px 12px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                opacity: selectedStatusFilter !== '' && !isActive ? 0.7 : 1,
                transform: isActive ? 'scale(1.03)' : 'none',
                '&:hover': {
                  transform: isActive ? 'scale(1.03) translateY(-2px)' : 'translateY(-3px)',
                  boxShadow: isActive 
                    ? `0 16px 32px ${tile.color}40`
                    : '0 12px 24px rgba(15,23,42,0.1)',
                  opacity: 1,
                  borderColor: isActive ? tile.color : `${tile.color}60`,
                  background: isActive ? `linear-gradient(135deg, ${tile.color} 0%, ${tile.color}cc 100%)` : `linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)`,
                }
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -24,
                  right: -24,
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: isActive ? `radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)` : `radial-gradient(circle, ${tile.color}18 0%, ${tile.color}00 70%)`
                }}
              />
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 0.5, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em', 
                        fontSize: { xs: '0.6rem', md: '0.65rem' },
                        color: isActive ? 'rgba(255,255,255,0.9)' : tile.color
                      }}
                    >
                      {tile.label}
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 800, 
                        fontSize: { xs: '1.6rem', md: '1.8rem' }, 
                        lineHeight: 1, 
                        mb: 0.5,
                        color: isActive ? '#ffffff' : '#0f172a',
                        textShadow: isActive ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                      }}
                    >
                      {tile.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                      {isActive ? 'Active Filter' : 'Click to filter'}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{
                      bgcolor: isActive ? 'rgba(255,255,255,0.2)' : `${tile.color}15`,
                      p: 1,
                      borderRadius: 3.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#ffffff' : tile.color,
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : `${tile.color}20`}`,
                      boxShadow: isActive ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.45)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {React.cloneElement(tile.icon, { sx: { fontSize: 20 } })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Filter Section Removed */}

      {/* Stores List Card */}
      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Cafe Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Expected Sale</TableCell>
                <TableCell>Project Start</TableCell>
                <TableCell>Handover Date</TableCell>
                <TableCell>Dry Launch Date</TableCell>
                <TableCell>Workflow Status</TableCell>
                <TableCell>Hiring Alart</TableCell>
                <TableCell>Sent to NSO Team for Approval By</TableCell>
                <TableCell>Approved By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No upcoming stores found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const badgeStyle = getStatusChipStyle(store.status);
                  const isStoreApproved = ['NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE'].includes(store.status);
                  const isStoreEditable = store.status !== 'Ready for Construction';
                  
                  return (
                    <TableRow 
                      key={store.id} 
                      hover
                      onClick={() => navigate(`/stores/${store.id}`, { state: { from: '/upcoming-stores' } })}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 }, 
                        cursor: 'pointer' 
                      }}
                    >
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: 'primary.main',
                        textDecoration: 'underline'
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
                          const address = store.address || '';
                          const city = store.city || '';
                          const state = store.state || '';
                          const pin = store.pinCode || '';
                          const parts = [address, city, state, pin].filter(Boolean);
                          return parts.join(', ') || '—';
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {formatIndianCurrencyHint(store.expectedSales) || '—'}
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
                        {store.status === 'Ready for Construction' ? (
                          <Select
                            value="Ready for Construction"
                            size="small"
                            disabled={!hasUpcomingEditor}
                            onChange={(e) => {
                              if (e.target.value === 'Under Construction') {
                                setUcDialogStore(store);
                                setUcStartDate('');
                                setUcHandoverDate('');
                                setUcDryLaunchDate('');
                                setUcLaunchDate('');
                                setUcLaunchMonth('');
                                setUcDialogError('');
                                setUcDialogOpen(true);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              height: 30,
                              borderRadius: '6px',
                              minWidth: 190,
                              bgcolor: '#f1f5f9',
                              '& .MuiSelect-select': { py: 0.5 }
                            }}
                          >
                            <MenuItem value="Ready for Construction" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Ready for Construction</MenuItem>
                            <MenuItem value="Under Construction" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Under Construction</MenuItem>
                          </Select>
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
                              store.status === 'PENDING_APPROVAL' ? 'APPROVAL PENDING' : 
                              store.status === 'ON_HOLD' ? 'ON HOLD' : 
                              (store.status === 'APPROVED' || store.status === 'NSO_APPROVED') ? 'APPROVED' : 
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
                        )}
                      </TableCell>
                        <TableCell>
                          {!store.status || ['In Pipeline', 'Agreement Signed', 'Ready for Construction'].includes(store.status) ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>—</Typography>
                          ) : store.hiringAlertMailStatus === 'Sent' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#16a34a !important' }} />} 
                                label="Sent" 
                                size="small" 
                                sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, borderRadius: '6px' }} 
                              />
                              {isSuperAdmin && (
                                <Tooltip title="Resend Hiring Alart Email">
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDraftDialog(store); }}>
                                    <SendIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          ) : (
                            <Select
                              value="Pending"
                              size="small"
                              onChange={(e) => {
                                if (e.target.value === 'Hiring Alart') {
                                  handleOpenDraftDialog(store);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                height: 30,
                                borderRadius: '6px',
                                minWidth: 120,
                                bgcolor: '#f1f5f9',
                                '& .MuiSelect-select': { py: 0.5 }
                              }}
                            >
                              <MenuItem value="Pending" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Pending</MenuItem>
                              <MenuItem value="Hiring Alart" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Hiring Alart</MenuItem>
                            </Select>
                          )}
                        </TableCell>
                      <TableCell sx={{ fontSize: '0.825rem', color: 'text.secondary' }}>
                        {store.sentToNsoBy ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.825rem' }}>
                              {store.sentToNsoBy}
                            </Typography>
                            {store.sentToNsoAt && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem' }}>
                                {new Date(store.sentToNsoAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </Typography>
                            )}
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.825rem', color: 'text.secondary' }}>
                        {store.approvedBy ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.825rem' }}>
                              {store.approvedBy}
                            </Typography>
                            {store.approvedAt && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem' }}>
                                {new Date(store.approvedAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </Typography>
                            )}
                          </Box>
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
      {/* Dialog: Under Construction Operation Details */}
      <Dialog
        open={ucDialogOpen}
        onClose={handleCancelUc}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 600 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
          Operation Details
        </DialogTitle>
        <DialogContent sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {ucDialogError && (
            <Alert severity="error" sx={{ borderRadius: '8px' }}>
              {ucDialogError}
            </Alert>
          )}
          <TextField
            fullWidth type="date" label="Project Start Date" InputLabelProps={{ shrink: true }}
            value={ucStartDate} onChange={(e) => setUcStartDate(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth type="date" label="Project Handover Date *" InputLabelProps={{ shrink: true }}
              value={ucHandoverDate} onChange={handleUcHandoverChange} required
            />
            <TextField
              fullWidth type="date" label="Tentative Dry Launch Date" InputLabelProps={{ shrink: true }}
              value={ucDryLaunchDate} onChange={(e) => setUcDryLaunchDate(e.target.value)}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth type="date" label="Launch Date *" InputLabelProps={{ shrink: true }}
              value={ucLaunchDate} onChange={handleUcLaunchChange} required
            />
            <TextField
              fullWidth label="Cafe Launch Month & Year" InputProps={{ readOnly: true }}
              value={ucLaunchMonth}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleCancelUc} color="inherit" sx={{ fontWeight: 600, borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUc} variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: '8px', px: 3, boxShadow: 2 }}>
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Draft Dialog */}
      <Dialog open={draftDialog.open} onClose={() => setDraftDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Draft Email Preview</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">Platform: <strong>Hiring Alart</strong></Typography>
          </Box>
          <Box>
            {!isDraftEditing && (
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />} 
                onClick={() => setIsDraftEditing(true)} 
                sx={{ mr: 2, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                Edit
              </Button>
            )}
            <IconButton onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Stack spacing={2.5}>
            <TextField label="To" fullWidth size="small" disabled={!isDraftEditing} value={draftDialog.to} onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))} />
            <TextField label="Cc" fullWidth size="small" disabled={!isDraftEditing} value={draftDialog.cc} onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))} />
            <TextField label="Subject" fullWidth size="small" disabled={!isDraftEditing} value={draftDialog.subject} onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))} />
            
            <Box sx={{ border: '1px solid', borderColor: isDraftEditing ? 'primary.main' : 'divider', borderRadius: '12px', bgcolor: '#ffffff', minHeight: '300px', mt: 2, overflow: 'hidden', position: 'relative' }}>
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  Email Body
                </Typography>
                {isDraftEditing && <Typography variant="caption" color="primary">Editing Mode Active</Typography>}
              </Box>
              <Box sx={{ 
                p: 2,
                '& table': {
                  width: 'fit-content !important',
                  maxWidth: '100%',
                  margin: '0',
                  tableLayout: 'auto !important'
                },
                '& th, & td': {
                  width: 'auto !important',
                  padding: '6px 12px !important'
                }
              }}>
                <div 
                  ref={bodyRef}
                  contentEditable={isDraftEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.innerHTML }))}
                  dangerouslySetInnerHTML={{ __html: draftDialog.body || '' }} 
                  style={{
                    fontSize: '0.875rem',
                    color: '#334155',
                    lineHeight: '1.6',
                    outline: 'none',
                    minHeight: '250px'
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))} color="inherit" sx={{ fontWeight: 600, borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleSendDraftEmail} variant="contained" disabled={draftSending} sx={{ fontWeight: 700, borderRadius: '8px', px: 3, boxShadow: 2 }}>
            {draftSending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
