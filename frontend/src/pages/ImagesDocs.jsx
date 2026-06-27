import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, IconButton, CircularProgress, Alert, TextField,
  Grid, Card, CardContent, CardHeader, Divider, Stack
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios, { normalizeListResponse } from '../utils/api';

export default function ImagesDocs() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Add new doc inline form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newOriginalFileName, setNewOriginalFileName] = useState('');
  const [uploadingNewFile, setUploadingNewFile] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editOriginalFileName, setEditOriginalFileName] = useState('');
  const [uploadingEditFile, setUploadingEditFile] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/global-docs');
      setDocuments(normalizeListResponse(res.data));
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to load documents.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (file, isEdit = false) => {
    const maxSizeBytes = 300 * 1024; // 300KB
    if (file.size > maxSizeBytes) {
      setErrorMsg('File size must not exceed 300KB.');
      if (isEdit) {
        setEditFileUrl('');
        setEditOriginalFileName('');
      } else {
        setNewFileUrl('');
        setNewOriginalFileName('');
      }
      return null;
    }

    setErrorMsg('');
    if (isEdit) {
      setUploadingEditFile(true);
      setEditOriginalFileName(file.name);
    } else {
      setUploadingNewFile(true);
      setNewOriginalFileName(file.name);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/stores/upload-file?type=global-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = res.data.url;
      if (isEdit) {
        setEditFileUrl(uploadedUrl);
      } else {
        setNewFileUrl(uploadedUrl);
      }
      return uploadedUrl;
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to upload file. Make sure it is a PDF, DOCX, DOC, JPG, JPEG, or PNG.');
      return null;
    } finally {
      if (isEdit) {
        setUploadingEditFile(false);
      } else {
        setUploadingNewFile(false);
      }
    }
  };

  const handleAddNewDoc = async () => {
    const name = newLinkName.trim();
    const url = newFileUrl.trim();
    if (!name || !url) return;

    setAddingSaving(true);
    setErrorMsg('');
    try {
      await axios.post('/api/global-docs/add-link', {
        category: name,
        linkName: newOriginalFileName || url.substring(url.lastIndexOf('/') + 1),
        linkUrl: url
      });
      setNewLinkName('');
      setNewFileUrl('');
      setNewOriginalFileName('');
      setShowAddForm(false);
      await fetchDocuments();
    } catch (err) {
      setErrorMsg(`Failed to save document for ${name}`);
      console.error(err);
    } finally {
      setAddingSaving(false);
    }
  };

  const handleStartEdit = (doc) => {
    setEditingId(doc.id);
    setEditName(doc.category);
    setEditFileUrl(doc.fileUrl);
    setEditOriginalFileName(doc.fileName || '');
  };

  const handleSaveEdit = async (id) => {
    const name = editName.trim();
    const url = editFileUrl.trim();
    if (!name || !url) return;

    setEditSaving(true);
    setErrorMsg('');
    try {
      await axios.put(`/api/global-docs/${id}`, {
        category: name,
        linkName: editOriginalFileName || url.substring(url.lastIndexOf('/') + 1),
        linkUrl: url
      });

      setEditingId(null);
      setEditName('');
      setEditFileUrl('');
      setEditOriginalFileName('');
      await fetchDocuments();
    } catch (err) {
      setErrorMsg(`Failed to update document for ${name}`);
      console.error(err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`/api/global-docs/${id}`);
      await fetchDocuments();
    } catch (err) {
      setErrorMsg('Failed to delete document.');
      console.error(err);
    }
  };

  if (loading && documents.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 3 }}>
        Images and Other Docs
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={3} justifyContent="center">
        {/* Main Column */}
        <Grid size={{ xs: 12, md: 10, lg: 8 }}>
          {/* Platform Documents Card */}
          <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
              title="Platform Documents"
              titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
              action={
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddForm(true)}
                  sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none' }}
                >
                  Add New Doc
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {/* Scrollable list area */}
              <Box sx={{ minHeight: 400, maxSize: 600, overflowY: 'auto', p: 3 }}>
                {/* Add New Doc Form (inline, at the top) */}
                {showAddForm && (
                  <Box
                    sx={{
                      p: 2.5, mb: 3,
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      borderRadius: '12px',
                      bgcolor: 'rgba(0,122,140,0.03)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Add New Doc
                      </Typography>
                      <IconButton size="small" onClick={() => { setShowAddForm(false); setNewLinkName(''); setNewFileUrl(''); setNewOriginalFileName(''); }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Doc Name *"
                        placeholder="e.g. Swiggy BTC"
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      />

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Doc File (Max 300KB) *
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          disabled={uploadingNewFile}
                          startIcon={uploadingNewFile ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                          sx={{ textTransform: 'none', borderStyle: 'dashed', py: 1.5, borderRadius: '8px' }}
                        >
                          {newFileUrl ? 'Replace File' : 'Upload File'}
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(e.target.files[0], false);
                              }
                            }}
                          />
                        </Button>
                        {newFileUrl && (
                          <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, wordBreak: 'break-all' }}>
                            ✓ File uploaded: {newOriginalFileName || newFileUrl.substring(newFileUrl.lastIndexOf('/') + 1)}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
                        <Button
                          size="small"
                          onClick={() => { setShowAddForm(false); setNewLinkName(''); setNewFileUrl(''); setNewOriginalFileName(''); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={addingSaving ? null : <SaveIcon />}
                          disabled={addingSaving || !newLinkName.trim() || !newFileUrl.trim()}
                          onClick={handleAddNewDoc}
                          sx={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                          {addingSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Docs list */}
                {documents.length === 0 && !showAddForm ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                    <DescriptionIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No documents added yet. Click "Add New Doc" to get started.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {documents.map(doc => (
                      <Box
                        key={doc.id}
                        sx={{
                          display: 'flex',
                          flexDirection: editingId === doc.id ? 'column' : 'row',
                          alignItems: editingId === doc.id ? 'stretch' : 'center',
                          gap: 2,
                          p: 2,
                          bgcolor: 'rgba(0,122,140,0.03)',
                          border: '1px solid',
                          borderColor: editingId === doc.id ? 'primary.main' : 'rgba(0,122,140,0.12)',
                          borderRadius: '12px',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(0,122,140,0.06)' }
                        }}
                      >
                        {editingId === doc.id ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                Edit Doc
                              </Typography>
                              <IconButton size="small" onClick={() => { setEditingId(null); setEditName(''); setEditFileUrl(''); setEditOriginalFileName(''); }}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <TextField
                              fullWidth
                              size="small"
                              label="Doc Name *"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                            />

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Doc File (Max 300KB) *
                              </Typography>
                              <Button
                                variant="outlined"
                                component="label"
                                disabled={uploadingEditFile}
                                startIcon={uploadingEditFile ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                                sx={{ textTransform: 'none', borderStyle: 'dashed', py: 1.5, borderRadius: '8px' }}
                              >
                                Replace File
                                <input
                                  type="file"
                                  hidden
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(e.target.files[0], true);
                                    }
                                  }}
                                />
                              </Button>
                              {editFileUrl && (
                                <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, wordBreak: 'break-all' }}>
                                  ✓ File uploaded: {editOriginalFileName || editFileUrl.substring(editFileUrl.lastIndexOf('/') + 1)}
                                </Typography>
                              )}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1.5 }}>
                              <Button
                                size="small"
                                onClick={() => { setEditingId(null); setEditName(''); setEditFileUrl(''); setEditOriginalFileName(''); }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={editSaving ? null : <SaveIcon />}
                                disabled={editSaving || !editName.trim() || !editFileUrl.trim()}
                                onClick={() => handleSaveEdit(doc.id)}
                                sx={{ borderRadius: '8px', fontWeight: 600 }}
                              >
                                {editSaving ? 'Saving...' : 'Save'}
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <>
                            {/* Category Label */}
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                minWidth: 150,
                                flexShrink: 0,
                                color: 'text.primary'
                              }}
                            >
                              {doc.category}
                            </Typography>

                            {/* Link URL — clickable to open in new tab */}
                            <Box
                              component="a"
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                flexGrow: 1,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                textDecoration: 'none',
                              }}
                            >
                              <LinkIcon sx={{ color: 'primary.main', fontSize: 18, flexShrink: 0 }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: 'primary.main',
                                  fontSize: '0.85rem',
                                  textDecoration: 'underline',
                                  textDecorationColor: 'rgba(0,122,140,0.3)',
                                  '&:hover': { color: 'primary.dark' }
                                }}
                              >
                                {doc.fileName && doc.fileName !== doc.category 
                                  ? doc.fileName 
                                  : doc.fileUrl.substring(doc.fileUrl.lastIndexOf('/') + 1)}
                              </Typography>
                            </Box>

                            {/* Actions */}
                            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  handleStartEdit(doc);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                component="a"
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="primary"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(doc.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
