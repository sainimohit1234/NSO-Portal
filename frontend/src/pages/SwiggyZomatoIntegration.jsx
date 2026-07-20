import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, IconButton,
  Tooltip, Snackbar, Alert, CircularProgress, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Stack, Chip, Select, MenuItem
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import BlockIcon from '@mui/icons-material/Block';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AssignmentIcon from '@mui/icons-material/Assignment';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fetchStoresFromFirestore } from '../services/storeService';
import FullScreenLoader from '../components/FullScreenLoader';

// ─── HTML template parsing and compiling helpers ───────────────────────────────


const compileVisualToHtml = (intro, outro, table) => {
  const formattedIntro = (intro || '').replace(/\n/g, '<br />');
  const formattedOutro = (outro || '').replace(/\n/g, '<br />');
  
  let html = formattedIntro;
  if (table) {
    html += '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">';
    html += '<thead><tr style="background-color: #f8fafc;">';
    table.headers.forEach(h => {
      const bgStyle = h.bgColor ? ` background-color: ${h.bgColor};` : '';
      const colorStyle = h.textColor ? ` color: ${h.textColor};` : '';
      html += `<th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold;${bgStyle}${colorStyle}">${h.text}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    table.rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        const bgStyle = cell.bgColor ? ` background-color: ${cell.bgColor};` : '';
        const colorStyle = cell.textColor ? ` color: ${cell.textColor};` : '';
        html += `<td style="border: 1px solid #cbd5e1; padding: 8px;${bgStyle}${colorStyle}">${cell.text}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
  }
  html += formattedOutro;
  return html;
};

// ─── Brand detection helper ───────────────────────────────────────────────────
const getBrandType = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('got tea') || b.includes('gottea') || b.includes('got_tea')) return 'gotTea';
  if (b.includes('suchali')) return 'suchali';
  return 'blueTokkai';
};

const getBrandLabel = (brand) => {
  if (brand === 'BLUE_TOKAI_SUCHALI') return "Blue Tokai / Suchali's";
  if (brand === 'GOT_TEA') return 'Got Tea';
  const t = getBrandType(brand);
  if (t === 'gotTea') return 'Got Tea';
  if (t === 'suchali') return "Suchali's Artisan Bakehouse";
  return 'Blue Tokai';
};

// ─── Mail-status helpers (shared by status computation and row rendering) ─────
// Business rule: stores created before 8 Jul 2026 (IST) are pre-existing legacy
// stores that are already integrated — they always show as "Integration
// Completed". Stores created on/after 8 Jul 2026 follow the standard onboarding
// flow (Pending → Mail Sent → Needs Follow-up → Integration Completed).
const INTEGRATION_FLOW_START = new Date('2026-07-08T00:00:00+05:30').getTime();

const isExistingLegacyStore = (store) => {
  // Existing cafes are synced from Redshift and have NO createdAt (only a recent
  // updatedAt). A store is "new/standard flow" ONLY if it was created in the
  // portal on/after 8 Jul 2026. Anything without a createdAt, or created before
  // the cutoff, is a pre-existing cafe and is already integrated.
  // NOTE: never fall back to updatedAt — it changes on every edit.
  if (!store.createdAt) return true;
  const parsedDate = store.createdAt._seconds
    ? store.createdAt._seconds * 1000
    : new Date(store.createdAt).getTime();
  return isNaN(parsedDate) || parsedDate < INTEGRATION_FLOW_START;
};

const isMailSent = (store, statusValue, isRista = false) => {
  if (statusValue === 'Sent' || statusValue === 'SENT') return true;
  if (isRista) return false;
  return isExistingLegacyStore(store);
};

const isMandatoryInfoMissing = (store) => {
  const gst = store?.gstNo || '';
  const fssai = store?.fssaiNo || '';
  const phone = store?.cafePhoneNumber || store?.phone || '';
  const email = store?.cafeMailId || store?.email || '';
  return !gst.trim() || !fssai.trim() || !phone.trim() || !email.trim();
};

