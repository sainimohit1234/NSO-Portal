import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, IconButton,
  Tooltip, Snackbar, Alert, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Stack, Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import BlockIcon from '@mui/icons-material/Block';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fetchStoresFromFirestore } from '../services/storeService';

// ─── Brand detection helper ───────────────────────────────────────────────────
const getBrandType = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('got tea') || b.includes('gottea')) return 'gotTea';
  if (b.includes('suchali')) return 'suchali';
  return 'blueTokkai';
};

const getBrandLabel = (brand) => {
  const t = getBrandType(brand);
  if (t === 'gotTea') return 'Got Tea';
  if (t === 'suchali') return "Suchali's Artisan Bakehouse";
  return 'Blue Tokai';
};

// ─── Integration status computation ──────────────────────────────────────────
const computeIntegrationStatus = (store) => {
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
    f => store[f] === 'Sent' || store[f] === 'SENT'
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
    return { label: 'Needs Follow-up with S/Z', color: '#7f1d1d', bg: '#fee2e2', border: '#fca5a5' };
  }

  const daysRemaining = Math.ceil(4 - daysSinceSent);
  return { label: `Mail Sent · ${daysRemaining}d left`, color: '#1e3a8a', bg: '#dbeafe', border: '#93c5fd' };
};


export default function SwiggyZomatoIntegration() {
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const isFinance = user?.role === 'FINANCE';
  const canModify = !isUser && !isFinance;

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [draftDialog, setDraftDialog] = useState({
    open: false, store: null, brandKey: '', brandLabel: '', to: '', cc: '', subject: '', body: ''
  });

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
          (s.status === 'APPROVED' || s.status === 'NSO_APPROVED' ||
            s.status === 'COMPLIANCE_APPROVED' || s.status === 'COMPLIANCE APPROVED')
        );
        filtered.sort((a, b) => (a.cafeName || '').localeCompare(b.cafeName || ''));
        setStores(filtered);
        setEmailMappings(mappingsRes.data || []);
      })
      .catch(err => {
        console.error('Failed to load Swiggy/Zomato Integration data:', err);
        setSnackbar({ open: true, message: 'Failed to load store data.', severity: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  const filteredStores = useMemo(() =>
    stores.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.cafeName || '').toLowerCase().includes(q) ||
        (s.cafeCode || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q)
      );
    }),
    [stores, searchQuery]
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

  const handleOpenDraftDialog = async (store, brandKey, brandLabel, mappingId) => {
    const isZomato = brandKey.toLowerCase().includes('zomato');
    const mapping = emailMappings.find(m => m.id === mappingId);

    let rawSubject = isZomato ? `Zomato Onboarding Request | [Store Name]` : `Swiggy Onboarding Request | [Store Name]`;
    let rawBody = isZomato
      ? `Hi Team,\n\nThis is regarding our new cafe onboarding on Zomato.\n\nPlease find below the cafe details and the attached onboarding form. Kindly initiate the process.\n\nThanks & Regards,\n[User Name]`
      : `Hi Team,\n\nThis is regarding our new cafe onboarding.\n\nPlease find below the details and initiate the process for the same.\n\nThanks & Regards,\n[User Name]`;

    try {
      const templatesRes = await axios.get('/api/system/email-templates');
      const templates = templatesRes.data || {};
      if (mapping && mapping.subCategory) {
        const matchedKey = Object.keys(templates).find(k => k.toLowerCase() === mapping.subCategory.toLowerCase());
        if (matchedKey && templates[matchedKey]) {
          rawSubject = templates[matchedKey].subject || rawSubject;
          rawBody = templates[matchedKey].body || rawBody;
        }
      }
    } catch (err) {
      console.error('Failed to load email templates, falling back to default:', err);
    }

    const brandLabelPretty = store.brand === 'BLUE_TOKAI_SUCHALI' 
      ? "Blue Tokai / Suchali's Artisan Bakehouse" 
      : (store.brand === 'GOT_TEA' ? "Got Tea" : (store.brand || ''));

    const replaceText = (txt) => {
      if (!txt) return '';
      return txt
        .replace(/{cafeName}|\[Store Name\]|\[Cafe Name\]/gi, store.cafeName || '')
        .replace(/{brandName}|\[Brand Name\]|\[Brand\]/gi, brandLabelPretty)
        .replace(/{city}|\[City\]/gi, store.city || '')
        .replace(/{state}|\[State\]/gi, store.state || '')
        .replace(/{address}|\[Address\]/gi, store.cafeAddress || store.address || '')
        .replace(/{model}|\[Model\]|\[Cafe Model\]/gi, store.cafeModule || store.cafeModel || '')
        .replace(/{cafeCode}|\[Store Code\]|\[Cafe Code\]/gi, store.cafeCode || '')
        .replace(/{pincode}|\[Pincode\]|\[Pin Code\]/gi, store.pinCode || '')
        .replace(/\[User Name\]/gi, user?.name || 'Operations Team');
    };

    setDraftDialog({
      open: true, store, brandKey, brandLabel,
      to: mapping && Array.isArray(mapping.to) ? mapping.to.join(', ') : '',
      cc: mapping && Array.isArray(mapping.cc) ? mapping.cc.join(', ') : '',
      subject: replaceText(rawSubject),
      body: replaceText(rawBody)
    });
  };

  const handleSendOnboardingEmail = async () => {
    const { store, brandKey, to, cc, subject, body } = draftDialog;
    try {
      setLoading(true);
      await axios.post(`/api/stores/${store.id}/send-swiggy-onboarding-email`, { brand: brandKey, to, cc, subject, body });
      setSnackbar({ open: true, message: 'Onboarding email sent successfully.', severity: 'success' });
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

  const NaBlock = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled', fontSize: '0.75rem' }}>
      <BlockIcon sx={{ fontSize: 14 }} />
      <span>N/A</span>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', px: 2, py: 1 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
            Swiggy / Zomato Integration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage onboarding triggers, platforms communications, and restaurant ID records for Approved cafes.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<SyncIcon />} onClick={loadData}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Refresh Data
        </Button>
      </Stack>

      {/* Search */}
      <Card sx={{ borderRadius: '12px', mb: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <TextField fullWidth placeholder="Search stores by name, code, or city..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>, style: { borderRadius: '8px' } } }} />
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} alignItems="center">
        {[
          { label: 'Pending', color: '#92400e', bg: '#fef3c7' },
          { label: 'Mail Sent', color: '#1e3a8a', bg: '#dbeafe' },
          { label: 'Needs Follow-up with S/Z', color: '#7f1d1d', bg: '#fee2e2' },
          { label: 'Integration Completed', color: '#14532d', bg: '#dcfce7' },
        ].map(s => (
          <Chip key={s.label} label={s.label} size="small"
            sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: '6px' }} />
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          · 4-day countdown starts when all required emails are sent
        </Typography>
      </Stack>

      {/* Main Table */}
      <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer component={Paper} sx={{ maxHeight: 700, borderRadius: '16px', boxShadow: 'none', overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 3200 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 50, minWidth: 50, maxWidth: 50, position: 'sticky', left: 0, zIndex: 12, bgcolor: '#f8fafc' }}>S.No.</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 155, minWidth: 155, maxWidth: 155, position: 'sticky', left: 50, zIndex: 12, bgcolor: '#faf5ff' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 155, minWidth: 155, maxWidth: 155, position: 'sticky', left: 205, zIndex: 12, bgcolor: '#faf5ff' }}>Brand</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 105, minWidth: 105, maxWidth: 105, position: 'sticky', left: 360, zIndex: 12, bgcolor: '#f8fafc' }}>Cafe Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 220, minWidth: 220, maxWidth: 220, position: 'sticky', left: 465, zIndex: 12, bgcolor: '#f8fafc', borderRight: '2px solid', borderColor: 'divider' }}>Cafe Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 280 }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 120 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 120 }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100 }}>Pin Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Blue Tokai Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Blue Tokai Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Suchali's Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Suchali's Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Got Tea Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Got Tea Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Blue Tokai Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Blue Tokai Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Suchali's Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Suchali's Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Got Tea Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Got Tea Swiggy RID</TableCell>
                  {canModify && <TableCell sx={{ fontWeight: 800, width: 90, position: 'sticky', right: 0, zIndex: 12, bgcolor: '#f8fafc', borderLeft: '2px solid', borderColor: 'divider' }} align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && stores.length === 0 ? (
                  <TableRow><TableCell colSpan={22} align="center" sx={{ py: 8 }}><CircularProgress size={32} /></TableCell></TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow><TableCell colSpan={22} align="center" sx={{ py: 8, color: 'text.secondary', fontStyle: 'italic' }}>
                    {searchQuery ? 'No approved stores found matching search query.' : 'No approved stores available.'}
                  </TableCell></TableRow>
                ) : filteredStores.map((store, index) => {
                  const brandType = getBrandType(store.brand);
                  const isGotTea = brandType === 'gotTea';

                  // Field disable logic
                  const btDisabled = isGotTea;
                  const suchaliDisabled = isGotTea;
                  const gotTeaDisabled = !isGotTea;

                  const integStatus = computeIntegrationStatus(store);

                  const renderMail = (statusVal, brandKey, brandLabel, mappingId, disabled) => {
                    if (disabled) return <Tooltip title="Not applicable for this brand"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled', fontSize: '0.75rem' }}><BlockIcon sx={{ fontSize: 14 }} /><span>N/A</span></Box></Tooltip>;
                    const isSent = statusVal === 'Sent' || statusVal === 'SENT';
                    if (isSent) return <Chip icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#16a34a !important' }} />} label="Sent" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, borderRadius: '6px' }} />;
                    return (
                      <Button variant="contained" size="small" disabled={!canModify}
                        startIcon={<SendIcon sx={{ fontSize: '12px !important' }} />}
                        onClick={() => handleOpenDraftDialog(store, brandKey, brandLabel, mappingId)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: '6px', py: 0.5, fontWeight: 700, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                        Send
                      </Button>
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
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', fontWeight: 800, width: 50, minWidth: 50, maxWidth: 50 }}>{index + 1}</TableCell>

                      {/* Status */}
                      <TableCell sx={{ position: 'sticky', left: 50, zIndex: 2, bgcolor: 'background.paper', width: 155, minWidth: 155, maxWidth: 155 }}>
                        <Chip label={integStatus.label} size="small" sx={{
                          bgcolor: integStatus.bg, color: integStatus.color,
                          border: `1px solid ${integStatus.border}`,
                          fontWeight: 700, fontSize: '0.68rem', borderRadius: '6px',
                          width: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                        }} />
                      </TableCell>

                      {/* Brand */}
                      <TableCell sx={{ position: 'sticky', left: 205, zIndex: 2, bgcolor: 'background.paper', fontWeight: 600, fontSize: '0.8rem', width: 155, minWidth: 155, maxWidth: 155 }}>
                        {getBrandLabel(store.brand)}
                      </TableCell>

                      {/* Cafe Code */}
                      <TableCell sx={{ position: 'sticky', left: 360, zIndex: 2, bgcolor: 'background.paper', fontWeight: 700, width: 105, minWidth: 105, maxWidth: 105 }}>
                        {store.cafeCode || 'N/A'}
                      </TableCell>

                      {/* Cafe Name */}
                      <TableCell sx={{ position: 'sticky', left: 465, zIndex: 2, bgcolor: 'background.paper', borderRight: '2px solid', borderColor: 'divider', fontWeight: 800, width: 220, minWidth: 220, maxWidth: 220 }}>
                        {store.cafeName || 'N/A'}
                      </TableCell>

                      {/* Address */}
                      <TableCell sx={{ color: 'text.secondary', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {store.cafeAddress || store.address || 'N/A'}
                      </TableCell>
                      <TableCell>{store.city || 'N/A'}</TableCell>
                      <TableCell>{store.state || 'N/A'}</TableCell>
                      <TableCell>{store.pinCode || 'N/A'}</TableCell>

                      {/* Mail cells */}
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.btZomatoMailStatus, 'zomato_btc', 'Blue Tokai Zomato', 'zomato_btc', btDisabled)}</TableCell>
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.btSwiggyMailStatus, 'swiggy_btc', 'Blue Tokai Swiggy', 'swiggy_btc', btDisabled)}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.suchaliZomatoMailStatus, 'zomato_sab', "Suchali's Zomato", 'zomato_sab', suchaliDisabled)}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.suchaliSwiggyMailStatus, 'swiggy_sab', "Suchali's Swiggy", 'swiggy_sab', suchaliDisabled)}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.gotTeaZomatoMailStatus, 'zomato_gottea', 'Got Tea Zomato', 'zomato_gottea', gotTeaDisabled)}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : MAIL_CELL_STYLE}>{renderMail(store.gotTeaSwiggyMailStatus, 'swiggy_gottea', 'Got Tea Swiggy', 'swiggy_gottea', gotTeaDisabled)}</TableCell>

                      {/* RID cells */}
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('blueTokaiZomatoRID', btDisabled)}</TableCell>
                      <TableCell sx={btDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('blueTokaiSwiggyRID', btDisabled)}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('suchaliZomatoRID', suchaliDisabled)}</TableCell>
                      <TableCell sx={suchaliDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('suchaliSwiggyRID', suchaliDisabled)}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('gotTeaZomatoRID', gotTeaDisabled)}</TableCell>
                      <TableCell sx={gotTeaDisabled ? NA_CELL_STYLE : RID_CELL_STYLE}>{renderRID('gotTeaSwiggyRID', gotTeaDisabled)}</TableCell>

                      {/* Actions */}
                      {canModify && (
                        <TableCell sx={{ position: 'sticky', right: 0, zIndex: 2, bgcolor: 'background.paper', borderLeft: '2px solid', borderColor: 'divider' }} align="center">
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
      <Dialog open={draftDialog.open} onClose={() => setDraftDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Draft Email Preview</Typography>
            <Typography variant="caption" color="text.secondary">Platform: <strong>{draftDialog.brandLabel} Onboarding</strong></Typography>
          </Box>
          <IconButton onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Stack spacing={2.5}>
            <TextField label="To" fullWidth size="small" value={draftDialog.to} onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))} />
            <TextField label="Cc" fullWidth size="small" value={draftDialog.cc} onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))} />
            <TextField label="Subject" fullWidth size="small" value={draftDialog.subject} onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))} />
            <TextField label="Email Body" fullWidth multiline rows={8} value={draftDialog.body} onChange={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSendOnboardingEmail} startIcon={<SendIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>Send Email</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '8px' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
