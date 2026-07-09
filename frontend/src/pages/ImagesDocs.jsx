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
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import axios from '../utils/api';

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

      {isEditMode && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
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
    const uniqueCats = Array.from(new Set(cats));
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
    <Box sx={{ maxWidth: 1600, mx: 'auto', p: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 3.5 }}>
        Images and Other Docs
      </Typography>

      <Grid container spacing={3}>
        {/* Left Half: File Upload Section & Uploaded Files List */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', minHeight: 600, position: 'relative' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Document Library
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={handleOpenDialog}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  Add New
                </Button>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

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
                <Grid container spacing={0} sx={{ mt: 1, minHeight: 480 }}>
                  {/* Category Column */}
                  <Grid size={{ xs: 12, sm: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', pr: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      Category
                    </Typography>
                    <List sx={{ width: '100%', py: 0 }}>
                      {categories.map((cat) => (
                        <ListItemButton
                          key={cat}
                          selected={activeCategory === cat}
                          onClick={() => setActiveCategory(cat)}
                          sx={{
                            py: 1.25,
                            px: 2,
                            borderRadius: '8px',
                            mb: 0.5,
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
                              variant: 'body2', 
                              sx: { fontWeight: activeCategory === cat ? 700 : 500 } 
                            }} 
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Grid>

                  {/* Uploaded Files Column */}
                  <Grid size={{ xs: 12, sm: 8 }} sx={{ pl: 3.5 }}>
                    {activeCategory === 'State GST' ? (
                      <StateGSTManager 
                        docs={filteredDocs} 
                        selectedDoc={selectedDoc} 
                        setSelectedDoc={setSelectedDoc} 
                        fetchDocs={fetchDocs} 
                        showNotification={showNotification} 
                      />
                    ) : (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                          Uploaded Files
                        </Typography>
                        {filteredDocs.length === 0 ? (
                          <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No files in this category.
                            </Typography>
                          </Box>
                        ) : (
                          <List sx={{ width: '100%', py: 0 }}>
                            {filteredDocs.map((doc, idx) => (
                              <React.Fragment key={doc.id}>
                                <ListItem 
                                  disablePadding
                                  secondaryAction={
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(doc.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                      <DeleteIcon />
                                    </IconButton>
                                  }
                                >
                                  <ListItemButton 
                                    selected={selectedDoc?.id === doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                    sx={{
                                      py: 1.5,
                                      px: 1.5,
                                      borderRadius: '8px',
                                      mb: 0.5,
                                      '&.Mui-selected': {
                                        bgcolor: 'rgba(111, 205, 220, 0.1)',
                                        '&:hover': { bgcolor: 'rgba(111, 205, 220, 0.15)' }
                                      }
                                    }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                      {getFileIcon(doc.fileUrl)}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', pr: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {doc.fileName}
                                        </Typography>
                                      }
                                      secondary={
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
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
          <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 3 }}>
                Document Preview
              </Typography>

              <Divider sx={{ mb: 3 }} />

              {!selectedDoc ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, p: 4, border: '1px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)' }}>
                  <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Select a document from the library list on the left to preview details.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {selectedDoc.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Category: <strong>{selectedDoc.category || 'General'}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Uploaded At: {selectedDoc.uploadedAt ? new Date(selectedDoc.uploadedAt).toLocaleString('en-IN') : 'N/A'}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      href={selectedDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Open File
                    </Button>
                  </Box>

                  {/* Document Preview Content */}
                  <Paper variant="outlined" sx={{ flexGrow: 1, minHeight: 380, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', p: 1, bgcolor: '#0f172a', borderRadius: '10px', position: 'relative' }}>
                    {isImageFile(selectedDoc.fileUrl) ? (
                      <img 
                        src={selectedDoc.fileUrl} 
                        alt={selectedDoc.fileName} 
                        style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: '6px' }}
                      />
                    ) : selectedDoc.fileUrl.toLowerCase().includes('.pdf') ? (
                      <iframe 
                        src={`${selectedDoc.fileUrl}#toolbar=0`} 
                        title={selectedDoc.fileName} 
                        width="100%" 
                        height="380px" 
                        style={{ border: 'none', borderRadius: '6px' }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', p: 4 }}>
                        {getFileIcon(selectedDoc.fileUrl)}
                        <Typography variant="subtitle2" sx={{ color: '#fff', mt: 2, fontWeight: 700 }}>
                          No Live Preview Available
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 300, mx: 'auto' }}>
                          This file type does not support live browser preview. You can open or download the file instead.
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              )}
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
