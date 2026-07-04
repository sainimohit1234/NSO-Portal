import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, IconButton,
  Tooltip, Snackbar, Alert, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Stack, Divider, Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fetchStoresFromFirestore } from '../services/storeService';

export default function SwiggyZomatoIntegration() {
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const isFinance = user?.role === 'FINANCE';
  const canModify = !isUser && !isFinance;

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailMappings, setEmailMappings] = useState([]);

  // Alert Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Draft Onboarding Email dialog state
  const [draftDialog, setDraftDialog] = useState({
    open: false,
    store: null,
    brandKey: '',
    brandLabel: '',
    to: '',
    cc: '',
    subject: '',
    body: ''
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchStoresFromFirestore(),
      axios.get('/api/system/email-mappings')
    ])
      .then(([fetchedStores, mappingsRes]) => {
        // Only show active stores which are Compliance Approved
        const filtered = fetchedStores.filter(s =>
          s.isActive !== false &&
          s.isActive !== 'false' &&
          (s.status === 'COMPLIANCE_APPROVED' || s.status === 'COMPLIANCE APPROVED')
        );
        
        // Sort stores alphabetically by name
        filtered.sort((a, b) => (a.cafeName || '').localeCompare(b.cafeName || ''));
        setStores(filtered);
        setEmailMappings(mappingsRes.data || []);
      })
      .catch(err => {
        console.error('Failed to load Swiggy/Zomato Integration data:', err);
        setSnackbar({ open: true, message: 'Failed to load store data.', severity: 'error' });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Filtered stores list based on search bar
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.cafeName || '').toLowerCase().includes(q) ||
        (s.cafeCode || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q)
      );
    });
  }, [stores, searchQuery]);

  // Handle RID input changes (Only allow numbers)
  const handleRIDChange = (storeId, field, rawValue) => {
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    setStores(prev => prev.map(s => {
      if (s.id === storeId) {
        return { ...s, [field]: numericValue };
      }
      return s;
    }));
  };

  // Save RID Changes per row
  const handleSaveRow = async (store) => {
    try {
      setLoading(true);
      const payload = {
        blueTokaiZomatoRID: store.blueTokaiZomatoRID || null,
        blueTokaiSwiggyRID: store.blueTokaiSwiggyRID || null,
        suchaliZomatoRID: store.suchaliZomatoRID || null,
        suchaliSwiggyRID: store.suchaliSwiggyRID || null,
        gotTeaZomatoRID: store.gotTeaZomatoRID || null,
        gotTeaSwiggyRID: store.gotTeaSwiggyRID || null
      };

      await axios.put(`/api/stores/${store.id}`, payload);
      setSnackbar({ open: true, message: 'RID credentials saved successfully.', severity: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to save RID credentials.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Open Draft Dialog for triggering aggregator onboarding email
  const handleOpenDraftDialog = (store, brandKey, brandLabel, mappingId) => {
    const isZomato = brandKey.toLowerCase().includes('zomato');
    
    // Resolve mapped recipients dynamically from Email Directory configuration
    const mapping = emailMappings.find(m => m.id === mappingId);
    const defaultTo = mapping && Array.isArray(mapping.to) ? mapping.to.join(', ') : '';
    const defaultCc = mapping && Array.isArray(mapping.cc) ? mapping.cc.join(', ') : '';

    const defaultSubject = isZomato 
      ? `Zomato Onboarding Request | ${store.cafeName || ''}`
      : `Swiggy Onboarding Request | ${store.cafeName || ''}`;

    const defaultBody = isZomato
      ? `Hi Team,\n\nThis is regarding our new cafe onboarding on Zomato.\n\nPlease find below the cafe details and the attached onboarding form. Kindly initiate the process.\n\nThanks & Regards,\n${user?.name || 'Operations Team'}`
      : `Hi Team,\n\nThis is regarding our new cafe onboarding.\n\nPlease find below the details and initiate the process for the same.\n\nThanks & Regards,\n${user?.name || 'Operations Team'}`;

    setDraftDialog({
      open: true,
      store,
      brandKey,
      brandLabel,
      to: defaultTo,
      cc: defaultCc,
      subject: defaultSubject,
      body: defaultBody
    });
  };

  // Trigger Onboarding email submission
  const handleSendOnboardingEmail = async () => {
    const { store, brandKey, to, cc, subject, body } = draftDialog;
    try {
      setLoading(true);
      await axios.post(`/api/stores/${store.id}/send-swiggy-onboarding-email`, {
        brand: brandKey,
        to,
        cc,
        subject,
        body
      });
      
      setSnackbar({ open: true, message: 'Onboarding email sent successfully.', severity: 'success' });
      setDraftDialog(prev => ({ ...prev, open: false, store: null }));
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to send onboarding email.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', p: 1 }}>
      {/* Header and Sync Status */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
            Swiggy / Zomato Integration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage onboarding triggers, platforms communications, and restaurant ID records for Compliance Approved cafes.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<SyncIcon />}
          onClick={loadData}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
        >
          Refresh Data
        </Button>
      </Stack>

      {/* Search Input bar */}
      <Card sx={{ borderRadius: '12px', mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <TextField
            fullWidth
            placeholder="Search stores by name, code, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                style: { borderRadius: '8px' }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Main spreadsheet data table */}
      <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer component={Paper} sx={{ maxHeight: 720, borderRadius: '16px', boxShadow: 'none', overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 2600 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 800, width: 60, position: 'sticky', left: 0, zIndex: 10, bgcolor: '#f8fafc' }}>S.No.</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100, position: 'sticky', left: 60, zIndex: 10, bgcolor: '#f8fafc' }}>Cafe Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 220, position: 'sticky', left: 160, zIndex: 10, bgcolor: '#f8fafc', borderRight: '2px solid', borderColor: 'divider' }}>Cafe Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 280 }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 120 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 120 }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 100 }}>Pin Code</TableCell>

                  {/* Mail status configurations */}
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Blue Tokai Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Blue Tokai Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Suchali's Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Suchali's Swiggy Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Got Tea Zomato Mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#f0fdf4' }}>Got Tea Swiggy Mail</TableCell>

                  {/* RIDs fields */}
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Blue Tokai Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Blue Tokai Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Suchali's Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Suchali's Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Got Tea Zomato RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 180, bgcolor: '#eff6ff' }}>Got Tea Swiggy RID</TableCell>
                  
                  {canModify && <TableCell sx={{ fontWeight: 800, width: 90, position: 'sticky', right: 0, zIndex: 10, bgcolor: '#f8fafc', borderLeft: '2px solid', borderColor: 'divider' }} align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={21} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={21} align="center" sx={{ py: 8, color: 'text.secondary', fontStyle: 'italic' }}>
                      {searchQuery ? 'No compliance approved stores found matching search query.' : 'No compliance approved stores available.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store, index) => {
                    const rowEditable = canModify;

                    // Render helper for platform email triggers
                    const renderMailTrigger = (statusVal, brandKey, brandLabel, mappingId) => {
                      const isSent = statusVal === 'Sent' || statusVal === 'SENT';
                      if (isSent) {
                        return (
                          <Chip 
                            icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#16a34a !important' }} />} 
                            label="Sent" 
                            size="small" 
                            sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, borderRadius: '6px' }} 
                          />
                        );
                      }
                      return (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!rowEditable}
                          startIcon={<SendIcon sx={{ fontSize: '12px !important' }} />}
                          onClick={() => handleOpenDraftDialog(store, brandKey, brandLabel, mappingId)}
                          sx={{ 
                            textTransform: 'none', 
                            fontSize: '0.75rem', 
                            borderRadius: '6px', 
                            py: 0.5, 
                            fontWeight: 700,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' } 
                          }}
                        >
                          Send
                        </Button>
                      );
                    };

                    return (
                      <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                        {/* Serial Number */}
                        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', fontWeight: 800 }}>
                          {index + 1}
                        </TableCell>

                        {/* Cafe Code */}
                        <TableCell sx={{ position: 'sticky', left: 60, zIndex: 2, bgcolor: 'background.paper', fontWeight: 700 }}>
                          {store.cafeCode || 'N/A'}
                        </TableCell>

                        {/* Cafe Name */}
                        <TableCell sx={{ position: 'sticky', left: 160, zIndex: 2, bgcolor: 'background.paper', borderRight: '2px solid', borderColor: 'divider', fontWeight: 800 }}>
                          {store.cafeName || 'N/A'}
                        </TableCell>

                        {/* Address */}
                        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {store.cafeAddress || store.address || 'N/A'}
                        </TableCell>

                        {/* City */}
                        <TableCell>{store.city || 'N/A'}</TableCell>

                        {/* State */}
                        <TableCell>{store.state || 'N/A'}</TableCell>

                        {/* Pin Code */}
                        <TableCell>{store.pinCode || 'N/A'}</TableCell>

                        {/* Mail Status / Triggers */}
                        <TableCell sx={{ bgcolor: 'rgba(240, 253, 244, 0.2)' }}>
                          {renderMailTrigger(store.btZomatoMailStatus, 'zomato_btc', 'Blue Tokai Zomato', 'zomato_btc')}
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(240, 253, 244, 0.2)' }}>
                          {renderMailTrigger(store.btSwiggyMailStatus, 'swiggy_btc', 'Blue Tokai Swiggy', 'swiggy_btc')}
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(240, 253, 244, 0.2)' }}>
                          {renderMailTrigger(store.suchaliZomatoMailStatus, 'zomato_sab', "Suchali's Zomato", 'zomato_sab')}
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(240, 253, 244, 0.2)' }}>
                          {renderMailTrigger(store.suchaliSwiggyMailStatus, 'swiggy_sab', "Suchali's Swiggy", 'swiggy_sab')}
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(240, 253, 244, 0.2)' }}>
                          {renderMailTrigger(store.gotTeaZomatoMailStatus, 'zomato_gottea', 'Got Tea Zomato', 'zomato_gottea')}
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(240, 253, 244, 0.2)' }}>
                          {renderMailTrigger(store.gotTeaSwiggyMailStatus, 'swiggy_gottea', 'Got Tea Swiggy', 'swiggy_gottea')}
                        </TableCell>

                        {/* RID numeric fields */}
                        <TableCell sx={{ bgcolor: 'rgba(239, 246, 255, 0.2)' }}>
                          <TextField
                            size="small"
                            value={store.blueTokaiZomatoRID || ''}
                            disabled={!rowEditable}
                            placeholder="Enter RID"
                            onChange={(e) => handleRIDChange(store.id, 'blueTokaiZomatoRID', e.target.value)}
                            slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(239, 246, 255, 0.2)' }}>
                          <TextField
                            size="small"
                            value={store.blueTokaiSwiggyRID || ''}
                            disabled={!rowEditable}
                            placeholder="Enter RID"
                            onChange={(e) => handleRIDChange(store.id, 'blueTokaiSwiggyRID', e.target.value)}
                            slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(239, 246, 255, 0.2)' }}>
                          <TextField
                            size="small"
                            value={store.suchaliZomatoRID || ''}
                            disabled={!rowEditable}
                            placeholder="Enter RID"
                            onChange={(e) => handleRIDChange(store.id, 'suchaliZomatoRID', e.target.value)}
                            slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(239, 246, 255, 0.2)' }}>
                          <TextField
                            size="small"
                            value={store.suchaliSwiggyRID || ''}
                            disabled={!rowEditable}
                            placeholder="Enter RID"
                            onChange={(e) => handleRIDChange(store.id, 'suchaliSwiggyRID', e.target.value)}
                            slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(239, 246, 255, 0.2)' }}>
                          <TextField
                            size="small"
                            value={store.gotTeaZomatoRID || ''}
                            disabled={!rowEditable}
                            placeholder="Enter RID"
                            onChange={(e) => handleRIDChange(store.id, 'gotTeaZomatoRID', e.target.value)}
                            slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(239, 246, 255, 0.2)' }}>
                          <TextField
                            size="small"
                            value={store.gotTeaSwiggyRID || ''}
                            disabled={!rowEditable}
                            placeholder="Enter RID"
                            onChange={(e) => handleRIDChange(store.id, 'gotTeaSwiggyRID', e.target.value)}
                            slotProps={{ htmlInput: { style: { fontSize: '0.825rem', fontWeight: 600 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                          />
                        </TableCell>

                        {/* Actions Save button */}
                        {rowEditable && (
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
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Premium Draft Email Dialog */}
      <Dialog 
        open={draftDialog.open} 
        onClose={() => setDraftDialog(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Draft Email Preview</Typography>
            <Typography variant="caption" color="text.secondary">
              Platform: <strong>{draftDialog.brandLabel} Onboarding</strong>
            </Typography>
          </Box>
          <IconButton onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Stack spacing={2.5}>
            <TextField
              label="To"
              variant="outlined"
              fullWidth
              size="small"
              value={draftDialog.to}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))}
            />
            <TextField
              label="Cc"
              variant="outlined"
              fullWidth
              size="small"
              value={draftDialog.cc}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))}
            />
            <TextField
              label="Subject"
              variant="outlined"
              fullWidth
              size="small"
              value={draftDialog.subject}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))}
            />
            <TextField
              label="Email Body"
              variant="outlined"
              fullWidth
              multiline
              rows={8}
              value={draftDialog.body}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSendOnboardingEmail}
            startIcon={<SendIcon />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global notifications snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '8px' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
