import { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Button, Stack, Dialog, DialogTitle, 
  DialogContent, DialogActions, List, ListItem, ListItemText, ListItemIcon,
  TextField, InputAdornment, MenuItem, Alert, CircularProgress
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';

export default function Approvals() {
  const [stores, setStores] = useState([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [attemptedStoreName, setAttemptedStoreName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [confirmApproveDialog, setConfirmApproveDialog] = useState({ open: false, store: null });

  // Email Mappings & Templates
  const [emailMappings, setEmailMappings] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState({});
  const [draftDialog, setDraftDialog] = useState({ open: false, store: null, status: '', to: '', cc: '', subject: '', body: '', isEditable: false, remarks: '' });
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [remarksError, setRemarksError] = useState(false);
  const [selectedStoreForRemarks, setSelectedStoreForRemarks] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [successMsg, setSuccessMsg] = useState(location.state?.successMessage || '');

  useEffect(() => {
    if (location.state?.successMessage) {
      // Clear location state to prevent showing on refresh
      window.history.replaceState({}, document.title);
      // Auto-hide alert after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Only Super Admins and users with APPROVER permission can change workflow status
  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.permissions?.includes('APPROVER');

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'LIVE':
        return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' };       // Green
      case 'NSO_APPROVED':
      case 'APPROVED':
        return { bgcolor: 'rgba(234, 179, 8, 0.12)', color: '#a16207', border: '1px solid rgba(234, 179, 8, 0.35)' };       // Yellow
      case 'READY_TO_GO_LIVE':
      case 'PENDING_APPROVAL':
        return { bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', border: '1px solid rgba(249, 115, 22, 0.3)' };      // Orange
      case 'ON_HOLD':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' };        // Red
      case 'INCOMPLETE_INFORMATION':
        return { bgcolor: 'rgba(100, 116, 139, 0.10)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };   // Grey
      default:
        return { bgcolor: 'rgba(100, 116, 139, 0.10)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };
    }
  };

  const fetchStores = () => {
    const filterStore = (s) => {
      const status = (s.status || '').toUpperCase().trim().replace(/ /g, '_');
      return ['PENDING_APPROVAL', 'APPROVAL_PENDING', 'NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE', 'ON_HOLD', 'INCOMPLETE_INFORMATION', 'CLOSED'].includes(status) || !!s.sentToNsoBy;
    };

    fetchStoresFromFirestore()
      .then(stores => {
        setStores(stores.filter(filterStore));
      })
      .catch(async err => {
        console.error('Failed to load stores from Firestore, falling back to API:', err);
        try {
          const res = await axios.get('/api/stores');
          const storesList = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          setStores(storesList.filter(filterStore));
        } catch (apiError) {
          console.error(apiError);
        }
      });
  };

  useEffect(() => {
    fetchStores();
    axios.get('/api/system/email-mappings')
      .then(res => setEmailMappings(res.data || []))
      .catch(err => console.error('Failed to load email mappings', err));
    axios.get('/api/system/email-templates')
      .then(res => setEmailTemplates(res.data || {}))
      .catch(err => console.error('Failed to load email templates', err));
  }, []);

  const getStatusAliases = (status) => {
    const norm = (status || '').trim().toUpperCase();
    if (norm === 'IN_PIPELINE' || norm === 'IN PIPELINE') {
      return ['In Pipeline', 'Pipeline'];
    }
    if (norm === 'AGREEMENT_SIGNED' || norm === 'AGREEMENT SIGNED') {
      return ['Agreement Signed'];
    }
    if (norm === 'READY_FOR_CONSTRUCTION' || norm === 'READY FOR CONSTRUCTION') {
      return ['Ready for Construction'];
    }
    if (norm === 'UNDER_DEVELOPMENT' || norm === 'UNDER DEVELOPMENT' || norm === 'UNDER CONSTRUCTION') {
      return ['Under Construction'];
    }
    if (norm === 'INCOMPLETE_INFORMATION' || norm === 'INCOMPLETE' || norm === 'INCOMPLETE INFORMATION') {
      return ['Incomplete Information', 'Incomplete', 'INCOMPLETE_INFORMATION'];
    }
    if (norm === 'PENDING_APPROVAL' || norm === 'APPROVAL_PENDING' || norm === 'APPROVAL PENDING' || norm === 'SENT TO NSO TEAM FOR APPROVAL') {
      return ['Sent to NSO Team for Approval', 'Approval Pending', 'PENDING_APPROVAL'];
    }
    if (norm === 'APPROVED' || norm === 'NSO_APPROVED') {
      return ['Approved', 'APPROVED', 'NSO_APPROVED'];
    }
    if (norm === 'READY_TO_GO_LIVE' || norm === 'READY TO GO LIVE') {
      return ['Ready to Go Live', 'READY_TO_GO_LIVE'];
    }
    if (norm === 'CLOSED' || norm === 'CLOSED STORES' || norm === 'CLOSED STORE') {
      return ['Closed', 'CLOSED'];
    }
    if (norm === 'LIVE' || norm === 'LIVE STORES' || norm === 'LIVE STORE') {
      return ['Live', 'LIVE'];
    }
    return [status];
  };

  const getMappedConfigForStatus = (status) => {
    const aliases = getStatusAliases(status).map(a => a.toLowerCase());
    const mapping = emailMappings.find(m => 
      (m.category?.toLowerCase() === 'status changes' || m.category?.toLowerCase() === 'status triggered' || m.category?.toLowerCase() === 'status') &&
      aliases.includes(m.subCategory?.toLowerCase())
    );
    if (!mapping) return null;

    const templateKey = Object.keys(emailTemplates).find(k => k.toLowerCase() === mapping.subCategory.toLowerCase());
    const template = templateKey ? emailTemplates[templateKey] : null;
    if (!template) return null;

    return { mapping, template };
  };

  const replacePlaceholders = (templateText, store) => {
    if (!templateText) return '';
    const brandNamePretty = store.brand === 'BLUE_TOKAI_SUCHALI' 
      ? "Blue Tokai / Suchali's Artisan Bakehouse" 
      : (store.brand === 'GOT_TEA' ? "Got Tea" : (store.brand || ''));

    return templateText
      .replace(/{cafeName}|\[Store Name\]|\[Cafe Name\]/gi, store.cafeName || '')
      .replace(/{brandName}|\[Brand Name\]|\[Brand\]/gi, brandNamePretty)
      .replace(/{city}|\[City\]/gi, store.city || '')
      .replace(/{state}|\[State\]/gi, store.state || '')
      .replace(/{address}|\[Address\]/gi, store.cafeAddress || store.address || '')
      .replace(/{model}|\[Model\]|\[Cafe Model\]/gi, store.cafeModule || store.cafeModel || '')
      .replace(/{cafeCode}|\[Store Code\]|\[Cafe Code\]/gi, store.cafeCode || '')
      .replace(/{pincode}|\[Pin Code\]|\[Pin Code\]/gi, store.pinCode || '');
  };

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      await axios.post(`/api/stores/${draftDialog.store.id}/send-status-email`, {
        status: draftDialog.status,
        to: draftDialog.to,
        cc: draftDialog.cc,
        subject: draftDialog.subject,
        body: draftDialog.body
      });
      if (draftDialog.status === 'ON_HOLD' && draftDialog.remarks) {
        await axios.put(`/api/stores/${draftDialog.store.id}/status`, {
          status: 'ON_HOLD',
          remarks: draftDialog.remarks
        });
      }
      
      // Immediately update local state to avoid caching race condition
      setStores(prevStores => prevStores.map(s => 
        s.id === draftDialog.store.id ? { ...s, status: draftDialog.status } : s
      ));
      
      setDraftDialog({ open: false, store: null, status: '', to: '', cc: '', subject: '', body: '', isEditable: false, remarks: '' });
      fetchStores(); // Refresh list in background
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(error.response?.data?.error || 'Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDraftCancel = () => {
    setDraftDialog({ open: false, store: null, status: '', to: '', cc: '', subject: '', body: '', isEditable: false, remarks: '' });
  };

  const proceedWithAction = async (store, actionStatus) => {
    try {
      const response = await axios.put(`/api/stores/${store.id}/status`, { status: actionStatus });
      // Immediately update local state to avoid caching race condition
      setStores(prevStores => prevStores.map(s => 
        s.id === store.id ? { ...s, ...response.data } : s
      ));
      fetchStores(); // Refresh list in background
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data?.missingFields) {
        setAttemptedStoreName(store.cafeName);
        setMissingFields(error.response.data.missingFields);
        setValidationOpen(true);
      } else {
        console.error('Failed to update status', error);
        alert(error.response?.data?.error || error.response?.data?.message || 'Failed to update store status. Please try again.');
      }
    }
  };

  const handleAction = async (store, actionStatus) => {
    const config = getMappedConfigForStatus(actionStatus);
    if (config) {
      const subject = replacePlaceholders(config.template.subject, store);
      const body = replacePlaceholders(config.template.body, store);
      const to = config.mapping.to.join(', ');
      const cc = config.mapping.cc.join(', ');

      setDraftDialog({
        open: true,
        store,
        status: actionStatus,
        to,
        cc,
        subject,
        body,
        isEditable: false,
        remarks: ''
      });
    } else {
      await proceedWithAction(store, actionStatus);
    }
  };

  const handleStatusDropdownChange = async (store, newStatus) => {
    if (newStatus === 'ON_HOLD') {
      setSelectedStoreForRemarks(store);
      setRemarksText(store.remarks || '');
      setRemarksError(false);
      setRemarksDialogOpen(true);
    } else if (newStatus === 'APPROVED' && store.status === 'PENDING_APPROVAL') {
      setConfirmApproveDialog({ open: true, store });
    } else {
      handleAction(store, newStatus);
    }
  };

  const handleSaveRemarks = async () => {
    if (!remarksText || String(remarksText).trim() === '') {
      setRemarksError(true);
      return;
    }
    setRemarksDialogOpen(false);
    const config = getMappedConfigForStatus('ON_HOLD');
    if (config) {
      const subject = replacePlaceholders(config.template.subject, selectedStoreForRemarks);
      const body = replacePlaceholders(config.template.body, selectedStoreForRemarks);
      const to = config.mapping.to.join(', ');
      const cc = config.mapping.cc.join(', ');

      setDraftDialog({
        open: true,
        store: selectedStoreForRemarks,
        status: 'ON_HOLD',
        to,
        cc,
        subject,
        body,
        isEditable: false,
        remarks: remarksText
      });
    } else {
      try {
        await axios.put(`/api/stores/${selectedStoreForRemarks.id}/status`, { 
          status: 'ON_HOLD', 
          remarks: remarksText 
        });
        fetchStores();
      } catch (error) {
        console.error('Failed to place cafe on hold', error);
      }
    }
  };

  const formatFieldName = (field) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace('Mail Id', 'Mail ID')
      .replace('Gst', 'GST')
      .replace('Fssai', 'FSSAI')
      .replace('Latt', 'Latitude (Short)')
      .replace('Long', 'Longitude')
      .replace('Google Link', 'Google Map Link');
  };

  const statusCounts = stores.reduce((acc, store) => {
    const normStatus = (store.status || '').toUpperCase().trim().replace(/ /g, '_');
    acc.all++;
    if (['PENDING_APPROVAL', 'APPROVAL_PENDING'].includes(normStatus)) acc.pending++;
    else if (['NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE'].includes(normStatus)) acc.approved++;
    else if (normStatus === 'ON_HOLD') acc.onHold++;
    return acc;
  }, { all: 0, pending: 0, approved: 0, onHold: 0 });

  const filteredStores = stores.filter(store => {
    // Search query filter
    let searchMatch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = (store.cafeName || '').toLowerCase().includes(query);
      const codeMatch = (store.cafeCode || '').toLowerCase().includes(query);
      searchMatch = nameMatch || codeMatch;
    }
    
    const normStatus = (store.status || '').toUpperCase().trim().replace(/ /g, '_');
    
    // Approval filter
    let approvalMatch = true;
    if (approvalFilter !== 'ALL') {
      if (approvalFilter === 'NSO_APPROVED') {
        approvalMatch = ['NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE'].includes(normStatus);
      } else {
        if (approvalFilter === 'PENDING_APPROVAL') {
          approvalMatch = ['PENDING_APPROVAL', 'APPROVAL_PENDING'].includes(normStatus);
        } else {
          approvalMatch = normStatus === approvalFilter;
        }
      }
    }

    return searchMatch && approvalMatch;
  });

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-start' },
        gap: 2,
        mb: 4,
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 3
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            NSO Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and approve new store setups before they go live on external delivery partner engines.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            sx={{ width: 160, bgcolor: 'background.paper' }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="PENDING_APPROVAL">Approval Pending</MenuItem>
            <MenuItem value="NSO_APPROVED">Approved</MenuItem>
            <MenuItem value="ON_HOLD">On Hold</MenuItem>
          </TextField>
          <TextField
            size="small"
            placeholder="Search Cafe Name or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300, bgcolor: 'background.paper', borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
      </Box>
    </Box>

      {/* Status Filter Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {[
          { label: 'All Cafes', value: 'ALL', count: statusCounts.all, mainColor: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.08)' },
          { label: 'Pending Approval', value: 'PENDING_APPROVAL', count: statusCounts.pending, mainColor: '#f97316', bgColor: 'rgba(249, 115, 22, 0.08)' },
          { label: 'Approved', value: 'NSO_APPROVED', count: statusCounts.approved, mainColor: '#16a34a', bgColor: 'rgba(22, 163, 74, 0.08)' },
          { label: 'On Hold', value: 'ON_HOLD', count: statusCounts.onHold, mainColor: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.08)' }
        ].map(item => {
          const isActive = approvalFilter === item.value;
          return (
            <Paper
              key={item.value}
              onClick={() => setApprovalFilter(item.value)}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid',
                borderColor: isActive ? item.mainColor : 'divider',
                bgcolor: isActive ? item.bgColor : 'background.paper',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? `0 4px 12px ${item.bgColor}` : '0 1px 3px rgba(0,0,0,0.05)',
                borderRadius: '12px',
                '&:hover': {
                  borderColor: item.mainColor,
                  bgcolor: item.bgColor,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 16px ${item.bgColor}`
                }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: isActive ? item.mainColor : 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                {item.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isActive ? item.mainColor : 'text.primary' }}>
                {item.count}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {successMsg && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 4, 
            borderRadius: '12px',
            '& .MuiAlert-message': { fontWeight: 700 }
          }}
        >
          {successMsg}
        </Alert>
      )}

      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
        <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider', width: 50 }}>S.No.</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider' }}>Cafe Code</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider' }}>Cafe Name</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider' }}>City</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider' }}>Sent to NSO Team By</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.primary', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '2px solid', borderColor: 'divider' }}>Approved By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    {stores.length === 0 ? "No stores pending approval. You're all caught up!" : "No stores match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store, index) => {
                  const isStoreApproved = ['NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE'].includes(store.status);
                  const canClickStore = canApprove && !(user?.role === 'MANAGER' && isStoreApproved);
                  
                  return (
                    <TableRow 
                      key={store.id} 
                      hover={canClickStore}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.82rem' }}>{index + 1}</TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 600, 
                          color: canClickStore ? 'primary.main' : 'text.primary',
                          cursor: canClickStore ? 'pointer' : 'default',
                          textDecoration: canClickStore ? 'underline' : 'none',
                        }}
                        onClick={canClickStore ? () => navigate(`/stores/${store.id}`, { state: { from: '/approvals' } }) : undefined}
                      >
                        {store.cafeCode}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>{store.cafeName}</TableCell>
                      <TableCell>{store.city} - {store.zone}</TableCell>
                      <TableCell>
                        {['NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE'].includes(store.status) || !canApprove || (store.isLocked && user?.role !== 'SUPER_ADMIN') ? (
                          <Chip
                            label={
                              store.status === 'NSO_APPROVED' || store.status === 'APPROVED' ? 'Approved'
                              : store.status === 'READY_TO_GO_LIVE' ? 'Ready to Go Live'
                              : store.status === 'INCOMPLETE_INFORMATION' ? 'Incomplete Information'
                              : store.status === 'PENDING_APPROVAL' ? 'Approval Pending'
                              : store.status === 'ON_HOLD' ? 'On Hold'
                              : store.status === 'LIVE' ? 'Live'
                              : store.status
                            }
                            size="small"
                            sx={{
                              ...getStatusChipStyle(store.status),
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              px: 0.5,
                              width: 190,
                              justifyContent: 'center'
                            }}
                          />
                        ) : (
                          <TextField
                            select
                            size="small"
                            value={store.status}
                            onChange={(e) => handleStatusDropdownChange(store, e.target.value)}
                            sx={{ minWidth: 200 }}
                          >
                            <MenuItem value="PENDING_APPROVAL">Approval Pending</MenuItem>
                            {canApprove && <MenuItem value="APPROVED">Approved</MenuItem>}
                            {canApprove && <MenuItem value="ON_HOLD">On Hold</MenuItem>}
                            {canApprove && <MenuItem value="INCOMPLETE_INFORMATION">Incomplete Information</MenuItem>}
                          </TextField>
                        )}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
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

                      <TableCell sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
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

      {/* Validation Dialog */}
      <Dialog 
        open={validationOpen} 
        onClose={() => setValidationOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '16px', 
            p: 1.5,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            NSO Validation Failed
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These details must be completed before <strong>{attemptedStoreName}</strong> can be approved:
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 280, overflowY: 'auto', borderRadius: '12px', bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
            <List dense>
              {missingFields.map((field, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 32, color: 'error.main' }}>
                    •
                  </ListItemIcon>
                  <ListItemText 
                    primary={formatFieldName(field)} 
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: 'error.dark' }} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setValidationOpen(false)} 
            variant="contained" 
            color="error" 
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* On Hold Remarks Dialog */}
      <Dialog 
        open={remarksDialogOpen} 
        onClose={() => setRemarksDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '16px', 
            p: 1.5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Reason for placing on hold: {selectedStoreForRemarks?.cafeName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide the reason for putting this store on hold. This is required.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Remarks *"
            variant="outlined"
            value={remarksText}
            onChange={(e) => {
              setRemarksText(e.target.value);
              if (e.target.value.trim() !== '') setRemarksError(false);
            }}
            error={remarksError}
            helperText={remarksError ? 'Remarks are mandatory when placing the cafe on hold.' : ''}
            placeholder="Enter the details of what is missing or why this store is on hold..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1.5 }}>
          <Button 
            onClick={() => setRemarksDialogOpen(false)} 
            variant="outlined"
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRemarks} 
            variant="contained" 
            color="primary" 
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Save Reason
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Approval Dialog */}
      <Dialog 
        open={confirmApproveDialog.open} 
        onClose={() => setConfirmApproveDialog({ open: false, store: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '16px', 
            p: 1.5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Confirm Status Update
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to update the status from Pending Approval to Approved?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1.5 }}>
          <Button 
            onClick={() => setConfirmApproveDialog({ open: false, store: null })} 
            variant="outlined"
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            No
          </Button>
          <Button 
            onClick={() => {
              handleAction(confirmApproveDialog.store, 'APPROVED');
              setConfirmApproveDialog({ open: false, store: null });
            }} 
            variant="contained" 
            color="primary" 
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Draft Email Dialog */}
      <Dialog
        open={draftDialog.open}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Draft Email
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Status: {draftDialog.status} — {draftDialog.store?.cafeName}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleDraftCancel}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              disabled={draftDialog.isEditable || loading}
              onClick={() => setDraftDialog(prev => ({ ...prev, isEditable: true }))}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Modify
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={sendingEmail ? <CircularProgress size={14} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
              onClick={handleSendEmail}
              disabled={loading || sendingEmail}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              {sendingEmail ? 'Sending…' : 'Send'}
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="To"
              value={draftDialog.to}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="CC"
              value={draftDialog.cc}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Subject"
              value={draftDialog.subject}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={12}
              label="Body"
              value={draftDialog.body}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.value }))}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
