import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Chip, TextField, MenuItem,
  Button, IconButton, Tooltip, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, InputAdornment,
  Stack, Divider
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import LayersIcon from '@mui/icons-material/Layers';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import ConstructionIcon from '@mui/icons-material/Construction';
import EngineeringIcon from '@mui/icons-material/Engineering';
import axios from '../utils/api';
import DocumentManagerModal, { DOCUMENT_CONFIG } from '../components/DocumentManagerModal';
import FullScreenLoader from '../components/FullScreenLoader';

import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';
import { CAFE_MODELS } from '../constants/storeOptions';


const DebouncedTextField = ({ value, onChange, debounceTime = 400, ...props }) => {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== (value || '')) {
        onChange({ target: { value: localValue } });
      }
    }, debounceTime);
    return () => clearTimeout(handler);
  }, [localValue, value, onChange, debounceTime]);

  return (
    <TextField
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      {...props}
    />
  );
};

export default function ExpansionPipeline() {
  const { user } = useAuth();
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'LEGAL', 'FINANCE'];
  const canModify = allowedRoles.includes(user?.role?.toUpperCase());

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

  const getDocumentStatusInfo = (store, categoryName) => {
    const categoryConfig = DOCUMENT_CONFIG.find(c => c.name === categoryName);
    if (!categoryConfig) return { bg: 'warning.light', color: 'warning.dark', hoverBg: 'warning.main', label: 'Awaiting Documents' };

    let mandatoryDocs = [];
    if (categoryConfig.subcategories) {
      categoryConfig.subcategories.forEach(sub => {
        mandatoryDocs = [...mandatoryDocs, ...sub.docs.filter(d => d.mandatory)];
      });
    } else if (categoryConfig.docs) {
      mandatoryDocs = categoryConfig.docs.filter(d => d.mandatory);
    }

    const uploadedDocs = store.documents || [];
    // Helper to check if a specific document type is uploaded
    const isDocUploaded = (reqDoc) => {
      // Legacy fallbacks for specific fields, just in case
      if (categoryName === 'Legal Documents') {
        if (reqDoc.type === 'Letter of Intent (LOI)' && store.loiUrl) return true;
        if (reqDoc.type === 'Lease / Rental Agreement' && store.agreementUrl) return true;
      }
      if (categoryName === 'Financial Documents') {
        if (reqDoc.type === 'Budget Approval' && store.budgetUrl) return true;
      }
      return uploadedDocs.some(d => d.type === reqDoc.type && d.url);
    };

    const isComplete = mandatoryDocs.length > 0 && mandatoryDocs.every(isDocUploaded);

    if (isComplete) {
      return { bg: 'success.light', color: 'success.dark', hoverBg: 'success.main', label: 'Completed' };
    }

    // Default 'Awaiting Documents' state, modified by creation date logic
    const createdDate = store.createdAt ? new Date(store.createdAt) : null;
    if (!createdDate) {
      // Fallback if no creation date exists
      return { bg: '#f1f5f9', color: '#64748b', hoverBg: '#e2e8f0', label: 'Awaiting Documents' };
    }

    const now = new Date();
    // Calculate days diff (ignoring time of day by setting to midnight might be safer, but raw diff is fine)
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      return { bg: '#fee2e2', color: '#b91c1c', hoverBg: '#f87171', label: 'Overdue (7+ Days)' };
    } else if (diffDays >= 3) {
      return { bg: 'warning.light', color: 'warning.dark', hoverBg: 'warning.main', label: 'Pending (3+ Days)' };
    } else {
      return { bg: '#f1f5f9', color: '#64748b', hoverBg: '#e2e8f0', label: 'Awaiting Documents' };
    }
  };

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
  const [searchBrand, setSearchBrand] = useState('');
  const [searchCafeName, setSearchCafeName] = useState('');
  const [searchCafeCode, setSearchCafeCode] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchCafeModel, setSearchCafeModel] = useState('');
  const [searchCreatedBy, setSearchCreatedBy] = useState('');
  
  const [editingStoreIds, setEditingStoreIds] = useState(new Set());

  const toggleEditMode = (storeId) => {
    setEditingStoreIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) newSet.delete(storeId);
      else newSet.add(storeId);
      return newSet;
    });
  };

  // Email Mappings & Templates for mapped triggers checking
  const [emailMappings, setEmailMappings] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState({});

  // Upload Modal State
  const [uploadModalConfig, setUploadModalConfig] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');

  // Alert State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Upload Store State
  const [uploadStore, setUploadStore] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});

  // Ready for Construction Flow States
  const [confirmDialog, setConfirmDialog] = useState({ open: false, store: null, message: '', hasCode: false });
  const [draftDialog, setDraftDialog] = useState({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });

  const loadData = () => {
    setLoading(true);
    fetchStoresFromFirestore()
      .then(fetchedStores => {
        // Load all active stores (including live and closed ones)
        const allStores = fetchedStores;
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
          const allStores = list;
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
    axios.get('/api/system/email-mappings')
      .then(res => setEmailMappings(res.data || []))
      .catch(err => console.error('Failed to load email mappings', err));
    axios.get('/api/system/email-templates')
      .then(res => setEmailTemplates(res.data || {}))
      .catch(err => console.error('Failed to load email templates', err));
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

    // Auto Status Logic
    let autoStatus = store.status;
    const hasCode = !!(store.cafeCode && store.cafeCode.trim());
    const hasLoi = store.documents?.some(d => d.type === 'Letter of Intent (LOI)' && d.url) || !!store.loiUrl;

    if (['In Pipeline', 'Agreement Signed'].includes(autoStatus)) {
      if (hasCode && hasLoi) {
        autoStatus = 'Ready for Construction';
      } else if (!hasCode && hasLoi) {
        autoStatus = 'Agreement Signed';
      } else {
        autoStatus = 'In Pipeline';
      }
    }
    const finalStore = { ...store, status: autoStatus };

    if (!canModify) return;
    if (!store.cafeName.trim()) {
      setSnackbar({ open: true, message: 'Café Name is required.', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const payload = { ...finalStore };
      // Remove local client-only properties
      delete payload.isTemp;
      const method = store.isTemp ? 'post' : 'put';
      const endpoint = store.isTemp ? '/api/stores' : `/api/stores/${store.id}`;
      await axios({ method, url: endpoint, data: payload });
      setSnackbar({ open: true, message: store.isTemp ? 'Café created successfully' : 'Changes saved successfully', severity: 'success' });
      
      if (!store.isTemp) {
        setEditingStoreIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(store.id);
          return newSet;
        });
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
    if (norm === 'UNDER_CONSTRUCTION' || norm === 'UNDER CONSTRUCTION') {
      return ['Under Construction'];
    }

    if (norm === 'PENDING_APPROVAL' || norm === 'APPROVAL_PENDING' || norm === 'APPROVAL PENDING' || norm === 'SENT TO NSO TEAM FOR APPROVAL') {
      return ['Sent to NSO Team for Approval', 'Approval Pending', 'PENDING_APPROVAL'];
    }
    if (norm === 'APPROVED' || norm === 'NSO_APPROVED') {
      return ['Approved', 'APPROVED', 'NSO_APPROVED'];
    }
    if (norm === 'ON_HOLD' || norm === 'ON HOLD') {
      return ['On Hold', 'ON_HOLD'];
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
      .replace(/{model}|\[Model\]|\[Cafe Model\]/gi, store.cafeModel || '')
      .replace(/{cafeCode}|\[Store Code\]|\[Cafe Code\]/gi, store.cafeCode || '')
      .replace(/{pincode}|\[Pincode\]|\[Pin Code\]/gi, store.pinCode || '');
  };

  const handleDropdownStatusChange = (store, newStatus) => {

    const config = getMappedConfigForStatus(newStatus);
    if (config) {
      const subject = replacePlaceholders(config.template.subject, store);
      const body = replacePlaceholders(config.template.body, store);
      const to = config.mapping.to.join(', ');
      const cc = config.mapping.cc.join(', ');

      setDraftDialog({
        open: true,
        store,
        status: newStatus,
        to,
        cc,
        subject,
        body,
        isEditable: false,
        isStatusTrigger: true
      });
    } else {
      handleFieldChange(store.id, 'status', newStatus);
    }
  };

  const handleConfirmYes = async () => {
    const store = confirmDialog.store;
    
    // Close confirmation dialog
    setConfirmDialog(prev => ({ ...prev, open: false, store: null }));

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
  };

  const handleConfirmNo = () => {
    setConfirmDialog({ open: false, store: null, message: '', hasCode: false });
  };

  const handleSendEmail = async () => {
    const store = draftDialog.store;
    try {
      setLoading(true);
      if (draftDialog.isStatusTrigger) {
        await axios.post(`/api/stores/${store.id}/send-status-email`, {
          status: draftDialog.status,
          to: draftDialog.to,
          cc: draftDialog.cc,
          subject: draftDialog.subject,
          body: draftDialog.body
        });
        setSnackbar({ open: true, message: `Email sent and status updated to ${draftDialog.status}.`, severity: 'success' });
      } else {
        await axios.post(`/api/stores/${store.id}/send-store-code-email`, {
          to: draftDialog.to,
          cc: draftDialog.cc,
          subject: draftDialog.subject,
          body: draftDialog.body
        });
        setSnackbar({ open: true, message: 'Email sent and status updated to Ready for Construction.', severity: 'success' });
      }
      setDraftDialog({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to send email.', severity: 'error' });
      setLoading(false);
    }
  };

  const handleDraftBack = () => {
    if (draftDialog.isStatusTrigger) {
      setDraftDialog({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });
    } else {
      const store = draftDialog.store;
      setDraftDialog({ open: false, store: null, to: '', cc: '', subject: '', body: '', isEditable: false });
      setConfirmDialog({
        open: true,
        store,
        message: 'Are you sure you want to send this project to the NSO Team for further processing and send the Store Code Creation email?',
        hasCode: false
      });
    }
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
      if (slot === 'loi') {
        updatedFields.status = 'Agreement Signed';
      }
      
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
    if (slot === 'loi') {
      updatedFields.status = 'In Pipeline';
    }
    
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

  const performInlineUpload = async (store, slot, file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(`/api/stores/upload-file?type=${slot}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.url;

      const updatedFields = { [`${slot}Url`]: fileUrl, [`${slot}FileName`]: file.name };
      if (slot === 'loi') {
        updatedFields.status = 'Agreement Signed';
      }

      if (store.isTemp || String(store.id).startsWith('temp_')) {
        setStores(prev => prev.map(s => s.id === store.id ? { ...s, ...updatedFields } : s));
        setSnackbar({ open: true, message: `${slot.toUpperCase()} file uploaded. Click Save on the row to save details.`, severity: 'success' });
      } else {
        await axios.put(`/api/stores/${store.id}`, updatedFields);
        setStores(prev => prev.map(s => s.id === store.id ? { ...s, ...updatedFields } : s));
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

  const performInlineDelete = async (store, slot) => {
    const updatedFields = { [`${slot}Url`]: null, [`${slot}FileName`]: null };
    if (slot === 'loi') {
      updatedFields.status = 'In Pipeline';
    }

    if (store.isTemp || String(store.id).startsWith('temp_')) {
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, ...updatedFields } : s));
      setSnackbar({ open: true, message: `${slot.toUpperCase()} file removed locally.`, severity: 'success' });
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/api/stores/${store.id}`, updatedFields);
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, ...updatedFields } : s));
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

    if (status === 'PENDING_APPROVAL') return 'Pending Approval';
    if (status === 'APPROVED' || status === 'NSO_APPROVED') return 'Approved';
    if (status === 'READY_TO_GO_LIVE') return 'Ready to Go Live';
    if (status === 'ON_HOLD') return 'On Hold';
    return status;
  };

  const getStoreStatus = (store) => {
    const isLocked = store.isLocked === true || store.isLocked === 'true';
    if (isLocked || store.status === 'LIVE' || store.status === 'Live') {
      return 'Live';
    } else if (store.status === 'Under Construction') {
      return 'Under Construction';
    } else if (store.status === 'Ready for Construction') {
      return 'Ready for Construction';
    } else if (store.status === 'Agreement Signed') {
      return 'Agreement Signed';
    }
    return 'In Pipeline';
  };

  const pipelineCount = stores.filter(s => getStoreStatus(s) === 'In Pipeline').length;
  const agreementCount = stores.filter(s => getStoreStatus(s) === 'Agreement Signed').length;
  const constructionCount = stores.filter(s => getStoreStatus(s) === 'Ready for Construction').length;
  const developmentCount = stores.filter(s => getStoreStatus(s) === 'Under Construction').length;
  const pendingLegalCount = stores.filter(s => getDocumentStatusInfo(s, 'Legal Documents').label !== 'Completed').length;
  const pendingFinancialCount = stores.filter(s => getDocumentStatusInfo(s, 'Financial Documents').label !== 'Completed').length;
  const pendingProjectCount = stores.filter(s => getDocumentStatusInfo(s, 'Project Documents').label !== 'Completed').length;
  const totalCount = stores.length;

  const filteredStores = stores.filter(s => {
    if (selectedStatusFilter) {
      if (selectedStatusFilter === 'Pending Legal') {
        if (getDocumentStatusInfo(s, 'Legal Documents').label === 'Completed') return false;
      } else if (selectedStatusFilter === 'Pending Financial') {
        if (getDocumentStatusInfo(s, 'Financial Documents').label === 'Completed') return false;
      } else if (selectedStatusFilter === 'Pending Project') {
        if (getDocumentStatusInfo(s, 'Project Documents').label === 'Completed') return false;
      } else if (getStoreStatus(s) !== selectedStatusFilter) {
        return false;
      }
    }
    if (searchBrand && !s.brand?.toLowerCase().includes(searchBrand.toLowerCase())) return false;
    if (searchCafeName && !s.cafeName?.toLowerCase().includes(searchCafeName.toLowerCase())) return false;
    if (searchCafeCode && !s.cafeCode?.toLowerCase().includes(searchCafeCode.toLowerCase())) return false;
    if (searchCity && !s.city?.toLowerCase().includes(searchCity.toLowerCase())) return false;
    if (searchState && !s.state?.toLowerCase().includes(searchState.toLowerCase())) return false;
    if (searchCafeModel && !s.cafeModel?.toLowerCase().includes(searchCafeModel.toLowerCase())) return false;
    if (searchCreatedBy && !s.enteredByEmail?.toLowerCase().includes(searchCreatedBy.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => {
    setSearchBrand('');
    setSearchCafeName('');
    setSearchCafeCode('');
    setSearchCity('');
    setSearchState('');
    setSearchCafeModel('');
    setSearchCreatedBy('');
  };

  return (
    <Box sx={{ py: 1 }}>
      {/* Header */}
      <Card sx={{ mb: 2.5, overflow: 'hidden', bgcolor: '#0f2942' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 }, position: 'relative' }}>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, position: 'relative' }}>
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                NEW STORE MANAGEMENT
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.75, fontSize: { xs: '1.55rem', md: '1.95rem', lg: '2.15rem' } }}>
                Expansion Pipeline
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 680, fontSize: { xs: '0.8rem', md: '0.84rem' }, color: 'rgba(255,255,255,0.8)' }}>
                Manage upcoming café properties, look up pin codes, and upload approval documents.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: 'flex-start' }}>
              <Chip 
                label={selectedStatusFilter ? `${filteredStores.length} of ${stores.length} Projects` : `${stores.length} Active Projects`} 
                sx={{ justifyContent: 'center', bgcolor: 'rgba(111,205,220,0.2)', color: '#ffffff', fontWeight: 700 }} 
              />
              {canModify && (
                <Button 
                  variant="contained" 
                  onClick={handleAddNewRow}
                  startIcon={<AddCircleOutlineIcon />}
                  sx={{ 
                    borderRadius: '10px', 
                    fontWeight: 700, 
                    px: 3, 
                    height: 32,
                    bgcolor: '#ffffff',
                    color: '#0f2942',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.9)'
                    }
                  }}
                >
                  Add New Project
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filter Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(4, minmax(0, 1fr))',
            md: 'repeat(8, minmax(0, 1fr))'
          },
          gap: 2,
          mb: 3.5
        }}
      >
        {[
          {
            key: 'all',
            label: 'All Projects',
            count: totalCount,
            filterValue: null,
            icon: <LayersIcon />,
            color: '#1e3a8a'
          },
          {
            key: 'pipeline',
            label: 'In Pipeline',
            count: pipelineCount,
            filterValue: 'In Pipeline',
            icon: <TimelineIcon />,
            color: '#3b82f6'
          },
          {
            key: 'agreement',
            label: 'Agreement Signed',
            count: agreementCount,
            filterValue: 'Agreement Signed',
            icon: <AssignmentIcon />,
            color: '#10b981'
          },
          {
            key: 'construction',
            label: 'Ready for Construction',
            count: constructionCount,
            filterValue: 'Ready for Construction',
            icon: <ConstructionIcon />,
            color: '#f59e0b'
          },
          {
            key: 'development',
            label: 'Under Construction',
            count: developmentCount,
            filterValue: 'Under Construction',
            icon: <EngineeringIcon />,
            color: '#8b5cf6'
          },
          {
            key: 'legal',
            label: 'Legal Documents Pending',
            count: pendingLegalCount,
            filterValue: 'Pending Legal',
            icon: <DescriptionIcon />,
            color: '#e84118'
          },
          {
            key: 'financial',
            label: 'Financial Documents Pending',
            count: pendingFinancialCount,
            filterValue: 'Pending Financial',
            icon: <DescriptionIcon />,
            color: '#273c75'
          },
          {
            key: 'project',
            label: 'Project Documents Pending',
            count: pendingProjectCount,
            filterValue: 'Pending Project',
            icon: <DescriptionIcon />,
            color: '#44bd32'
          }
        ].map((tile) => {
          const isActive = selectedStatusFilter === tile.filterValue;
          return (
            <Card
              key={tile.key}
              onClick={() => setSelectedStatusFilter(isActive ? null : tile.filterValue)}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '16px',
                border: '2px solid',
                borderColor: isActive ? tile.color : 'transparent',
                boxShadow: isActive 
                  ? `0 12px 24px ${tile.color}1e, inset 0 2px 0 rgba(255,255,255,0.5)`
                  : '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                opacity: selectedStatusFilter !== null && !isActive ? 0.65 : 1,
                transform: isActive ? 'scale(1.02)' : 'none',
                '&:hover': {
                  transform: isActive ? 'scale(1.02) translateY(-2px)' : 'translateY(-3px)',
                  boxShadow: isActive 
                    ? `0 16px 32px ${tile.color}2c`
                    : '0 12px 24px rgba(15,23,42,0.08)',
                  opacity: 1,
                  borderColor: isActive ? tile.color : `${tile.color}40`
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
                  top: -24,
                  right: -24,
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${tile.color}18 0%, ${tile.color}00 70%)`
                }}
              />
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 0.75, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em', 
                        fontSize: '0.7rem' 
                      }}
                    >
                      {tile.label}
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'text.primary', 
                        fontSize: { xs: '1.8rem', md: '2.1rem' }, 
                        lineHeight: 1, 
                        mb: 0.5 
                      }}
                    >
                      {tile.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isActive ? 'Active Filter' : 'Click to filter'}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{
                      bgcolor: isActive ? tile.color : `${tile.color}15`,
                      p: 1.25,
                      borderRadius: 3.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#ffffff' : tile.color,
                      border: `1px solid ${tile.color}30`,
                      transition: 'all 0.3s ease',
                      boxShadow: isActive ? `0 4px 12px ${tile.color}40` : 'none'
                    }}
                  >
                    {React.cloneElement(tile.icon, { sx: { fontSize: 24 } })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>



      {/* Filters */}
      <Card sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: '16px' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <TextField size="small" label="Brand" value={searchBrand} onChange={e => setSearchBrand(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <TextField size="small" label="Cafe Name" value={searchCafeName} onChange={e => setSearchCafeName(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <TextField size="small" label="Cafe Code" value={searchCafeCode} onChange={e => setSearchCafeCode(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <TextField size="small" label="City" value={searchCity} onChange={e => setSearchCity(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <TextField size="small" label="State" value={searchState} onChange={e => setSearchState(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <TextField size="small" label="Cafe Model" value={searchCafeModel} onChange={e => setSearchCafeModel(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <TextField size="small" label="Created By" value={searchCreatedBy} onChange={e => setSearchCreatedBy(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
          <Button variant="outlined" onClick={clearFilters} sx={{ height: 40, borderRadius: '8px', minWidth: 80 }}>Clear</Button>
        </Box>
      </Card>

      {/* Pipeline Table */}
      <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', overflow: 'hidden' }}>
        <TableContainer sx={{ 
          maxHeight: '78vh', 
          overflowX: 'auto',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
        }}>
          <Table stickyHeader sx={{ minWidth: 2500, tableLayout: 'fixed', '& .MuiTableCell-root': { px: 1, py: 1.25 } }}>
                        <TableHead>
              {/* 
                WARNING: The sequence and placement of the columns below are STRICTLY LOCKED. 
                Do NOT reorder, edit, or remove the first 13 columns (from S.No. up to MISCELLANEOUS DOCUMENTS).
                Any new column added in the future MUST be inserted AFTER "MISCELLANEOUS DOCUMENTS" and BEFORE "Status".
              */}
              <TableRow>
                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, fontWeight: 800, width: 50, bgcolor: 'background.paper', color: 'text.primary' }}>S.No.</TableCell>
                <TableCell sx={{ position: 'sticky', left: 50, zIndex: 4, fontWeight: 800, width: 160, bgcolor: 'background.paper', color: 'text.primary' }}>Brand</TableCell>
                <TableCell sx={{ position: 'sticky', left: 210, zIndex: 4, fontWeight: 800, width: 240, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>Café Name</TableCell>
                <TableCell sx={{ position: 'sticky', left: 450, zIndex: 4, fontWeight: 800, width: 110, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>Café Code</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 110 }}>Pin Code</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 130 }}>City</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 130 }}>State</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 350 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 150 }}>Café Model</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>LEGAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>FINANCIAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>PROJECT DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 220, textAlign: 'center' }}>MISCELLANEOUS DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 180 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 180 }}>Created By</TableCell>
                {canModify && <TableCell sx={{ position: 'sticky', right: 0, zIndex: 4, fontWeight: 800, width: 80, borderLeft: '1.5px solid', borderColor: 'divider' }} align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 15 : 14} align="center" sx={{ py: 6 }}>
                    <Box sx={{ py: 8 }}>
                      <FullScreenLoader messages={[
                        'Warming up the espresso machine…',
                        'Grinding the freshest beans…',
                        'Loading the expansion pipeline…',
                        'Plating the details…',
                        'Almost ready to serve ☕',
                      ]} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 15 : 14} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No expansion pipeline stores registered.
                  </TableCell>
                </TableRow>
              ) : filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 15 : 14} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No stores match the selected status filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store, index) => {
                  const hasLoi = !!store.loiUrl;
                  const isLocked = store.isLocked === true || store.isLocked === 'true';
                  const rowEditable = canModify && !isLocked && (store.isTemp || editingStoreIds.has(store.id));

                  return (
                    <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                       {/* 
                         WARNING: The sequence of TableCells below is STRICTLY LOCKED and MUST match the TableHead above. 
                         Do NOT reorder, edit, or remove the first 13 columns (from S.No. up to MISCELLANEOUS DOCUMENTS).
                         Any new column must be inserted AFTER "MISCELLANEOUS DOCUMENTS".
                       */}
                       {/* Serial No. */}
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', color: 'text.primary', fontWeight: 800 }}>{index + 1}</TableCell>

                      {/* Brand Select */}
                      <TableCell sx={{ position: 'sticky', left: 50, zIndex: 2, bgcolor: 'background.paper' }}>
                        <Select
                          value={store.brand || ''}
                          displayEmpty
                          size="small"
                          disabled={!rowEditable}
                          onChange={(e) => handleFieldChange(store.id, 'brand', e.target.value)}
                          fullWidth
                          sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}
                        >
                          <MenuItem value="" disabled><em>Select Brand</em></MenuItem>
                          <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's</MenuItem>
                          <MenuItem value="GOT_TEA">Got Tea</MenuItem>
                        </Select>
                      </TableCell>
                      {/* Café Name */}
                      <TableCell sx={{ position: 'sticky', left: 210, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>
                        <DebouncedTextField
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
                      <TableCell sx={{ position: 'sticky', left: 450, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>
                        <DebouncedTextField
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
                        <DebouncedTextField
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
                        <DebouncedTextField
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

                      {/* LEGAL DOCUMENTS */}
                      <TableCell align="center">
                        {(() => {
                          const statusInfo = getDocumentStatusInfo(store, 'Legal Documents');
                          return (
                            <Chip 
                              label={statusInfo.label} 
                              onClick={() => setUploadModalConfig({ store, category: 'Legal Documents' })}
                              sx={{ 
                                bgcolor: statusInfo.bg, 
                                color: statusInfo.color, 
                                fontWeight: 700,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: statusInfo.hoverBg, color: 'primary.contrastText' }
                              }} 
                            />
                          );
                        })()}
                      </TableCell>
                      {/* FINANCIAL DOCUMENTS */}
                      <TableCell align="center">
                        {(() => {
                          const statusInfo = getDocumentStatusInfo(store, 'Financial Documents');
                          return (
                            <Chip 
                              label={statusInfo.label} 
                              onClick={() => setUploadModalConfig({ store, category: 'Financial Documents' })}
                              sx={{ 
                                bgcolor: statusInfo.bg, 
                                color: statusInfo.color, 
                                fontWeight: 700,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: statusInfo.hoverBg, color: 'primary.contrastText' }
                              }} 
                            />
                          );
                        })()}
                      </TableCell>
                      {/* PROJECT DOCUMENTS */}
                      <TableCell align="center">
                        {(() => {
                          const statusInfo = getDocumentStatusInfo(store, 'Project Documents');
                          return (
                            <Chip 
                              label={statusInfo.label} 
                              onClick={() => setUploadModalConfig({ store, category: 'Project Documents' })}
                              sx={{ 
                                bgcolor: statusInfo.bg, 
                                color: statusInfo.color, 
                                fontWeight: 700,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: statusInfo.hoverBg, color: 'primary.contrastText' }
                              }} 
                            />
                          );
                        })()}
                      </TableCell>
                      {/* MISCELLANEOUS DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label="Optional" 
                          onClick={() => setUploadModalConfig({ store, category: 'Miscellaneous Documents' })}
                          sx={{ 
                            bgcolor: 'info.light', 
                            color: 'info.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'info.main', color: 'primary.contrastText' }
                          }} 
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {(() => {
                          const isLocked = store.isLocked === true || store.isLocked === 'true';
                          let currentStatus = 'In Pipeline';
                          
                          if (isLocked || ['LIVE', 'Live', 'READY_TO_GO_LIVE', 'APPROVED', 'PENDING_APPROVAL', 'Under Construction'].includes(store.status)) {
                            currentStatus = 'Under Construction';
                          } else if (store.status === 'Ready for Construction') {
                            currentStatus = 'Ready for Construction';
                          } else if (store.status === 'Agreement Signed') {
                            currentStatus = 'Agreement Signed';
                          }
 
                          return (
                            <Select
                              value={currentStatus}
                              size="small"
                              disabled={isLocked}
                              onChange={(e) => {
                                 const newStatus = e.target.value;
                                 handleDropdownStatusChange(store, newStatus);
                              }}
                               fullWidth
                               sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}
                             >
                               {currentStatus === 'In Pipeline' && (
                                 <MenuItem value="In Pipeline">In Pipeline</MenuItem>
                               )}
                               {((currentStatus === 'In Pipeline' && hasLoi) || currentStatus === 'Agreement Signed') && (
                                 <MenuItem value="Agreement Signed">Agreement Signed</MenuItem>
                               )}
                               {currentStatus === 'Ready for Construction' && (
                                 <MenuItem value="Ready for Construction">Ready for Construction</MenuItem>
                               )}
                               {(isLocked || currentStatus === 'Under Construction') && (
                                 <MenuItem value="Under Construction">Under Construction</MenuItem>
                               )}
                             </Select>
                           );
                        })()}
                      </TableCell>

                      {/* Created By */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
                            {store.enteredByEmail || '—'}
                          </Typography>
                          {store.createdAt && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {new Date(store.createdAt).toLocaleString('en-IN', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Actions */}
                      {canModify && (
                        <TableCell align="center" sx={{ position: 'sticky', right: 0, zIndex: 2, bgcolor: 'background.paper', borderLeft: '1.5px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title={editingStoreIds.has(store.id) ? "Cancel editing" : "Enable inline editing"}>
                              <IconButton 
                                size="small" 
                                color={editingStoreIds.has(store.id) ? "default" : "info"}
                                disabled={isLocked}
                                onClick={() => toggleEditMode(store.id)}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Save properties">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                disabled={isLocked || (!editingStoreIds.has(store.id) && !store.isTemp)}
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

      {/* File Preview Dialog */}
      <Dialog
        open={Boolean(previewUrl)}
        onClose={() => {
          setPreviewUrl(null);
          setPreviewName('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Preview: {previewName}</Typography>
          <Button component="a" href={previewUrl} download={previewName} variant="outlined" size="small" sx={{ borderRadius: '8px' }}>
            Download File
          </Button>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ minHeight: 450, display: 'flex', flexDirection: 'column' }}>
            {getFileType(previewUrl, previewName) === 'pdf' ? (
              <iframe 
                src={previewUrl} 
                width="100%" 
                height="500px" 
                style={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', backgroundColor: 'background.paper' }} 
                title="Document Preview" 
              />
            ) : getFileType(previewUrl, previewName) === 'image' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper', height: 500 }}>
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain' }} 
                />
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper', height: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => {
              setPreviewUrl(null);
              setPreviewName('');
            }} 
            variant="contained" 
            sx={{ borderRadius: '10px', px: 4, fontWeight: 700 }}
          >
            Close
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
              {draftDialog.isStatusTrigger ? `Status: ${draftDialog.status}` : 'Store Code Creation'} — {draftDialog.store?.cafeName}
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
              {draftDialog.isStatusTrigger ? 'Cancel' : 'Back'}
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

      
            {/* Upload Documents Modal */}
      {uploadModalConfig && (
        <DocumentManagerModal 
          open={!!uploadModalConfig} 
          store={uploadModalConfig.store}
          activeCategory={uploadModalConfig.category}
          canModify={canModify && !(uploadModalConfig.store.isLocked === true || uploadModalConfig.store.isLocked === 'true' || ['NSO_APPROVED', 'APPROVED', 'READY_TO_GO_LIVE', 'LIVE'].includes(uploadModalConfig.store.status))}
          onClose={() => setUploadModalConfig(null)}
          setSnackbar={setSnackbar}
          onSave={(payload) => {
              setStores(prev => prev.map(s => s.id === uploadModalConfig.store.id ? { ...s, ...payload } : s));
          }}
        />
      )}

      {/* Snackbar Alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        style={{ zIndex: 2147483647 }}
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
