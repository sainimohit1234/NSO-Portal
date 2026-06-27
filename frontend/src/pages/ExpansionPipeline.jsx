import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, Grid, Chip, TextField, MenuItem, 
  Button, IconButton, Tooltip, Snackbar, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, Link, InputAdornment
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { CAFE_MODELS } from '../constants/storeOptions';



export default function ExpansionPipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const isFinance = user?.role === 'FINANCE';
  const canModify = !isUser && !isFinance;

  const getFileType = (url, fileName) => {
    const name = fileName || url || '';
    const ext = name.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      return 'image';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    return 'other';
  };

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [uploadStore, setUploadStore] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({ loi: null, budget: null, agreement: null });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');

  // Alert State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Ready for Construction Flow States
  const [confirmDialog, setConfirmDialog] = useState({ open: false, store: null, message: '', hasCode: false });
  const [draftDialog, setDraftDialog] = useState({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });

  const loadData = () => {
    setLoading(true);
    fetchStoresFromFirestore()
      .then(fetchedStores => {
        // Load all active stores (including live and closed ones)
        const allStores = fetchedStores.filter(s => 
          s.isActive !== false &&
          s.isActive !== 'false'
        );
        // Pre-extract PIN code if missing
        allStores.forEach(s => {
          if (!s.pinCode) {
            const addr = s.cafeAddress || s.address || '';
            const match = addr.match(/\b\d{6}\b/);
            if (match) {
              s.pinCode = match[0];
            }
          }
        });
        // Sort: 1. Temporary first, 2. Unlocked second, 3. Locked last, 4. Alphabetically by name
        allStores.sort((a, b) => {
          if (a.isTemp && !b.isTemp) return -1;
          if (!a.isTemp && b.isTemp) return 1;

          const isLockedA = a.isLocked === true || a.isLocked === 'true';
          const isLockedB = b.isLocked === true || b.isLocked === 'true';
          if (!isLockedA && isLockedB) return -1;
          if (isLockedA && !isLockedB) return 1;

          return (a.cafeName || '').localeCompare(b.cafeName || '');
        });
        console.log("Sorted pipeline stores:", allStores.map(s => ({ name: s.cafeName, isLocked: s.isLocked, isTemp: s.isTemp })));
        setStores(allStores);
        setLoading(false);
      })
      .catch(async err => {
        console.error('Failed to load stores from Firestore, trying API:', err);
        try {
          const res = await axios.get('/api/stores');
          const list = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          const allStores = list.filter(s => 
            s.isActive !== false &&
            s.isActive !== 'false'
          );
          // Pre-extract PIN code if missing
          allStores.forEach(s => {
            if (!s.pinCode) {
              const addr = s.cafeAddress || s.address || '';
              const match = addr.match(/\b\d{6}\b/);
              if (match) {
                s.pinCode = match[0];
              }
            }
          });
          // Sort: 1. Temporary first, 2. Unlocked second, 3. Locked last, 4. Alphabetically by name
          allStores.sort((a, b) => {
            if (a.isTemp && !b.isTemp) return -1;
            if (!a.isTemp && b.isTemp) return 1;

            const isLockedA = a.isLocked === true || a.isLocked === 'true';
            const isLockedB = b.isLocked === true || b.isLocked === 'true';
            if (!isLockedA && isLockedB) return -1;
            if (isLockedA && !isLockedB) return 1;

            return (a.cafeName || '').localeCompare(b.cafeName || '');
          });
          console.log("Sorted pipeline stores (fallback API):", allStores.map(s => ({ name: s.cafeName, isLocked: s.isLocked, isTemp: s.isTemp })));
          setStores(allStores);
        } catch (apiError) {
          console.error('API Fetch failed:', apiError);
          setSnackbar({ open: true, message: 'Failed to fetch store pipeline data.', severity: 'error' });
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);



  // Pin Code auto-fill handler
  const handlePincodeLookup = (storeId, pin) => {
    axios.get(`/api/stores/pincode/${pin}`)
      .then(res => {
        if (res.data && res.data[0] && res.data[0].Status === 'Success') {
          const postOfficeList = res.data[0].PostOffice;
          if (postOfficeList && postOfficeList.length > 0) {
            const district = postOfficeList[0].District;
            const stateName = postOfficeList[0].State;
            setStores(prev => prev.map(s => s.id === storeId ? { ...s, city: district, state: stateName } : s));
          }
        }
      })
      .catch(err => {
        console.error('Failed to lookup pincode', err);
      });
  };

  // Row input field change handler
  const handleFieldChange = (storeId, field, value) => {
    setStores(prev => prev.map(s => {
      if (s.id === storeId) {
        const updated = { ...s, [field]: value };
        
        // Auto-generate emails on cafeName or brand change
        if (field === 'cafeName' || field === 'brand') {
          const name = field === 'cafeName' ? value : s.cafeName;
          const brand = field === 'brand' ? value : s.brand;
          if (name && brand) {
            const cleanName = String(name).replace(/\s+/g, '').toLowerCase();
            let mail = '';
            if (brand === 'BLUE_TOKAI_SUCHALI') {
              mail = `${cleanName}@bluetokaicoffee.com`;
            } else if (brand === 'GOT_TEA') {
              mail = `${cleanName}@gottea.in`;
            }
            updated.cafeMailId = mail;
            updated.cmMailId = mail ? `cm.${mail}` : '';
          } else {
            updated.cafeMailId = '';
            updated.cmMailId = '';
          }
        }

        // Auto-extract PIN code from address field changes
        if (field === 'cafeAddress' || field === 'address') {
          const match = (value || '').match(/\b\d{6}\b/);
          if (match) {
            const extractedPin = match[0];
            if (s.pinCode !== extractedPin) {
              updated.pinCode = extractedPin;
              // We trigger lookup dynamically
              handlePincodeLookup(storeId, extractedPin);
            }
          }
        }

        // Trigger Pincode lookup at 6 digits
        if (field === 'pinCode' && String(value).trim().length === 6) {
          handlePincodeLookup(storeId, String(value).trim());
        }

        return updated;
      }
      return s;
    }));
  };

  // Add New Blank Row
  const handleAddNewRow = () => {
    if (!canModify) return;
    const tempId = `temp_${Date.now()}`;
    const newRow = {
      id: tempId,
      isTemp: true,
      brand: 'BLUE_TOKAI_SUCHALI',
      cafeName: '',
      cafeCode: '',
      pinCode: '',
      city: '',
      state: '',
      address: '',
      cafeModel: '',
      status: 'In Pipeline',
      isActive: true,
      loiUrl: '',
      loiFileName: '',
      budgetUrl: '',
      budgetFileName: '',
      agreementUrl: '',
      agreementFileName: ''
    };
    setStores(prev => [newRow, ...prev]);
  };

  // Save Row changes (POST for temp, PUT for existing)
  const handleSaveRow = async (store) => {
    if (!canModify) return;
    if (!store.cafeName.trim()) {
      setSnackbar({ open: true, message: 'Café Name is required.', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const payload = { ...store };
      // Remove local client-only properties
      delete payload.isTemp;
      
      if (store.isTemp) {
        // Create store in DB
        await axios.post('/api/stores', payload);
        setSnackbar({ open: true, message: 'Café registered successfully.', severity: 'success' });
      } else {
        // Update store in DB
        await axios.put(`/api/stores/${store.id}`, payload);
        setSnackbar({ open: true, message: 'Café details saved successfully.', severity: 'success' });
      }
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.error || 'Failed to save store details.', 
        severity: 'error' 
      });
      setLoading(false);
    }
  };

  // Delete Row / Store
  const handleDeleteRow = async (store) => {
    if (!canModify) return;
    if (store.isTemp) {
      setStores(prev => prev.filter(s => s.id !== store.id));
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete café "${store.cafeName || 'Untitled'}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await axios.delete(`/api/stores/${store.id}`);
      setSnackbar({ open: true, message: 'Café removed successfully.', severity: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.error || 'Failed to delete café.', 
        severity: 'error' 
      });
      setLoading(false);
    }
  };

  // Ready for Construction Flow Handlers
  const handleStatusChangeToReady = (store) => {
    const hasCode = !!(store.cafeCode && store.cafeCode.trim());
    if (!hasCode) {
      setConfirmDialog({
        open: true,
        store,
        message: 'Are you sure you want to send this project to the NSO Team for further processing and send the Store Code Creation email?',
        hasCode: false
      });
    } else {
      setConfirmDialog({
        open: true,
        store,
        message: 'Are you sure you want to send this project to the NSO Team for further processing?',
        hasCode: true
      });
    }
  };

  const handleConfirmYes = async () => {
    const store = confirmDialog.store;
    const hasCode = confirmDialog.hasCode;
    
    // Close confirmation dialog
    setConfirmDialog(prev => ({ ...prev, open: false, store: null }));

    if (hasCode) {
      // Scenario 2: Save status to Ready for Construction directly
      try {
        setLoading(true);
        await axios.put(`/api/stores/${store.id}`, { status: 'Ready for Construction' });
        setSnackbar({ open: true, message: 'Project status updated to Ready for Construction.', severity: 'success' });
        loadData();
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Failed to update status.', severity: 'error' });
        setLoading(false);
      }
    } else {
      // Scenario 1: Open draft email dialog
      try {
        setLoading(true);
        const [mappingsRes, templatesRes] = await Promise.all([
          axios.get('/api/system/email-mappings'),
          axios.get('/api/system/email-templates')
        ]);
        const mappings = mappingsRes.data || [];
        const templates = templatesRes.data || {};
        
        // Find New Store Code Creation mapping
        const mapping = mappings.find(m => 
          (m.subCategory && m.subCategory.toLowerCase() === 'new store code creation') ||
          (m.category && m.category.toLowerCase() === 'new store code creation')
        );

        // Find New Store Code Creation template
        const templateKey = Object.keys(templates).find(k => k.toLowerCase() === 'new store code creation') || '';
        const template = templateKey ? templates[templateKey] : null;

        const defaultSubject = `New Store Code Creation Request - ${store.cafeName}`;
        const defaultBody = `Hi Team,

This is regarding the new store code creation request for our upcoming cafe. Please find the details below and initiate the store code creation process.

Store Details:
- Cafe Name: ${store.cafeName || 'N/A'}
- Brand: ${store.brand === 'BLUE_TOKAI_SUCHALI' ? 'Blue Tokai / Suchali\'s' : 'Got Tea'}
- City: ${store.city || 'N/A'}
- State: ${store.state || 'N/A'}
- Pin Code: ${store.pinCode || 'N/A'}
- Address: ${store.cafeAddress || store.address || 'N/A'}
- Café Model: ${store.cafeModel || 'N/A'}

Best regards,
Operations Team`;

        let to = mapping?.to?.join(', ') || '';
        let cc = mapping?.cc?.join(', ') || '';
        let subject = defaultSubject;
        let body = defaultBody;

        if (template) {
          subject = `${template.subject || 'New Store Code Creation Request'} - ${store.cafeName}`;
          let tBody = template.body || '';
          tBody = tBody.replace(/{cafeName}|\[Store Name\]/gi, store.cafeName || '');
          tBody = tBody.replace(/{city}|\[City\]/gi, store.city || '');
          tBody = tBody.replace(/{state}|\[State\]/gi, store.state || '');
          tBody = tBody.replace(/{address}|\[Address\]/gi, store.cafeAddress || store.address || '');
          tBody = tBody.replace(/{model}|\[Model\]/gi, store.cafeModel || '');
          body = tBody || defaultBody;
        }

        setDraftDialog({
          open: true,
          store,
          to,
          cc,
          subject,
          body,
          isEditable: false
        });
      } catch (err) {
        console.error('Failed to load email configurations', err);
        setSnackbar({ open: true, message: 'Failed to prepare email draft.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirmNo = () => {
    setConfirmDialog({ open: false, store: null, message: '', hasCode: false });
  };

  const handleSendEmail = async () => {
    const store = draftDialog.store;
    try {
      setLoading(true);
      await axios.post(`/api/stores/${store.id}/send-store-code-email`, {
        to: draftDialog.to,
        cc: draftDialog.cc,
        subject: draftDialog.subject,
        body: draftDialog.body
      });
      setDraftDialog({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });
      setSnackbar({ open: true, message: 'Email sent and status updated to Ready for Construction.', severity: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to send email.', severity: 'error' });
      setLoading(false);
    }
  };

  const handleDraftBack = () => {
    const store = draftDialog.store;
    setDraftDialog({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });
    setConfirmDialog({
      open: true,
      store,
      message: 'Are you sure you want to send this project to the NSO Team for further processing and send the Store Code Creation email?',
      hasCode: false
    });
  };

  const handleDraftModify = () => {
    setDraftDialog(prev => ({ ...prev, isEditable: true }));
  };

  // File selection slot update
  const handleFileChangeForSlot = (e, slot) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 200 * 1024; // 200kb
      if (file.size > maxSize) {
        setSnackbar({ open: true, message: 'Upload blocked: File size must not exceed 200KB.', severity: 'error' });
        e.target.value = ''; // clear input
        return;
      }
      setSelectedFiles(prev => ({ ...prev, [slot]: file }));
    }
  };

  // Upload file and update store doc
  const handleSaveFileSlot = async (slot) => {
    const file = selectedFiles[slot];
    if (!file || !uploadStore) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(`/api/stores/upload-file?type=${slot}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.url;

      const updatedFields = { [`${slot}Url`]: fileUrl, [`${slot}FileName`]: file.name };
      
      if (uploadStore.isTemp || String(uploadStore.id).startsWith('temp_')) {
        // Unsaved Café row - only update local state
        setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
        setUploadStore(prev => ({ ...prev, ...updatedFields }));
        setSelectedFiles(prev => ({ ...prev, [slot]: null }));
        setSnackbar({ open: true, message: `${slot.toUpperCase()} file uploaded. Click Save on the row to save details.`, severity: 'success' });
      } else {
        // Saved Café row - update Firestore via API
        await axios.put(`/api/stores/${uploadStore.id}`, updatedFields);
        setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
        setUploadStore(prev => ({ ...prev, ...updatedFields }));
        setSelectedFiles(prev => ({ ...prev, [slot]: null }));
        setSnackbar({ open: true, message: `${slot.toUpperCase()} file uploaded and saved.`, severity: 'success' });
        loadData();
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to upload file.', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete uploaded file slot
  const handleDeleteFileSlot = async (slot) => {
    if (!uploadStore) return;
    const updatedFields = { [`${slot}Url`]: null, [`${slot}FileName`]: null };
    
    if (uploadStore.isTemp || String(uploadStore.id).startsWith('temp_')) {
      // Unsaved Café row - only update local state
      setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
      setUploadStore(prev => ({ ...prev, ...updatedFields }));
      setSnackbar({ open: true, message: `${slot.toUpperCase()} file removed locally.`, severity: 'success' });
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/api/stores/${uploadStore.id}`, updatedFields);
      setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
      setUploadStore(prev => ({ ...prev, ...updatedFields }));
      setSnackbar({ open: true, message: `${slot.toUpperCase()} file deleted.`, severity: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to delete file.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'INCOMPLETE_INFORMATION') return 'Incomplete';
    if (status === 'PENDING_APPROVAL') return 'Pending Approval';
    if (status === 'APPROVED' || status === 'NSO_APPROVED') return 'Awaiting Compliance';
    if (status === 'COMPLIANCE_APPROVED') return 'Ready for Launch';
    if (status === 'ON_HOLD') return 'On Hold';
    return status;
  };

  return (
    <Box sx={{ py: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
              Expansion Pipeline
            </Typography>
            <Chip 
              label={`${stores.length} Active Projects`} 
              color="primary" 
              size="small" 
              sx={{ fontWeight: 700 }} 
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage upcoming café properties, look up pin codes, and upload approval documents.
          </Typography>
        </Box>

        {canModify && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddNewRow}
            startIcon={<AddCircleOutlineIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3, height: 42 }}
          >
            Add New Project
          </Button>
        )}
      </Box>



      {/* Pipeline Table */}
      <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: '78vh', overflowX: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 1960, tableLayout: 'fixed', '& .MuiTableCell-root': { px: 1, py: 1.25 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, fontWeight: 800, width: 50 }}>S.No.</TableCell>
                <TableCell sx={{ position: 'sticky', left: 50, zIndex: 4, fontWeight: 800, width: 200 }}>Brand</TableCell>
                <TableCell sx={{ position: 'sticky', left: 250, zIndex: 4, fontWeight: 800, width: 300, borderRight: '1.5px solid', borderColor: 'divider' }}>Café Name</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 150 }}>Café Code</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 110 }}>Pin Code</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 130 }}>City</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 130 }}>State</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 350 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 150 }}>Café Model</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 130 }}>Upload File</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 180 }}>Status</TableCell>
                {canModify && <TableCell sx={{ fontWeight: 800, width: 80 }} align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 12 : 11} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 12 : 11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No expansion pipeline stores registered.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store, index) => {
                  const hasLoiSaved = !!store.loiUrl;
                  const isLocked = store.isLocked === true || store.isLocked === 'true';
                  const rowEditable = canModify && !isLocked;

                  return (
                    <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                       {/* Serial No. */}
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', fontWeight: 800 }}>{index + 1}</TableCell>

                      {/* Brand Select */}
                      <TableCell sx={{ position: 'sticky', left: 50, zIndex: 2, bgcolor: 'background.paper' }}>
                        <Select
                          value={store.brand || 'BLUE_TOKAI_SUCHALI'}
                          size="small"
                          disabled={!rowEditable}
                          onChange={(e) => handleFieldChange(store.id, 'brand', e.target.value)}
                          fullWidth
                          sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}
                        >
                          <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's</MenuItem>
                          <MenuItem value="GOT_TEA">Got Tea</MenuItem>
                        </Select>
                      </TableCell>

                      {/* Café Name */}
                      <TableCell sx={{ position: 'sticky', left: 250, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>
                        <TextField
                          value={store.cafeName || ''}
                          size="small"
                          placeholder="Enter name"
                          disabled={!rowEditable}
                          onChange={(e) => handleFieldChange(store.id, 'cafeName', e.target.value)}
                          fullWidth
                          slotProps={{ 
                            htmlInput: { style: { fontSize: '0.85rem', fontWeight: 800 } },
                            input: {
                              endAdornment: isLocked ? (
                                <InputAdornment position="end">
                                  <Tooltip title="Store Locked">
                                    <LockIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                  </Tooltip>
                                </InputAdornment>
                              ) : null
                            }
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontWeight: 800 } }}
                        />
                      </TableCell>

                      {/* Café Code */}
                      <TableCell>
                        <TextField
                          value={store.cafeCode || ''}
                          size="small"
                          placeholder="Code"
                          disabled={!rowEditable}
                          onChange={(e) => handleFieldChange(store.id, 'cafeCode', e.target.value)}
                          fullWidth
                          slotProps={{ htmlInput: { style: { fontSize: '0.85rem', fontWeight: 800 } } }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontWeight: 800 } }}
                        />
                      </TableCell>

                      {/* Pin Code */}
                      <TableCell>
                        <TextField
                          value={store.pinCode || ''}
                          size="small"
                          placeholder="Pin code"
                          disabled={!rowEditable}
                          onChange={(e) => handleFieldChange(store.id, 'pinCode', e.target.value)}
                          fullWidth
                          slotProps={{ htmlInput: { style: { fontSize: '0.85rem', fontWeight: 800 } } }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontWeight: 800 } }}
                        />
                      </TableCell>

                      {/* City */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: store.city ? 'text.primary' : 'text.disabled', fontSize: '0.85rem' }}>
                          {store.city || '—'}
                        </Typography>
                      </TableCell>

                      {/* State */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: store.state ? 'text.primary' : 'text.disabled', fontSize: '0.85rem' }}>
                          {store.state || '—'}
                        </Typography>
                      </TableCell>

                      {/* Address */}
                      <TableCell>
                        <TextField
                          value={store.cafeAddress || store.address || ''}
                          size="small"
                          placeholder="Address details"
                          disabled={!rowEditable}
                          onChange={(e) => handleFieldChange(store.id, 'cafeAddress', e.target.value)}
                          fullWidth
                          multiline
                          maxRows={2}
                          slotProps={{ htmlInput: { style: { fontSize: '0.85rem', fontWeight: 800 } } }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontWeight: 800 } }}
                        />
                      </TableCell>

                      {/* Café Model */}
                      <TableCell>
                        <Select
                          value={store.cafeModel || ''}
                          size="small"
                          disabled={!rowEditable}
                          displayEmpty
                          onChange={(e) => handleFieldChange(store.id, 'cafeModel', e.target.value)}
                          fullWidth
                          sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}
                        >
                          <MenuItem value="">— Select —</MenuItem>
                          {CAFE_MODELS.map(model => (
                            <MenuItem key={model} value={model}>{model}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>

                      {/* Upload File Trigger */}
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CloudUploadIcon />}
                          onClick={() => setUploadStore(store)}
                          sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          Upload Files
                        </Button>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {(() => {
                          const hasLoi = !!store.loiUrl;
                          const isLocked = store.isLocked === true || store.isLocked === 'true';
                          
                          let currentStatus = 'In Pipeline';
                          if (isLocked || store.status === 'LIVE' || store.status === 'Live') {
                            currentStatus = 'Live';
                          } else if (store.status === 'Ready for Construction') {
                            currentStatus = 'Ready for Construction';
                          }

                          return (
                            <Select
                              value={currentStatus}
                              size="small"
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus === 'Ready for Construction') {
                                  handleStatusChangeToReady(store);
                                } else {
                                  handleFieldChange(store.id, 'status', newStatus);
                                }
                              }}
                              fullWidth
                              sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}
                            >
                              <MenuItem value="In Pipeline">In Pipeline</MenuItem>
                              {(hasLoi || currentStatus === 'Ready for Construction') && (
                                <MenuItem value="Ready for Construction">Ready for Construction</MenuItem>
                              )}
                              {(isLocked || currentStatus === 'Live') && (
                                <MenuItem value="Live">Live</MenuItem>
                              )}
                            </Select>
                          );
                        })()}
                      </TableCell>

                      {/* Actions */}
                      {canModify && (
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="Save properties">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                disabled={isLocked}
                                onClick={() => handleSaveRow(store)}
                              >
                                <SaveIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={Boolean(uploadStore)}
        onClose={() => {
          setUploadStore(null);
          setPreviewUrl(null);
          setPreviewName('');
        }}
        maxWidth={previewUrl ? "md" : "sm"}
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Upload Documents — {uploadStore?.cafeName || 'Selected Café'}
        </DialogTitle>
        <DialogContent>
          {(() => {
            const isUploadStoreLocked = uploadStore?.isLocked === true || uploadStore?.isLocked === 'true';
            return (
              <Grid container spacing={3} sx={{ mt: 0.5 }}>
                {/* Left Column: Upload slots */}
                <Grid item xs={12} md={previewUrl ? 6 : 12}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    
                    {/* Slot 1: LOI */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        1. Letter of Intent (LOI) <span style={{ color: '#ef4444' }}>*Required for Next Stage</span>
                      </Typography>
                      {uploadStore?.loiUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(34, 197, 94, 0.08)', p: 1.25, borderRadius: '8px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <LinkIcon sx={{ color: 'success.main', fontSize: 18, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                              {uploadStore.loiFileName || 'LOI Document'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="success"
                              onClick={() => {
                                setPreviewUrl(uploadStore.loiUrl);
                                setPreviewName(uploadStore.loiFileName || 'LOI Document');
                              }}
                              sx={{ py: 0.25, minHeight: 28, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              View
                            </Button>
                            <Button 
                              component="a"
                              href={uploadStore.loiUrl} 
                              download={uploadStore.loiFileName || 'loi'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              size="small" 
                              variant="contained" 
                              color="success"
                              sx={{ py: 0.25, minHeight: 28, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              Download
                            </Button>
                            {!isUploadStoreLocked && (
                              <IconButton size="small" color="error" onClick={() => handleDeleteFileSlot('loi')}>
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      ) : isUploadStoreLocked ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                          <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                            No LOI document uploaded
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} sx={{ borderRadius: '8px' }}>
                            Select File
                            <input type="file" hidden onChange={(e) => handleFileChangeForSlot(e, 'loi')} />
                          </Button>
                          {selectedFiles.loi ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, flexGrow: 1 }}>
                                {selectedFiles.loi.name}
                              </Typography>
                              <Button variant="contained" color="success" size="small" onClick={() => handleSaveFileSlot('loi')} sx={{ borderRadius: '8px' }}>
                                Save
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No file selected</Typography>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Slot 2: Budget */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        2. Budget File
                      </Typography>
                      {uploadStore?.budgetUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(111, 205, 220, 0.08)', p: 1.25, borderRadius: '8px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <LinkIcon sx={{ color: 'primary.main', fontSize: 18, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                              {uploadStore.budgetFileName || 'Budget Document'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              onClick={() => {
                                setPreviewUrl(uploadStore.budgetUrl);
                                setPreviewName(uploadStore.budgetFileName || 'Budget Document');
                              }}
                              sx={{ py: 0.25, minHeight: 28, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              View
                            </Button>
                            <Button 
                              component="a"
                              href={uploadStore.budgetUrl} 
                              download={uploadStore.budgetFileName || 'budget'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              size="small" 
                              variant="contained" 
                              color="primary"
                              sx={{ py: 0.25, minHeight: 28, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              Download
                            </Button>
                            {!isUploadStoreLocked && (
                              <IconButton size="small" color="error" onClick={() => handleDeleteFileSlot('budget')}>
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      ) : isUploadStoreLocked ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                          <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                            No Budget file uploaded
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} sx={{ borderRadius: '8px' }}>
                            Select File
                            <input type="file" hidden onChange={(e) => handleFileChangeForSlot(e, 'budget')} />
                          </Button>
                          {selectedFiles.budget ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, flexGrow: 1 }}>
                                {selectedFiles.budget.name}
                              </Typography>
                              <Button variant="contained" color="success" size="small" onClick={() => handleSaveFileSlot('budget')} sx={{ borderRadius: '8px' }}>
                                Save
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No file selected</Typography>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Slot 3: Agreement */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        3. Lease / Rental Agreement File
                      </Typography>
                      {uploadStore?.agreementUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(111, 205, 220, 0.08)', p: 1.25, borderRadius: '8px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <LinkIcon sx={{ color: 'primary.main', fontSize: 18, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                              {uploadStore.agreementFileName || 'Agreement Document'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              onClick={() => {
                                setPreviewUrl(uploadStore.agreementUrl);
                                setPreviewName(uploadStore.agreementFileName || 'Agreement Document');
                              }}
                              sx={{ py: 0.25, minHeight: 28, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              View
                            </Button>
                            <Button 
                              component="a"
                              href={uploadStore.agreementUrl} 
                              download={uploadStore.agreementFileName || 'agreement'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              size="small" 
                              variant="contained" 
                              color="primary"
                              sx={{ py: 0.25, minHeight: 28, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              Download
                            </Button>
                            {!isUploadStoreLocked && (
                              <IconButton size="small" color="error" onClick={() => handleDeleteFileSlot('agreement')}>
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      ) : isUploadStoreLocked ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                          <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                            No Lease/Rental Agreement file uploaded
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} sx={{ borderRadius: '8px' }}>
                            Select File
                            <input type="file" hidden onChange={(e) => handleFileChangeForSlot(e, 'agreement')} />
                          </Button>
                          {selectedFiles.agreement ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, flexGrow: 1 }}>
                                {selectedFiles.agreement.name}
                              </Typography>
                              <Button variant="contained" color="success" size="small" onClick={() => handleSaveFileSlot('agreement')} sx={{ borderRadius: '8px' }}>
                                Save
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No file selected</Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Right Column: File Viewer */}
                {previewUrl && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 2 }}>
                          File Viewer: {previewName}
                        </Typography>
                        <Button 
                          size="small" 
                          variant="text" 
                          color="error"
                          onClick={() => { setPreviewUrl(null); setPreviewName(''); }} 
                          sx={{ minWidth: 'auto', fontWeight: 800, fontSize: '0.75rem' }}
                        >
                          Close Preview
                        </Button>
                      </Box>
                      <Box sx={{ flexGrow: 1, minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {getFileType(previewUrl, previewName) === 'pdf' ? (
                          <iframe 
                            src={previewUrl} 
                            width="100%" 
                            height="400px" 
                            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }} 
                            title="Document Preview" 
                          />
                        ) : getFileType(previewUrl, previewName) === 'image' ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1, border: '1px solid #e2e8f0', borderRadius: '8px', bgcolor: '#fff', height: 400 }}>
                            <img 
                              src={previewUrl} 
                              alt="Preview" 
                              style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }} 
                            />
                          </Box>
                        ) : (
                          <Box sx={{ p: 4, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', bgcolor: '#fff', height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                              No inline preview available for this file format (e.g. CSV/Excel).
                            </Typography>
                            <Button 
                              component="a" 
                              href={previewUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              variant="contained" 
                              size="small"
                              sx={{ borderRadius: '8px', fontWeight: 700 }}
                            >
                              Open in New Tab
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => {
              setUploadStore(null);
              setPreviewUrl(null);
              setPreviewName('');
            }} 
            variant="contained" 
            sx={{ borderRadius: '10px', px: 4, fontWeight: 700 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ready for Construction Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmNo}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Status Update</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            onClick={handleConfirmNo} 
            variant="outlined" 
            sx={{ borderRadius: '10px', px: 3, fontWeight: 700 }}
          >
            No
          </Button>
          <Button 
            onClick={handleConfirmYes} 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: '10px', px: 3, fontWeight: 700 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Draft Store Code Creation Email Dialog */}
      <Dialog
        open={draftDialog.open}
        onClose={() => {
          // Do not close on background clicks
        }}
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
              Store Code Creation — {draftDialog.store?.cafeName}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleDraftBack}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Back
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              disabled={draftDialog.isEditable}
              onClick={handleDraftModify}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Modify
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={handleSendEmail}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Send
            </Button>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="To"
            size="small"
            value={draftDialog.to}
            onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <TextField
            fullWidth
            label="CC"
            size="small"
            value={draftDialog.cc}
            onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <TextField
            fullWidth
            label="Subject"
            size="small"
            disabled={!draftDialog.isEditable}
            value={draftDialog.subject}
            onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <TextField
            fullWidth
            label="Email Body"
            size="small"
            multiline
            minRows={10}
            maxRows={15}
            disabled={!draftDialog.isEditable}
            value={draftDialog.body}
            onChange={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
        </DialogContent>
      </Dialog>

      {/* Snackbar Alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%', borderRadius: '8px', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