// ─── Integration status computation ──────────────────────────────────────────
const computeIntegrationStatus = (store) => {
  if (store.status === 'PENDING_APPROVAL' || store.status === 'Approval Pending') {
    return { label: 'Approval Pending', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
  }

  // Legacy stores (created before the flow start date) are already integrated.
  if (isExistingLegacyStore(store)) {
    return { label: 'Integration Completed', color: '#14532d', bg: '#dcfce7', border: '#86efac' };
  }

  if (isMandatoryInfoMissing(store)) {
    return { label: 'Docs Pending', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' };
  }

  const brandType = getBrandType(store.brand);
  let requiredEmailFields, requiredRIDFields;
  switch (brandType) {
    case 'gotTea':
      requiredEmailFields = ['gotTeaZomatoMailStatus', 'gotTeaSwiggyMailStatus'];
      requiredRIDFields = ['gotTeaZomatoRID', 'gotTeaSwiggyRID'];
      break;
    case 'suchali':
      requiredEmailFields = ['suchaliZomatoMailStatus', 'suchaliSwiggyMailStatus'];
      requiredRIDFields = ['suchaliZomatoRID', 'suchaliSwiggyRID'];
      break;
    default:
      requiredEmailFields = ['btZomatoMailStatus', 'btSwiggyMailStatus'];
      requiredRIDFields = ['blueTokaiZomatoRID', 'blueTokaiSwiggyRID'];
  }

  const allEmailsSent = requiredEmailFields.every(
    f => isMailSent(store, store[f])
  );

  if (!allEmailsSent) {
    return { label: 'Pending', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' };
  }

  const allRIDsFilled = requiredRIDFields.every(
    f => store[f] && String(store[f]).trim() !== ''
  );

  if (allRIDsFilled) {
    return { label: 'Integration Completed', color: '#14532d', bg: '#dcfce7', border: '#86efac' };
  }

  const mailSentAt = store.integrationMailSentAt
    ? new Date(store.integrationMailSentAt)
    : null;

  if (!mailSentAt) {
    return { label: 'Mail Sent', color: '#1e3a8a', bg: '#dbeafe', border: '#93c5fd' };
  }

  const daysSinceSent = (Date.now() - mailSentAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceSent >= 4) {
    return { label: 'Needs to Follow-up with Swiggy / Zomato', color: '#7f1d1d', bg: '#fee2e2', border: '#fca5a5' };
  }

  const daysRemaining = Math.ceil(4 - daysSinceSent);
  return { label: `Mail Sent · ${daysRemaining}d left`, color: '#1e3a8a', bg: '#dbeafe', border: '#93c5fd' };
};

// Collapse the granular status label into one of the four filter categories.
const getStatusCategory = (store) => {
  const label = computeIntegrationStatus(store).label;
  if (label === 'Approval Pending') return 'Approval Pending';
  if (label === 'Docs Pending') return 'Docs Pending';
  if (label.startsWith('Needs to Follow-up') || label.startsWith('Needs Follow-up')) return 'Needs to Follow-up with Swiggy / Zomato';
  if (label.startsWith('Mail Sent')) return 'Mail Sent';
  if (label.startsWith('Integration Completed')) return 'Integration Completed';
  return 'Pending';
};


export default function SwiggyZomatoIntegration() {
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const isFinance = user?.role === 'FINANCE';
  const canModify = !isUser && !isFinance;
  // Re-sending an onboarding mail that already went out is admin-only — a duplicate
  // mail is confusing for Swiggy/Zomato to receive. The API enforces this too.
  const canResendMail = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [, setEmailMappings] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [draftDialog, setDraftDialog] = useState({
    open: false, store: null, brandKey: '', brandLabel: '', to: '', cc: '', subject: '', body: '',
    intro: '', outro: '', tableData: null, attachments: []
  });
  const [isDraftEditing, setIsDraftEditing] = useState(false);
  const bodyRef = useRef(null);
  const [attachmentPreview, setAttachmentPreview] = useState({ open: false, blobUrl: '', fileName: '', loading: false, error: '', isImage: false });

  // The preview endpoint sits behind authenticateToken and the API answers every
  // request with X-Frame-Options: DENY, so a plain <iframe src> (which carries no
  // Authorization header) can never render it. Fetch it through the authenticated
  // axios client instead and hand the viewer a local blob URL.
  const openAttachmentPreview = async (previewUrl, fileName) => {
    setAttachmentPreview(prev => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return { open: true, blobUrl: '', fileName, loading: true, error: '', isImage: false };
    });
    try {
      const resp = await axios.get(previewUrl, { responseType: 'blob' });
      const contentType = resp.headers['content-type'] || resp.data.type || '';
      const blobUrl = URL.createObjectURL(resp.data);
      setAttachmentPreview(prev => (prev.open && prev.fileName === fileName)
        ? { ...prev, blobUrl, loading: false, isImage: contentType.startsWith('image/') }
        : (URL.revokeObjectURL(blobUrl), prev));
    } catch (err) {
      console.error('Attachment preview failed:', err);
      setAttachmentPreview(prev => (prev.open && prev.fileName === fileName)
        ? { ...prev, loading: false, error: 'Could not load this attachment. Please try again.' }
        : prev);
    }
  };

  const closeAttachmentPreview = () => {
    setAttachmentPreview(prev => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return { ...prev, open: false, blobUrl: '' };
    });
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchStoresFromFirestore(),
      axios.get('/api/system/email-mappings')
    ])
      .then(([fetchedStores, mappingsRes]) => {
        const filtered = fetchedStores.filter(s =>
          s.isActive !== false &&
          s.isActive !== 'false' &&
          ['PENDING_APPROVAL', 'APPROVAL_PENDING', 'APPROVED', 'NSO_APPROVED', 'COMPLIANCE_APPROVED', 'COMPLIANCE APPROVED', 'READY_TO_GO_LIVE', 'LIVE', 'CLOSED'].includes(s.status)
        );
        filtered.sort((a, b) => (a.cafeName || '').localeCompare(b.cafeName || ''));
        setStores(filtered);
        setEmailMappings(mappingsRes.data || []);
      })
      .catch(err => {
        console.error('Failed to load Partner Integration Hub data:', err);
        setSnackbar({ open: true, message: 'Failed to load store data.', severity: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  const getDraftLabel = (brandKey) => {
    switch (brandKey) {
      case 'zomato_btc': return 'Draft a mail for BTC | Zomato';
      case 'swiggy_btc': return 'Draft a mail for BTC | Swiggy';
      case 'zomato_sab': return 'Draft a mail for SAB | Zomato';
      case 'swiggy_sab': return 'Draft a mail for SAB | Swiggy';
      case 'zomato_gottea': return 'Draft a mail for GT | Zomato';
      case 'swiggy_gottea': return 'Draft a mail for GT | Swiggy';
      case 'rista_creation': return 'Draft Mail for Rista';
      default: return 'Draft a mail';
    }
  };

  // Count of stores in each status category (drives the filter chip badges).
  const statusCounts = useMemo(() => {
    const counts = { 'Approval Pending': 0, 'Docs Pending': 0, 'Pending': 0, 'Dotpe Pending': 0, 'Mail Sent': 0, 'Needs to Follow-up with Swiggy / Zomato': 0, 'Integration Completed': 0 };
    stores.forEach(s => { 
      counts[getStatusCategory(s)] = (counts[getStatusCategory(s)] || 0) + 1; 
      if (!isMailSent(s, s.ristaMailStatus, true)) {
        counts['Dotpe Pending'] = (counts['Dotpe Pending'] || 0) + 1;
      }
    });
    return counts;
  }, [stores]);

  const filteredStores = useMemo(() =>
    stores.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = (
        (s.cafeName || '').toLowerCase().includes(q) ||
        (s.cafeCode || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q)
      );
      const matchesStatus = !statusFilter || (statusFilter === 'Dotpe Pending' ? !isMailSent(s, s.ristaMailStatus, true) : getStatusCategory(s) === statusFilter);
      return matchesSearch && matchesStatus;
    }),
    [stores, searchQuery, statusFilter]
  );

  const handleRIDChange = (storeId, field, rawValue) => {
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, [field]: numericValue } : s));
  };

  const handleSaveRow = async (store) => {
    try {
      setLoading(true);
      await axios.put(`/api/stores/${store.id}`, {
        blueTokaiZomatoRID: store.blueTokaiZomatoRID || null,
        blueTokaiSwiggyRID: store.blueTokaiSwiggyRID || null,
        suchaliZomatoRID: store.suchaliZomatoRID || null,
        suchaliSwiggyRID: store.suchaliSwiggyRID || null,
        gotTeaZomatoRID: store.gotTeaZomatoRID || null,
        gotTeaSwiggyRID: store.gotTeaSwiggyRID || null
      });
      setSnackbar({ open: true, message: 'RID credentials saved successfully.', severity: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to save RID credentials.', severity: 'error' });
      setLoading(false);
    }
  };


  const handleSendOnboardingEmail = async () => {
    const { store, brandKey, to, cc, subject, body, attachments } = draftDialog;
    const currentBody = bodyRef.current ? bodyRef.current.innerHTML : body;
    const draftLabel = draftDialog.brandLabel;
    // Pass attachment URLs so backend can fetch and embed them
    const attachmentUrls = (attachments || []).map(a => ({ fileName: a.fileName, fileUrl: a.fileUrl || a.url, isGST: !!a._isGST, isFSSAI: !!a._isFSSAI }));
    try {
      setLoading(true);
      const resp = await axios.post(`/api/stores/${store.id}/send-swiggy-onboarding-email`, { brand: brandKey, to, cc, subject, body: currentBody, draftLabel, attachmentUrls });
      const failed = resp.data?.failedAttachments || [];
      if (failed.length > 0) {
        setSnackbar({ open: true, message: resp.data?.message || `Email sent, but ${failed.length} attachment(s) failed.`, severity: 'warning' });
      } else {
        setSnackbar({ open: true, message: draftDialog.isResend ? 'Onboarding email resent successfully.' : 'Onboarding email sent successfully.', severity: 'success' });
      }
      setDraftDialog(prev => ({ ...prev, open: false, store: null }));
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to send onboarding email.', severity: 'error' });
      setLoading(false);
    }
  };

  const NA_CELL_STYLE = { color: 'text.disabled', bgcolor: 'rgba(0,0,0,0.025)' };
  const MAIL_CELL_STYLE = { bgcolor: 'rgba(240, 253, 244, 0.2)' };
  const RID_CELL_STYLE = { bgcolor: 'rgba(239, 246, 255, 0.2)' };

  return (
    <Box sx={{ width: '100%', px: 0, py: 1 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
            Partner Integration Hub
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage onboarding triggers, platforms communications, and restaurant ID records for Approved cafes.
          </Typography>
        </Box>
        <Button variant="outlined" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />} onClick={loadData}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          {loading ? 'Refreshing…' : 'Refresh Data'}
        </Button>
      </Stack>

      {/* Slim progress bar during any load/refresh, even when rows are already shown */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 999, height: 4 }} />}

      {/* Search */}
      <Card sx={{ borderRadius: '12px', mb: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <TextField fullWidth placeholder="Search stores by name, code, or city..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>, style: { borderRadius: '8px' } } }} />
        </CardContent>
      </Card>

      {/* Status Filters — click a tile to filter the table by that status */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, minmax(0, 1fr))',
            md: 'repeat(7, minmax(0, 1fr))'
          },
          gap: 2,
          mb: 3.5
        }}
      >
        {[
          { label: 'Approval Pending', color: '#f59e0b', icon: <HourglassEmptyIcon /> },
          { label: 'Docs Pending', color: '#ef4444', icon: <DescriptionIcon /> },
          { label: 'Pending', color: '#f59e0b', icon: <HourglassEmptyIcon /> },
          { label: 'Dotpe Pending', color: '#8b5cf6', icon: <HourglassEmptyIcon /> },
          { label: 'Mail Sent', color: '#3b82f6', icon: <SendIcon /> },
          { label: 'Needs to Follow-up with Swiggy / Zomato', color: '#ef4444', icon: <AssignmentIcon /> },
          { label: 'Integration Completed', color: '#10b981', icon: <CheckCircleIcon /> }
        ].map(s => {
          const isActive = statusFilter === s.label;
          return (
            <Card
              key={s.label}
              onClick={() => setStatusFilter(isActive ? null : s.label)}
              sx={{
                background: isActive 
                  ? `linear-gradient(135deg, ${s.color}, ${s.color}e6)` 
                  : `linear-gradient(135deg, #ffffff, ${s.color}15)`,
                color: isActive ? '#ffffff' : 'inherit',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: isActive ? 'transparent' : `${s.color}30`,
                boxShadow: isActive 
                  ? `0 12px 24px ${s.color}40, inset 0 2px 0 rgba(255,255,255,0.2)`
                  : '0 4px 12px rgba(0,0,0,0.04)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                opacity: statusFilter !== null && !isActive ? 0.65 : 1,
                transform: isActive ? 'scale(1.02)' : 'none',
                '&:hover': {
                  transform: isActive ? 'scale(1.02) translateY(-2px)' : 'translateY(-3px)',
                  boxShadow: isActive 
                    ? `0 16px 32px ${s.color}50`
                    : `0 8px 16px ${s.color}20`,
                  opacity: 1,
                  borderColor: isActive ? 'transparent' : `${s.color}50`,
                  background: isActive 
                    ? `linear-gradient(135deg, ${s.color}, ${s.color}f2)`
                    : `linear-gradient(135deg, #ffffff, ${s.color}25)`,
                },
                '&::after': isActive ? {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '50%',
                  height: '100%',
                  background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                  transform: 'skewX(-20deg)',
                  animation: 'shimmerEffect 2.5s infinite',
                  pointerEvents: 'none',
                } : {},
                '@keyframes shimmerEffect': {
                  '0%': { left: '-100%' },
                  '100%': { left: '200%' }
                }
              }}
            >
              {/* Glassmorphic Background Glow */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: isActive 
                    ? `radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)`
                    : `radial-gradient(circle, ${s.color}20 0%, ${s.color}00 70%)`
                }}
              />
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box 
                    sx={{ 
                      p: 1.2, 
                      borderRadius: '12px', 
                      bgcolor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${s.color}12`,
                      color: isActive ? '#ffffff' : s.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: isActive ? '#ffffff' : 'text.primary', letterSpacing: '-0.02em' }}>
                    {statusCounts[s.label] || 0}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'text.secondary', lineHeight: 1.2 }}>
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', ml: 1 }}>
        · 4-day countdown starts when all required emails are sent
      </Typography>

      {/* Main Table */}
      <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer component={Paper} sx={{ maxHeight: '80vh', borderRadius: '16px', boxShadow: 'none', overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1500 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 50, minWidth: 50, maxWidth: 50, position: 'sticky', left: 0, zIndex: 12, bgcolor: 'background.paper' }}>S.No.</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 130, minWidth: 130, maxWidth: 130, position: 'sticky', left: 50, zIndex: 12, bgcolor: 'background.paper' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 130, minWidth: 130, maxWidth: 130, position: 'sticky', left: 180, zIndex: 12, bgcolor: 'background.paper' }}>Brand</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, maxWidth: 100, position: 'sticky', left: 310, zIndex: 12, bgcolor: 'background.paper' }}>Cafe Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 160, minWidth: 160, maxWidth: 160, position: 'sticky', left: 410, zIndex: 12, bgcolor: 'background.paper', borderRight: '2px solid', borderColor: 'divider' }}>Cafe Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#fef2f2' }}>Rista Store Creation Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#f0fdf4' }}>Blue Tokai Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#f0fdf4' }}>Blue Tokai Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#f0fdf4' }}>Suchali's Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#f0fdf4' }}>Suchali's Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#f0fdf4' }}>Got Tea Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, minWidth: 100, bgcolor: '#f0fdf4' }}>Got Tea Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 150, minWidth: 150, bgcolor: '#eff6ff' }}>Blue Tokai Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 150, minWidth: 150, bgcolor: '#eff6ff' }}>Blue Tokai Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 150, minWidth: 150, bgcolor: '#eff6ff' }}>Suchali's Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 150, minWidth: 150, bgcolor: '#eff6ff' }}>Suchali's Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 150, minWidth: 150, bgcolor: '#eff6ff' }}>Got Tea Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 150, minWidth: 150, bgcolor: '#eff6ff' }}>Got Tea Swiggy RID</TableCell>
                  {canModify && <TableCell sx={{ fontWeight: 800, width: 90, position: 'sticky', right: 0, zIndex: 12, bgcolor: '#f8fafc', borderLeft: '2px solid', borderColor: 'divider' }} align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && stores.length === 0 ? (
                  <TableRow><TableCell colSpan={19} align="center" sx={{ py: 4, borderBottom: 'none' }}>
                      <FullScreenLoader messages={[
                        'Warming up the espresso machine…',
                        'Grinding the freshest beans…',
                        'Fetching approved stores…',
                        'Checking Swiggy & Zomato status…',
                        'Plating the details…',
                        'Almost ready to serve ☕',
                      ]} />
                  </TableCell></TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow><TableCell colSpan={19} align="center" sx={{ py: 8, color: 'text.secondary', fontStyle: 'italic', borderBottom: 'none' }}>
                    <Box sx={{ position: 'sticky', left: '50%', transform: 'translateX(-50%)', display: 'inline-block' }}>
                      {searchQuery || statusFilter
                        ? 'No stores match the current search / filter.'
                        : 'No approved stores available.'}
                    </Box>
                  </TableCell></TableRow>
                ) : filteredStores.map((store, index) => {
                  const brandType = getBrandType(store.brand);
                  const isGotTea = brandType === 'gotTea';

                  // Field disable logic
                  const isPendingApproval = store.status === 'PENDING_APPROVAL' || store.status === 'Approval Pending';
                  const btDisabled = isPendingApproval || isGotTea;
                  const suchaliDisabled = isPendingApproval || isGotTea;
                  const gotTeaDisabled = isPendingApproval || !isGotTea;

                  const integStatus = computeIntegrationStatus(store);

                  const replacePlaceholders = (text, storeData) => {
                    if (!text || !storeData) return text;
                    const completeAddress = [
                      storeData.cafeAddress || storeData.address,
                      storeData.city,
                      storeData.state,
                      storeData.pinCode
                    ].filter(Boolean).join(', ');

                    // Lat/Long — store has multiple field names
                    const lat = storeData.latitude || storeData.latt || storeData.lat || '';
                    const lng = storeData.long || storeData.lng || '';
                    const latLng = storeData.lattLong || (lat && lng ? `${lat}, ${lng}` : lat || lng || '');

                    // Timings
                    const openingTime = storeData.cafeOpenTiming || storeData.openingTime || storeData.cafeOpeningHr || '';
                    const closingTime = storeData.cafeClosingTime || storeData.actualClosingTime || storeData.closingTime || '';

                      const placeholderMap = {
                      // Basic cafe info
                      '[Brand Name]': getBrandType(storeData.brand) === 'gotTea' ? 'Got Tea' : 'Blue Tokai Coffee Roasters',
                      '[Cafe Name]': storeData.cafeName || '',
                      '[Display Name]': storeData.cafeName || '',
                      '[Cafe Code]': storeData.cafeCode || '',

                      // Location
                      '[City]': storeData.city || '',
                      '[State]': storeData.state || '',
                      '[Pin Code]': storeData.pinCode || '',
                      '[PinCode]': storeData.pinCode || '',
                      '[Pincode]': storeData.pinCode || '',
                      '[Address]': completeAddress || '',
                      '[Cafe Address]': completeAddress || '',
                      '[Cafe Address]': completeAddress || '',
                      '[Complete Address]': completeAddress || '',
                      '[New Outlet City]': storeData.city || '',
                      '[New Outlet City*]': storeData.city || '',

                      // Lat/Long
                      '[Latitude]': String(lat || ''),
                      '[Longitude]': String(lng || ''),
                      '[Lat]': String(lat || ''),
                      '[Long]': String(lng || ''),
                      '[Lat & Long]': latLng,
                      '[Lat Long]': latLng,
                      '[LatLong]': latLng,
                      '[Lat & long]': latLng,

                      // Timings
                      '[Cafe Opening Time]': openingTime,
                      '[Cafe Opening Time]': openingTime,
                      '[Opening Time]': openingTime,
                      '[Cafe Closing Time]': closingTime,
                      '[Cafe Closing Time]': closingTime,
                      '[Closing Time]': closingTime,
                      '[Restaurant Timings]': openingTime && closingTime ? `${openingTime} - ${closingTime}` : openingTime || closingTime || '',

                      // Contact
                      '[Phone]': storeData.cafePhoneNumber || storeData.phone || '',
                      '[Cafe Phone]': storeData.cafePhoneNumber || storeData.phone || '',
                      '[Cafe Phone]': storeData.cafePhoneNumber || storeData.phone || '',
                      '[Cafe Phone Number]': storeData.cafePhoneNumber || storeData.phone || '',
                      '[Cafe Phone Number]': storeData.cafePhoneNumber || storeData.phone || '',
                      '[Owner Phone Number]': storeData.cafePhoneNumber || storeData.phone || '',
                      '[Email]': storeData.cafeMailId || storeData.email || '',
                      '[Cafe Email]': storeData.cafeMailId || storeData.email || '',
                      '[Cafe Email]': storeData.cafeMailId || storeData.email || '',
                      '[Cafe Mail ID]': storeData.cafeMailId || storeData.email || '',
                      '[Cafe Mail ID]': storeData.cafeMailId || storeData.email || '',
                      '[Order Notification Email ID]': storeData.cafeMailId || storeData.email || '',
                      '[Cafe Mail Id]': storeData.cafeMailId || storeData.email || '',
                      '[Order Manager Number]': storeData.cafePhoneNumber || storeData.cafeManagerContactNo || storeData.phone || '',

                      // Manager details
                      '[Cafe Manager]': storeData.cafeManagerName || '',
                      '[Cafe Manager]': storeData.cafeManagerName || '',
                      '[Cafe Manager Name]': storeData.cafeManagerName || '',
                      '[Cafe Manager Name]': storeData.cafeManagerName || '',
                      '[Cafe Manager Email]': storeData.cafeManagerMailId || '',
                      '[Cafe Manager Email]': storeData.cafeManagerMailId || '',
                      '[Cafe Manager Phone]': storeData.cafeManagerContactNo || '',
                      '[Cafe Manager Phone]': storeData.cafeManagerContactNo || '',

                      // GST / FSSAI
                      '[Brand]': storeData.brand || '',
                      '[GST Number]': storeData.gstNo || '',
                      '[GST No]': storeData.gstNo || '',
                      '[GST No.]': storeData.gstNo || '',
                      '[FSSAI Number]': storeData.fssaiNo || '',
                      '[FSSAI No]': storeData.fssaiNo || '',
                      '[FSSAI No.]': storeData.fssaiNo || '',
                      '[FSSAI License]': storeData.fssaiLicense || storeData.fssaiNo || '',

                      // Google/Map link
                      '[Cafe Location Google Link]': storeData.cafeLocationGoogleLink || '',
                      '[Cafe Location Google Link]': storeData.cafeLocationGoogleLink || '',
                      '[Google Link]': storeData.cafeLocationGoogleLink || '',
                      '[Map Link]': storeData.cafeLocationGoogleLink || '',
                      '[Location Link]': storeData.cafeLocationGoogleLink || '',

                      // Store type / city type
                      '[City Type]': storeData.storeType || storeData.platformType || storeData.tradingArea || '',
                      '[Store Type]': storeData.storeType || '',
                      '[Cafe Type]': storeData.storeType || '',
                      '[Cafe Type]': storeData.storeType || '',
                      '[Cafe Model]': storeData.cafeModel || '',
                      '[Cafe Model]': storeData.cafeModel || '',

                      // Swiggy / Zomato IDs
                      '[Swiggy ID]': storeData.swiggyId || storeData.blueTokaiSwiggyRID || '',
                      '[Zomato ID]': storeData.zomatoId || storeData.blueTokaiZomatoRID || '',
                      '[RID]': storeData.blueTokaiSwiggyRID || storeData.swiggyId || '',

                      // Zone / cluster
                      '[Zone]': storeData.zone || '',
                      '[Cluster]': storeData.cluster || '',
                      '[Location]': storeData.location || completeAddress || '',

                      // Launch / other
                      '[Launch Date]': storeData.launchDate ? new Date(storeData.launchDate).toLocaleDateString('en-IN') : '',
                      '[Launch Month]': storeData.cafeLaunchMonth || '',

                      // New fields
                      '[Café Module]': storeData.cafeModule || '',
                      '[Cafe Module]': storeData.cafeModule || '',
                      '[Actual Closing Time]': storeData.actualClosingTime || '',
                      '[Price Book Name]': storeData.priceBookRista || storeData.pricingVersion || '',
                      '[Price Book (Rista)]': storeData.priceBookRista || storeData.pricingVersion || '',
                    };

                    // Resolve Copy Menu From
                    let copyMenuFromName = storeData.copyMenuFrom || '';
                    if (copyMenuFromName && typeof stores !== 'undefined' && Array.isArray(stores)) {
                      const copyStore = stores.find(s => s.id === copyMenuFromName || s.cafeCode === copyMenuFromName);
                      if (copyStore) {
                        const namePart = copyStore.cafeName || '';
                        const codePart = copyStore.cafeCode ? `(${copyStore.cafeCode})` : '';
                        copyMenuFromName = [namePart, codePart].filter(Boolean).join(' ');
                      }
                    }
                    placeholderMap['[Copy Menu From]'] = copyMenuFromName;

                    let result = text;
                    for (const [token, value] of Object.entries(placeholderMap)) {
                      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      result = result.replace(new RegExp(escaped, 'gi'), value);
                    }
                    return result.replace(/<br\s*[\/]?>/gi, '\n');
                  };

                  const handleOpenDraftDialog = async (currentStore, brandKey, options = {}) => {
                    const { isResend = false } = options;
                    const fssaiDoc = Array.isArray(currentStore.documents)
                      ? [...currentStore.documents]
                          .filter(d => d.type === 'FSSAI License' && d.url)
                          .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))[0]
                      : null;

                    if (!isResend && !fssaiDoc && brandKey !== 'rista_creation') {
                      setSnackbar({
                        open: true,
                        message: 'FSSAI License is not available for this cafe. Please upload the FSSAI License in the Legal Documents section before drafting or sending the email.',
                        severity: 'error'
                      });
                      return;
                    }

                    try {
                      setLoading(true);
                      const subCategoryKey = brandKey === 'rista_creation' ? 'Draft Mail for Rista Creation' : getDraftLabel(brandKey);
                      const [templatesRes, mappingsRes] = await Promise.all([
                        axios.get('/api/system/email-templates'),
                        axios.get('/api/system/email-mappings'),
                      ]);
                      const templates = templatesRes.data || {};
                      const mappings = Array.isArray(mappingsRes.data) ? mappingsRes.data : [];
                      const mapping = mappings.find(
                        m => m.subCategory?.toLowerCase() === subCategoryKey.toLowerCase()
                      );

                      const template = templates[subCategoryKey] || {};
                      const rawSubject = template.subject || `${subCategoryKey} | New Store Onboarding`;
                      const rawBody = template.body || '';

                      const subject = replacePlaceholders(rawSubject, currentStore);
                      
                      let body = '';
                      if (options?.isFollowUp) {
                        body = `Dear Team,<br/><br/>I hope you are doing well.<br/><br/>This is a gentle follow-up regarding the email shared ${options.daysSinceSent} days ago. We are awaiting your response and would appreciate it if you could provide an update on the current status.<br/><br/>Kindly let us know if any additional information or documents are required from our end to move this forward.<br/><br/>Looking forward to your response.<br/><br/>Thanks & Regards,`;
                      } else {
                        body = replacePlaceholders(rawBody, currentStore).replace(/\\n/g, '<br/>');
                        // Enforce single-row styling for the Attribute column (first column) to be sent in the email HTML
                        try {
                          const parser = new DOMParser();
                          const doc = parser.parseFromString(body, 'text/html');
                          const tables = doc.querySelectorAll('table');
                          tables.forEach(table => {
                            table.style.width = '100%';
                            table.style.tableLayout = 'auto';
                            const rows = table.querySelectorAll('tr');
                            rows.forEach(row => {
                              const firstTh = row.querySelector('th');
                              if (firstTh) {
                                firstTh.style.whiteSpace = 'nowrap';
                                firstTh.style.width = '1%';
                              }
                              const firstTd = row.querySelector('td');
                              if (firstTd) {
                                firstTd.style.whiteSpace = 'nowrap';
                                firstTd.style.width = '1%';
                              }
                            });
                          });
                          body = doc.body.innerHTML;
                        } catch (e) {
                          console.error('Error parsing email HTML to inject styles', e);
                        }
                      }
                      const toList = (mapping?.to || []).join(', ');
                      const ccList = (mapping?.cc || []).join(', ');

                      // Fetch all three sources of auto-attachments and merge them:
                      // 1. Status Category docs (original logic — category matches the draft label e.g. "Draft a mail for BTC | Swiggy")
                      // 2. General category docs (always attached to all emails)
                      // 3. State GST certificate matching the cafe's state
                      let statusCategoryAttachments = [];
                      let generalAttachments = [];
                      let gstAttachment = null;
                      let gstMissing = false;

                      try {
                        const globalDocsRes = await axios.get('/api/global-docs');
                        const allDocs = globalDocsRes.data || [];

                        // 1. Original: Status Category — docs whose category matches the draft label
                        statusCategoryAttachments = allDocs.filter(
                          d => d.category?.toLowerCase() === subCategoryKey.toLowerCase()
                        );

                        // 2. New: General category — always attach
                        generalAttachments = allDocs.filter(
                          d => d.category?.toLowerCase() === 'general'
                        );

                        // 3. New: State GST based on cafe's state
                        if (currentStore.state) {
                          const stateGst = allDocs.find(
                            d => d.category === 'State GST' && d.fileName === currentStore.state
                          );
                          if (stateGst) {
                            gstAttachment = { ...stateGst, _isGST: true };
                          } else {
                            gstMissing = true;
                          }
                        }
                      } catch (docsErr) {
                        console.warn('Could not fetch auto-attachments:', docsErr);
                      }

                      // Merge all, deduplicate by doc id
                      const seenIds = new Set();
                      const autoAttachments = (brandKey === 'rista_creation' || options?.isFollowUp) ? [] : [
                        ...statusCategoryAttachments,
                        ...generalAttachments,
                        ...(gstAttachment ? [gstAttachment] : []),
                        ...(fssaiDoc ? [{
                          id: fssaiDoc.id || 'fssai-license-attachment',
                          fileName: fssaiDoc.fileName || 'FSSAI License',
                          fileUrl: fssaiDoc.url || fssaiDoc.fileUrl,
                          url: fssaiDoc.url || fssaiDoc.fileUrl,
                          _isFSSAI: true
                        }] : [])
                      ].filter(doc => {
                        if (seenIds.has(doc.id)) return false;
                        seenIds.add(doc.id);
                        return true;
                      });


                      setIsDraftEditing(false);
                      
                      let dialogBrandLabel = getDraftLabel(brandKey).replace('Draft a mail for ', '');
                      if (options?.isFollowUp) dialogBrandLabel += ' (Follow-up)';

                      setDraftDialog({
                        open: true,
                        store: currentStore,
                        brandKey,
                        brandLabel: dialogBrandLabel,
                        to: toList,
                        cc: ccList,
                        subject,
                        body,
                        intro: '',
                        outro: '',
                        tableData: null,
                        attachments: autoAttachments,
                        gstMissing,
                        isResend,
                      });
                    } catch (err) {
                      console.error(err);
                      setSnackbar({ open: true, message: 'Failed to load email template.', severity: 'error' });
                    } finally {
                      setLoading(false);
                    }
                  };

                  const renderMail = (statusVal, brandKey, brandLabel, mappingId, disabled, ridFieldName = null) => {
                    if (disabled) return <Tooltip title="Not applicable for this brand"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled', fontSize: '0.75rem' }}><BlockIcon sx={{ fontSize: 14 }} /><span>N/A</span></Box></Tooltip>;
                    const isSent = isMailSent(store, statusVal, brandKey === 'rista_creation');
                    if (isSent) {
                      let isFollowUp = false;
                      let daysSinceSent = 0;
                      if (brandKey !== 'rista_creation' && ridFieldName) {
                        const ridValue = store[ridFieldName];
                        const isRidBlank = !ridValue || String(ridValue).trim() === '';
                        const mailSentAt = store.integrationMailSentAt ? new Date(store.integrationMailSentAt) : null;
                        if (isRidBlank && mailSentAt) {
                          daysSinceSent = Math.floor((Date.now() - mailSentAt.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysSinceSent >= 4) {
                            isFollowUp = true;
                          }
                        }
                      }

                      if (isFollowUp) {
                        return (
                          <Chip 
                            label="Follow-up Mail" 
                            size="small" 
                            onClick={() => handleOpenDraftDialog(store, brandKey, { isFollowUp: true, daysSinceSent })}
                            sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', '&:hover': { bgcolor: '#fecaca' } }} 
                          />
                        );
                      }

                      const sentChip = (
                        <Chip icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#16a34a !important' }} />} label="Sent" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, borderRadius: '6px' }} />
                      );
                      // Non-admins see the status only; admins get a resend action beside it.
                      if (!canResendMail) return sentChip;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {sentChip}
                          <Tooltip title={`Resend — ${getDraftLabel(brandKey).replace('Draft a mail for ', '')}`}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDraftDialog(store, brandKey, { isResend: true })}
                              sx={{ color: '#16a34a', p: 0.25, '&:hover': { bgcolor: '#dcfce7' } }}
                            >
                              <SendIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    }
                    
                    if (isMandatoryInfoMissing(store) && brandKey !== 'rista_creation') {
                      return (
                        <Chip 
                          label="Docs Pending" 
                          size="small" 
                          sx={{ 
                            bgcolor: '#f3f4f6', 
                            color: '#6b7280', 
                            border: '1px solid',
                            borderColor: '#e5e7eb', 
                            fontWeight: 700, 
                            borderRadius: '6px' 
                          }} 
                        />
                      );
                    }

                    return (
                      <Select
                        value="Pending"
                        size="small"
                        onChange={(e) => {
                          if (e.target.value === 'draft') {
                            handleOpenDraftDialog(store, brandKey);
                          }
                        }}
                        sx={{
                          bgcolor: '#fef7e0', 
                          color: '#b06000', 
                          fontWeight: 700, 
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          height: '24px',
                          '& .MuiSelect-select': { py: 0.5, px: 1 },
                          '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #feebc8' },
                          '& .MuiSvgIcon-root': { color: '#b06000' }
                        }}
                      >
                        <MenuItem value="Pending" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Pending</MenuItem>
                        <MenuItem value="draft" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{getDraftLabel(brandKey)}</MenuItem>
                      </Select>
                    );
                  };

                  const renderRID = (fieldName, disabled) => {
                    if (disabled) return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled', fontSize: '0.75rem' }}><BlockIcon sx={{ fontSize: 14 }} /><span>N/A</span></Box>;
                    return (
                      <TextField size="small" value={store[fieldName] || ''} disabled={!canModify} placeholder="Enter RID"
                        onChange={(e) => handleRIDChange(store.id, fieldName, e.target.value)}
                        slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />
                    );
                  };

                  return (
                    <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                      {/* S.No. */}
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', fontWeight: 800, width: 50, minWidth: 50, maxWidth: 50 }}>{index + 1}</TableCell>

                      {/* Status */}
                      <TableCell sx={{ position: 'sticky', left: 50, zIndex: 1, bgcolor: 'background.paper', width: 130, minWidth: 130, maxWidth: 130 }}>
                        <Chip label={integStatus.label} size="small" sx={{
                          bgcolor: integStatus.bg, color: integStatus.color,
                          border: `1px solid ${integStatus.border}`,
                          fontWeight: 700, fontSize: '0.68rem', borderRadius: '6px',
                          width: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                        }} />
                      </TableCell>

                      {/* Brand */}
                      <TableCell sx={{ position: 'sticky', left: 180, zIndex: 1, bgcolor: 'background.paper', fontWeight: 600, fontSize: '0.8rem', width: 130, minWidth: 130, maxWidth: 130 }}>
                        {getBrandLabel(store.brand)}
                      </TableCell>

                      {/* Cafe Code */}
                      <TableCell sx={{ position: 'sticky', left: 310, zIndex: 1, bgcolor: 'background.paper', fontWeight: 700, width: 100, minWidth: 100, maxWidth: 100 }}>
                        {store.cafeCode || 'N/A'}
                      </TableCell>

                      {/* Cafe Name */}
                      <TableCell sx={{ position: 'sticky', left: 410, zIndex: 1, bgcolor: 'background.paper', borderRight: '2px solid', borderColor: 'divider', fontWeight: 800, width: 160, minWidth: 160, maxWidth: 160 }}>
                        {store.cafeName || 'N/A'}
                      </TableCell>
                      <TableCell sx={MAIL_CELL_STYLE}>{renderMail(store.ristaMailStatus, 'rista_creation', 'Rista Store Creation', 'rista_creation', false)}</TableCell>

                      {/* Mail cells */}
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.btZomatoMailStatus, 'zomato_btc', 'Blue Tokai Zomato', 'zomato_btc', btDisabled, 'blueTokaiZomatoRID')}</TableCell>
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.btSwiggyMailStatus, 'swiggy_btc', 'Blue Tokai Swiggy', 'swiggy_btc', btDisabled, 'blueTokaiSwiggyRID')}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.suchaliZomatoMailStatus, 'zomato_sab', "Suchali's Zomato", 'zomato_sab', suchaliDisabled, 'suchaliZomatoRID')}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.suchaliSwiggyMailStatus, 'swiggy_sab', "Suchali's Swiggy", 'swiggy_sab', suchaliDisabled, 'suchaliSwiggyRID')}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.gotTeaZomatoMailStatus, 'zomato_gottea', 'Got Tea Zomato', 'zomato_gottea', gotTeaDisabled, 'gotTeaZomatoRID')}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.gotTeaSwiggyMailStatus, 'swiggy_gottea', 'Got Tea Swiggy', 'swiggy_gottea', gotTeaDisabled, 'gotTeaSwiggyRID')}</TableCell>

                      {/* RID cells */}
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('blueTokaiZomatoRID', btDisabled)}</TableCell>
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('blueTokaiSwiggyRID', btDisabled)}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('suchaliZomatoRID', suchaliDisabled)}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('suchaliSwiggyRID', suchaliDisabled)}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('gotTeaZomatoRID', gotTeaDisabled)}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('gotTeaSwiggyRID', gotTeaDisabled)}</TableCell>

                      {/* Actions */}
                      {canModify && (
                        <TableCell sx={{ position: 'sticky', right: 0, zIndex: 1, bgcolor: 'background.paper', borderLeft: '2px solid', borderColor: 'divider' }} align="center">
                          <Tooltip title="Save RID changes">
                            <IconButton color="primary" onClick={() => handleSaveRow(store)} size="small">
                              <SaveIcon sx={{ fontSize: '18px' }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Email Draft Dialog */}
      <Dialog open={draftDialog.open} onClose={() => setDraftDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{draftDialog.isResend ? 'Resend Email' : 'Draft Email Preview'}</Typography>
              {draftDialog.isResend && (
                <Chip label="Already sent once" size="small" sx={{ bgcolor: '#fef7e0', color: '#b06000', fontWeight: 700, borderRadius: '6px', fontSize: '0.65rem', height: 20 }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">Platform: <strong>{draftDialog.brandLabel} Onboarding</strong></Typography>
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
              <Box 
                sx={{ 
                  p: 2,
                  '& table': {
                    width: '100%',
                    tableLayout: 'auto'
                  },
                  '& table th:first-of-type, & table td:first-of-type': {
                    whiteSpace: 'nowrap',
                    width: '1%'
                  }
                }}
              >
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

        {/* Attachments Section */}
        {(draftDialog.gstMissing || (draftDialog.attachments && draftDialog.attachments.length > 0)) && (
          <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
            {/* GST Missing Warning */}
            {draftDialog.gstMissing && (
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', px: 2, py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#c2410c', fontSize: '0.78rem' }}>
                  ⚠️ State GST file is missing.
                </Typography>
              </Box>
            )}
            {draftDialog.attachments && draftDialog.attachments.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DescriptionIcon sx={{ fontSize: 16 }} /> Auto-Attachments ({draftDialog.attachments.length} file{draftDialog.attachments.length > 1 ? 's' : ''})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {draftDialog.attachments.map((doc, idx) => {
                    const isGst = !!doc._isGST;
                    const isFssai = !!doc._isFSSAI;
                    const label = isGst 
                      ? `GST: ${doc.fileName}` 
                      : isFssai 
                        ? `FSSAI: ${doc.fileName}` 
                        : (doc.fileName || 'Attachment');
                    const bgcolor = isGst 
                      ? '#dcfce7' 
                      : isFssai 
                        ? '#fef3c7' 
                        : '#e0f2fe';
                    const color = isGst 
                      ? '#166534' 
                      : isFssai 
                        ? '#92400e' 
                        : '#0369a1';
                    // Preview through the filler for every attachment; the backend detects
                    // whether the file is really a PDF and passes anything else through
                    // untouched. Matching on the label is unreliable — it is typed by hand.
                    const origUrl = doc.fileUrl || doc.url;
                    const previewUrl = (draftDialog.store?.id && origUrl)
                      ? `/api/stores/${draftDialog.store.id}/preview-onboarding-pdf?fileUrl=${encodeURIComponent(origUrl)}&fileName=${encodeURIComponent(doc.fileName || 'Document.pdf')}`
                      : origUrl;
                    return (
                      <Chip
                        key={idx}
                        icon={<DescriptionIcon sx={{ fontSize: 14, color: `${color} !important` }} />}
                        label={label}
                        size="small"
                        // Blur first: the chip keeps DOM focus while the modal marks the
                        // page behind it aria-hidden, which is an accessibility violation.
                        onClick={(e) => { e.currentTarget.blur(); openAttachmentPreview(previewUrl, doc.fileName || 'Attachment'); }}
                        sx={{
                          bgcolor: bgcolor,
                          color: color,
                          fontWeight: 600,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: bgcolor, filter: 'brightness(0.95)' },
                          fontSize: '0.7rem',
                          maxWidth: 220,
                          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                        }}
                      />
                    );
                  })}
                </Stack>
              </>
            )}
          </Box>
        )}

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onMouseDown={(e) => { e.preventDefault(); setDraftDialog(prev => ({ ...prev, open: false })); }} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onMouseDown={(e) => { e.preventDefault(); handleSendOnboardingEmail(); }} startIcon={<SendIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            {draftDialog.isResend ? 'OK — Resend Email' : 'OK — Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attachment Preview Modal */}
      <Dialog
        open={attachmentPreview.open}
        onClose={closeAttachmentPreview}
        // Documents are portrait, so a wide dialog wastes space and squashes the page.
        // Images size to whatever they actually are rather than being letterboxed.
        maxWidth={attachmentPreview.isImage ? 'md' : 'sm'}
        fullWidth
        // MUI v9 removed PaperProps — passing it silently drops these styles (and leaks
        // the prop into the DOM), which is what collapsed this dialog's height.
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              // A4 is 1:√2, so an A4-width dialog needs ~1.414× that in height to show a
              // full page; cap at the viewport. Images just take what they need.
              height: attachmentPreview.isImage ? 'auto' : 'min(90vh, calc(min(600px, 92vw) * 1.414))',
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <DescriptionIcon sx={{ fontSize: 20, color: 'primary.main' }} /> {attachmentPreview.fileName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {attachmentPreview.blobUrl && (
              <Tooltip title="Open in new tab">
                <IconButton size="small" component="a" href={attachmentPreview.blobUrl} target="_blank" rel="noopener noreferrer">
                  <OpenInNewIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={closeAttachmentPreview}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            position: 'relative',
            bgcolor: '#525659',
            // flex:1 + minHeight:0 give the iframe a real height to fill; without them a
            // percentage-height iframe inside an auto-height parent resolves to zero.
            flex: 1,
            minHeight: attachmentPreview.isImage ? 240 : 0,
            display: 'flex',
          }}
        >
          {attachmentPreview.loading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, color: '#e2e8f0' }}>
              <CircularProgress size={32} sx={{ color: '#e2e8f0' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Generating preview with store details…</Typography>
            </Box>
          )}
          {attachmentPreview.error && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
              <Alert severity="error" sx={{ borderRadius: '8px' }}>{attachmentPreview.error}</Alert>
            </Box>
          )}
          {attachmentPreview.blobUrl && (
            attachmentPreview.isImage
              ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, minWidth: 0 }}>
                  <img
                    src={attachmentPreview.blobUrl}
                    alt={attachmentPreview.fileName}
                    style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 120px)', objectFit: 'contain', borderRadius: 4, background: '#fff' }}
                  />
                </Box>
              ) : (
                <iframe
                  src={attachmentPreview.blobUrl}
                  title={attachmentPreview.fileName}
                  style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
                />
              )
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} style={{ zIndex: 2147483647 }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '8px' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
