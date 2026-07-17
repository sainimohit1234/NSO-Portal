import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, IconButton, 
  CircularProgress, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Divider, Alert, Snackbar, Paper, Backdrop, Portal
} from '@mui/material';
import FullScreenLoader from '../components/FullScreenLoader';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import GridOnIcon from '@mui/icons-material/GridOn';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import axios from '../utils/api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import html2pdf from 'html2pdf.js';
const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Helper to determine file icon
const getFileIcon = (url = '') => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf')) return <PictureAsPdfIcon sx={{ color: '#ef4444' }} />;
  if (lowerUrl.includes('.png') || lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.gif') || lowerUrl.includes('.webp')) {
    return <ImageIcon sx={{ color: '#3b82f6' }} />;
  }
  if (lowerUrl.includes('.csv') || lowerUrl.includes('.xls') || lowerUrl.includes('.xlsx')) {
    return <GridOnIcon sx={{ color: '#10b981' }} />;
  }
  return <InsertDriveFileIcon sx={{ color: '#6b7280' }} />;
};

function StateGSTManager({ docs, selectedDoc, setSelectedDoc, fetchDocs, showNotification }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [newRows, setNewRows] = useState([]);
  const [uploading, setUploading] = useState(false);

  const uploadedStates = docs.map(d => d.fileName);
  const getAvailableStates = (currentRowId) => {
    const selectedInOtherRows = newRows.filter(r => r.id !== currentRowId).map(r => r.stateName);
    return INDIAN_STATES.filter(state => !uploadedStates.includes(state) && !selectedInOtherRows.includes(state));
  };

  const handleAddRow = () => setNewRows([...newRows, { id: Date.now().toString(), stateName: '', file: null }]);
  const handleRemoveRow = (rowId) => setNewRows(newRows.filter(r => r.id !== rowId));
  const handleStateChange = (rowId, stateName) => setNewRows(newRows.map(r => r.id === rowId ? { ...r, stateName } : r));
  const handleFileSelect = (rowId, e) => {
    if (e.target.files && e.target.files[0]) {
      setNewRows(newRows.map(r => r.id === rowId ? { ...r, file: e.target.files[0] } : r));
    }
  };

  const handleDeleteExisting = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this GST Certificate?')) return;
    try {
      await axios.delete(`/api/global-docs/${docId}`);
      showNotification('GST Certificate deleted successfully.');
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      fetchDocs();
    } catch (err) {
      console.error('Failed to delete document:', err);
      showNotification('Failed to delete the document.', 'error');
    }
  };

  const handleUploadRow = async (row) => {
    if (!row.stateName) return showNotification('Please select a state.', 'warning');
    if (!row.file) return showNotification('Please select a file to upload.', 'warning');

    setUploading(true);
    const formData = new FormData();
    formData.append('file', row.file);
    try {
      const uploadRes = await axios.post('/api/stores/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!uploadRes.data?.url) throw new Error('No URL returned.');
      
      const newDocPayload = { category: 'State GST', linkName: row.stateName, linkUrl: uploadRes.data.url };
      const docRes = await axios.post('/api/global-docs/add-link', newDocPayload);
      showNotification(`${row.stateName} GST uploaded successfully!`);
      setNewRows(newRows.filter(r => r.id !== row.id));
      if (docRes.data) setSelectedDoc(docRes.data);
      fetchDocs();
    } catch (err) {
      console.error('Failed to upload GST certificate:', err);
      showNotification(err.response?.data?.error || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
          GST Certificates
        </Typography>
        <Button variant={isEditMode ? "outlined" : "text"} size="small" startIcon={isEditMode ? null : <EditIcon />} onClick={() => setIsEditMode(!isEditMode)} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          {isEditMode ? 'Done' : 'Edit'}
        </Button>
      </Box>

      {uploading && <FullScreenLoader messages={['Uploading GST certificate…']} blocking={true} />}

      {isEditMode && (
        <Box sx={{ mb: 3, pb: 2, borderBottom: '1px dashed', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Add GST Certificate (State-wise)</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} sx={{ textTransform: 'none', fontWeight: 600 }}>Add More</Button>
          </Box>
          {newRows.map((row) => (
            <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.02)', p: 1.5, borderRadius: '8px' }}>
              <FormControl size="small" sx={{ minWidth: 150, flexGrow: 1 }}>
                <InputLabel>Select State / UT</InputLabel>
                <Select value={row.stateName} label="Select State / UT" onChange={(e) => handleStateChange(row.id, e.target.value)}>
                  {getAvailableStates(row.id).map(state => <MenuItem key={state} value={state}>{state}</MenuItem>)}
                  {row.stateName && <MenuItem value={row.stateName} sx={{ display: 'none' }}>{row.stateName}</MenuItem>}
                </Select>
              </FormControl>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={!row.stateName} sx={{ textTransform: 'none' }}>
                {row.file ? 'Change File' : 'Select File'}
                <input type="file" hidden onChange={(e) => handleFileSelect(row.id, e)} />
              </Button>
              <Button variant="contained" onClick={() => handleUploadRow(row)} disabled={!row.stateName || !row.file} sx={{ textTransform: 'none' }}>
                Upload
              </Button>
              <IconButton onClick={() => handleRemoveRow(row.id)} color="error" size="small"><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          {newRows.length === 0 && <Typography variant="caption" color="text.secondary">Click "Add More" to upload a new GST certificate.</Typography>}
        </Box>
      )}

      <List sx={{ width: '100%', py: 0 }}>
        {docs.length === 0 && !isEditMode && newRows.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No GST certificates uploaded. Click Edit to add them.
            </Typography>
          </Box>
        )}
        {docs.map((doc, idx) => (
          <React.Fragment key={doc.id}>
            <ListItem disablePadding secondaryAction={isEditMode && (
                <IconButton edge="end" onClick={() => handleDeleteExisting(doc.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                  <DeleteIcon />
                </IconButton>
              )}>
              <ListItemButton selected={selectedDoc?.id === doc.id} onClick={() => setSelectedDoc(doc)} sx={{ py: 1.5, px: 1.5, borderRadius: '8px', mb: 0.5, '&.Mui-selected': { bgcolor: 'rgba(111, 205, 220, 0.1)' } }}>
                <ListItemIcon sx={{ minWidth: 40 }}>{getFileIcon(doc.fileUrl)}</ListItemIcon>
                <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{doc.fileName}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'Unknown Date'}</Typography>} />
              </ListItemButton>
            </ListItem>
            {idx < docs.length - 1 && <Divider component="li" sx={{ opacity: 0.5 }} />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}

export default function ImagesDocs() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('General');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Snackbar/Notification State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Edit mode for uploaded files (non-GST categories)
  const [isEditModeFiles, setIsEditModeFiles] = useState(false);

  // GST Number state for State GST preview
  const [gstNumber, setGstNumber] = useState('');
  const [savingGstNo, setSavingGstNo] = useState(false);

  // FSSAI Number state for FSSAI preview
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [savingFssaiNo, setSavingFssaiNo] = useState(false);

  const handleSaveGstNumber = async () => {
    if (!selectedDoc?.id) return;
    setSavingGstNo(true);
    try {
      await axios.put(`/api/global-docs/${selectedDoc.id}`, {
        category: selectedDoc.category,
        linkName: selectedDoc.fileName,
        linkUrl: selectedDoc.fileUrl,
        gstNumber: gstNumber.trim()
      });
      showNotification(`GST Number saved for ${selectedDoc.fileName}.`);
      fetchDocs();
    } catch (err) {
      console.error('Failed to save GST number:', err);
      showNotification('Failed to save GST number.', 'error');
    } finally {
      setSavingGstNo(false);
    }
  };

  const handleSaveFssaiNumber = async () => {
    if (!selectedDoc?.id) return;
    setSavingFssaiNo(true);
    try {
      await axios.put(`/api/global-docs/${selectedDoc.id}`, {
        category: selectedDoc.category,
        linkName: selectedDoc.fileName,
        linkUrl: selectedDoc.fileUrl,
        fssaiNumber: fssaiNumber.trim()
      });
      showNotification(`FSSAI Number saved for ${selectedDoc.fileName}.`);
      fetchDocs();
    } catch (err) {
      console.error('Failed to save FSSAI number:', err);
      showNotification('Failed to save FSSAI number.', 'error');
    } finally {
      setSavingFssaiNo(false);
    }
  };

  // Sync selectedDoc with newly fetched docs to keep it fresh
  useEffect(() => {
    if (selectedDoc) {
      const updated = docs.find(d => d.id === selectedDoc.id);
      if (updated) {
        setSelectedDoc(updated);
      }
    }
  }, [docs]);

  // Update gstNumber and fssaiNumber when selectedDoc changes
  useEffect(() => {
    if (selectedDoc?.gstNumber) {
      setGstNumber(selectedDoc.gstNumber);
    } else {
      setGstNumber('');
    }
    if (selectedDoc?.fssaiNumber) {
      setFssaiNumber(selectedDoc.fssaiNumber);
    } else {
      setFssaiNumber('');
    }
  }, [selectedDoc]);

  // Fetch documents
  const fetchDocs = async () => {
    try {
      const res = await axios.get('/api/global-docs');
      setDocs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      showNotification('Failed to load documents list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [activeCategory, setActiveCategory] = useState('General');

  // Compute unique categories dynamically
  const categories = React.useMemo(() => {
    const cats = docs.map(d => d.category || 'General');
    const uniqueCats = Array.from(new Set([...cats, 'State GST'])); // Always include State GST
    uniqueCats.sort((a, b) => a.localeCompare(b));
    return uniqueCats;
  }, [docs]);

  // Set default activeCategory to the first found category if current activeCategory doesn't exist
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  // Filter docs based on selected category
  const filteredDocs = React.useMemo(() => {
    return docs.filter(d => (d.category || 'General') === activeCategory);
  }, [docs, activeCategory]);

  useEffect(() => {
    fetchDocs();
  }, []);

  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Category rename state
  const [renamingCategory, setRenamingCategory] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const handleStartRename = (cat) => {
    setRenamingCategory(cat);
    setRenameValue(cat);
  };

  const handleCancelRename = () => {
    setRenamingCategory(null);
    setRenameValue('');
  };

  const handleSaveRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === renamingCategory) {
      handleCancelRename();
      return;
    }
    try {
      await axios.patch('/api/global-docs/rename-category', {
        oldCategory: renamingCategory,
        newCategory: renameValue.trim()
      });
      showNotification(`Category renamed to "${renameValue.trim()}"`);
      setActiveCategory(renameValue.trim());
      handleCancelRename();
      fetchDocs();
    } catch (err) {
      console.error('Failed to rename category:', err);
      showNotification('Failed to rename category.', 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = () => {
    setFileName('');
    setCategory('General');
    setSelectedFile(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (!uploading) {
      setOpenDialog(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-populate fileName if empty
      if (!fileName) {
        // Strip extension for display
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFileName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification('Please select a file to upload.', 'warning');
      return;
    }
    if (!fileName.trim()) {
      showNotification('Please enter a file name.', 'warning');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // 1. Upload file using stores upload endpoint
      const uploadRes = await axios.post('/api/stores/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      const fileUrl = uploadRes.data?.url;

      if (!fileUrl) {
        throw new Error('Upload succeeded but no URL was returned.');
      }

      // 2. Register link in global documents collection
      const newDocPayload = {
        category: category.trim() || 'General',
        linkName: fileName.trim(),
        linkUrl: fileUrl
      };

      const docRes = await axios.post('/api/global-docs/add-link', newDocPayload);
      
      showNotification('File uploaded and registered successfully!');
      setOpenDialog(false);
      
      // Auto-select category and document
      const docCategory = category.trim() || 'General';
      setActiveCategory(docCategory);
      if (docRes.data) {
        setSelectedDoc(docRes.data);
      }
      
      fetchDocs();
    } catch (err) {
      console.error('Failed to upload document:', err);
      showNotification(err.response?.data?.error || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await axios.delete(`/api/global-docs/${docId}`);
      showNotification('File deleted successfully.');
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      fetchDocs();
    } catch (err) {
      console.error('Failed to delete document:', err);
      showNotification('Failed to delete the document.', 'error');
    }
  };

  const isImageFile = (url = '') => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.png') || lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.gif') || lowerUrl.includes('.webp');
  };

  return (
    <Box sx={{ width: '100%', py: 1, px: { xs: 1, md: 2 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 2.5 }}>
        Images and Other Docs
      </Typography>

      <Grid container spacing={3}>
        {/* Left Half: File Upload Section & Uploaded Files List */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', height: 600, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Navy Header Bar */}
            <Box sx={{ 
              background: 'linear-gradient(135deg, #0A314D 0%, #061e30 100%)', 
              px: 3, 
              py: 1.75, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
              height: '60px',
              boxSizing: 'border-box'
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                Document Library
              </Typography>
              <Button 
                variant="contained" 
                size="small"
                startIcon={<AddIcon />} 
                onClick={handleOpenDialog}
                sx={{ 
                  borderRadius: '8px', 
                  textTransform: 'none', 
                  fontWeight: 700, 
                  fontSize: '0.75rem', 
                  py: 0.5, 
                  px: 1.8,
                  bgcolor: '#ffffff',
                  color: '#0A314D',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                Add New
              </Button>
            </Box>
            <CardContent sx={{ p: 3, pb: '24px !important', display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', height: 'calc(100% - 60px)' }}>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                  <FullScreenLoader messages={[
                    'Warming up the espresso machine…',
                    'Grinding the freshest beans…',
                    'Gathering the document library…',
                    'Plating the details…',
                    'Almost ready to serve ☕',
                  ]} subtle />
                </Box>
              ) : docs.length === 0 ? (
                <Box sx={{ p: 8, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No documents uploaded yet. Click "Add New" to upload your first file.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={0} sx={{ mt: 0.5, flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                  {/* Category Column */}
                  <Grid size={{ xs: 12, sm: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', pr: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.06em', flexShrink: 0 }}>
                      Category
                    </Typography>
                    <List sx={{ width: '100%', py: 0, overflow: 'auto', flexGrow: 1 }} dense>
                      {categories.map((cat) => (
                        <ListItem
                          key={cat}
                          disablePadding
                          secondaryAction={
                            cat !== 'State GST' && activeCategory === cat && renamingCategory !== cat ? (
                              <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleStartRename(cat); }} sx={{ opacity: 0.5, '&:hover': { opacity: 1 }, p: 0.3 }}>
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            ) : null
                          }
                        >
                          {renamingCategory === cat ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', py: 0.3, px: 1 }}>
                              <TextField
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                size="small"
                                autoFocus
                                variant="standard"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') handleCancelRename(); }}
                                sx={{ flexGrow: 1, '& .MuiInput-input': { fontSize: '0.75rem', py: 0.3 } }}
                              />
                              <IconButton size="small" onClick={handleSaveRename} color="success" sx={{ p: 0.3 }}><CheckIcon sx={{ fontSize: 15 }} /></IconButton>
                              <IconButton size="small" onClick={handleCancelRename} color="error" sx={{ p: 0.3 }}><CloseIcon sx={{ fontSize: 15 }} /></IconButton>
                            </Box>
                          ) : (
                            <ListItemButton
                              selected={activeCategory === cat}
                              onClick={() => setActiveCategory(cat)}
                              sx={{
                                py: 0.7,
                                px: 1.5,
                                borderRadius: '6px',
                                mb: 0.3,
                                '&.Mui-selected': {
                                  bgcolor: 'rgba(111, 205, 220, 0.15)',
                                  color: 'primary.main',
                                  fontWeight: 700,
                                  '&:hover': { bgcolor: 'rgba(111, 205, 220, 0.22)' }
                                }
                              }}
                            >
                              <ListItemText 
                                primary={cat} 
                                primaryTypographyProps={{ 
                                  sx: { fontWeight: activeCategory === cat ? 700 : 500, fontSize: '0.78rem' } 
                                }} 
                              />
                            </ListItemButton>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  {/* Uploaded Files Column */}
                  <Grid size={{ xs: 12, sm: 8 }} sx={{ pl: 2.5, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                    {activeCategory === 'State GST' ? (
                      <Box sx={{ overflow: 'auto', flexGrow: 1, pr: 0.5, height: '100%' }}>
                        <StateGSTManager 
                          docs={filteredDocs} 
                          selectedDoc={selectedDoc} 
                          setSelectedDoc={setSelectedDoc} 
                          fetchDocs={fetchDocs} 
                          showNotification={showNotification} 
                        />
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                            Uploaded Files
                          </Typography>
                          <Button variant={isEditModeFiles ? 'outlined' : 'text'} size="small" startIcon={isEditModeFiles ? null : <EditIcon />} onClick={() => setIsEditModeFiles(!isEditModeFiles)} sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, fontSize: '0.7rem', py: 0.2, minWidth: 'auto' }}>
                            {isEditModeFiles ? 'Done' : 'Edit'}
                          </Button>
                        </Box>
                        {filteredDocs.length === 0 ? (
                          <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No files in this category.
                            </Typography>
                          </Box>
                        ) : (
                          <List sx={{ width: '100%', py: 0, overflow: 'auto', flexGrow: 1 }}>
                            {filteredDocs.map((doc, idx) => (
                              <React.Fragment key={doc.id}>
                                <ListItem 
                                  disablePadding
                                  secondaryAction={
                                    isEditModeFiles ? (
                                      <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(doc.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    ) : null
                                  }
                                >
                                  <ListItemButton 
                                    selected={selectedDoc?.id === doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                    sx={{
                                      py: 0.8,
                                      px: 1,
                                      borderRadius: '6px',
                                      mb: 0.3,
                                      '&.Mui-selected': {
                                        bgcolor: 'rgba(111, 205, 220, 0.1)',
                                        '&:hover': { bgcolor: 'rgba(111, 205, 220, 0.15)' }
                                      }
                                    }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                      {getFileIcon(doc.fileUrl)}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={
                                        <Typography sx={{ fontWeight: 600, color: 'text.primary', pr: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem' }}>
                                          {doc.fileName}
                                        </Typography>
                                      }
                                      secondary={
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block', fontSize: '0.65rem' }}>
                                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'Unknown Date'}
                                        </Typography>
                                      }
                                    />
                                  </ListItemButton>
                                </ListItem>
                                {idx < filteredDocs.length - 1 && <Divider component="li" sx={{ opacity: 0.5 }} />}
                              </React.Fragment>
                            ))}
                          </List>
                        )}
                      </>
                    )}
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
        {/* Right Half: Live Document Preview Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', height: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Navy Header Bar */}
            <Box sx={{ 
              background: 'linear-gradient(135deg, #0A314D 0%, #061e30 100%)', 
              px: 3, 
              py: 1.75, 
              display: 'flex', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
              height: '60px',
              boxSizing: 'border-box'
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                Document Preview
              </Typography>
            </Box>
            <CardContent sx={{ p: 3, pb: '24px !important', display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', height: 'calc(100% - 60px)' }}>

              {/* Scrollable Content */}
              <Box sx={{ overflow: 'auto', flexGrow: 1, pt: 2, pb: 2 }}>
              {!selectedDoc ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, p: 4, border: '1px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)', minHeight: 400 }}>
                  <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Select a document from the library list on the left to preview details.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                        {selectedDoc.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, fontSize: '0.68rem' }}>
                        Category: <strong>{selectedDoc.category || 'General'}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, fontSize: '0.68rem' }}>
                        Uploaded At: {selectedDoc.uploadedAt ? new Date(selectedDoc.uploadedAt).toLocaleString('en-IN') : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        href={selectedDoc.fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.72rem' }}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        href={selectedDoc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.72rem' }}
                      >
                        Open File
                      </Button>
                    </Box>
                  </Box>

                  {/* GST Number field for State GST documents */}
                  {activeCategory === 'State GST' && selectedDoc && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(111, 205, 220, 0.05)', borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        GST Number for {selectedDoc.fileName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          placeholder="Enter GST Number"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                          sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' }, '& .MuiOutlinedInput-input': { fontSize: '0.82rem', py: 0.8 } }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<SaveIcon />}
                          onClick={handleSaveGstNumber}
                          disabled={savingGstNo}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.7 }}
                        >
                          {savingGstNo ? 'Saving…' : 'Save'}
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* FSSAI Number field for FSSAI documents */}
                  {selectedDoc && (selectedDoc.fileName?.toLowerCase().includes('fssai') || selectedDoc.category?.toLowerCase().includes('fssai')) && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(245, 158, 11, 0.05)', borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        FSSAI Number for {selectedDoc.fileName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          placeholder="Enter FSSAI Number"
                          value={fssaiNumber}
                          onChange={(e) => setFssaiNumber(e.target.value)}
                          sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' }, '& .MuiOutlinedInput-input': { fontSize: '0.82rem', py: 0.8 } }}
                        />
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          startIcon={<SaveIcon />}
                          onClick={handleSaveFssaiNumber}
                          disabled={savingFssaiNo}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.7, bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                        >
                          {savingFssaiNo ? 'Saving…' : 'Save'}
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* Document Preview Content */}
                  <Paper variant="outlined" sx={{ flexGrow: 1, minHeight: 380, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', p: 1, bgcolor: '#0f172a', borderRadius: '10px', position: 'relative' }}>
                    {(() => {
                      const fileUrl = selectedDoc.fileUrl || '';
                      const fileName = selectedDoc.fileName || '';
                      const combined = (fileUrl + '|' + fileName).toLowerCase();
                      const isImage = isImageFile(fileUrl);
                      const isPdf = combined.includes('.pdf');

                      if (!fileUrl) {
                        return (
                          <Box sx={{ textAlign: 'center', p: 4 }}>
                            <InsertDriveFileIcon sx={{ color: '#6b7280', fontSize: 40 }} />
                            <Typography variant="subtitle2" sx={{ color: '#fff', mt: 2, fontWeight: 700 }}>No Preview Available</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>No file URL found for this document.</Typography>
                          </Box>
                        );
                      }

                      if (isImage) {
                        return (
                          <img
                            src={fileUrl}
                            alt={fileName}
                            style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: '6px' }}
                          />
                        );
                      }

                      if (isPdf) {
                        // Native browser PDF viewer
                        return (
                          <iframe
                            src={`${fileUrl}#toolbar=0`}
                            title={fileName}
                            width="100%"
                            height="380px"
                            style={{ border: 'none', borderRadius: '6px' }}
                          />
                        );
                      }

                      // For all other types (xlsx, xls, csv, docx, doc, pptx, ppt, etc.)
                      // Use Google Docs Viewer which can preview all office formats
                      const absoluteUrl = fileUrl.startsWith('http')
                        ? fileUrl
                        : `${window.location.origin}${fileUrl}`;
                      const gdocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;
                      return (
                        <iframe
                          src={gdocsViewerUrl}
                          title={fileName}
                          width="100%"
                          height="380px"
                          style={{ border: 'none', borderRadius: '6px' }}
                        />
                      );
                    })()}
                  </Paper>
                </Box>
              )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upload Dialog Pop-up */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <form onSubmit={handleUpload}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
            Upload New File
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
              <TextField 
                fullWidth
                label="File Name *"
                placeholder="e.g. FSSAI License, Cafe Front Image..."
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={uploading}
                required
              />

              <TextField 
                fullWidth
                label="Category"
                placeholder="e.g. General, Layout, Invoicing..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={uploading}
              />

              {/* Styled File Input Button */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Select File (PDF, JPEG, PNG, CSV, etc.) *
                </Typography>
                <Box 
                  sx={{ 
                    border: '1px dashed', 
                    borderColor: selectedFile ? 'primary.main' : 'divider', 
                    borderRadius: '8px', 
                    p: 3, 
                    textAlign: 'center',
                    bgcolor: 'rgba(255,255,255,0.01)',
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                  }}
                  component="label"
                >
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  <CloudUploadIcon sx={{ fontSize: 32, color: selectedFile ? 'primary.main' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedFile ? selectedFile.name : 'Click to select file'}
                  </Typography>
                  {selectedFile && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={handleCloseDialog} disabled={uploading} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={uploading || !selectedFile || !fileName.trim()}
              sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '8px' }}
            >
              {uploading ? <CircularProgress size={24} color="inherit" /> : 'Upload File'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        style={{ zIndex: 2147483647 }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Portal>
        {uploading && <FullScreenLoader messages={[
          'Warming up the espresso machine…',
          'Grinding the freshest beans…',
          'Uploading your document securely…',
          'Plating the details…',
          'Almost ready to serve ☕',
        ]} blocking={true} />}
      </Portal>
    </Box>
  );
}
