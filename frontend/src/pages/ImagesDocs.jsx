import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, IconButton, CircularProgress, Alert, TextField,
  InputAdornment, Grid, Card, CardContent, CardHeader, Divider, Stack
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import axios, { normalizeListResponse } from '../utils/api';

export default function ImagesDocs() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Add new doc inline form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewImageError, setPreviewImageError] = useState(false);

  useEffect(() => {
    setPreviewImageError(false);
  }, [previewUrl]);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
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

  const handleAddNewDoc = async () => {
    const name = newLinkName.trim();
    const url = newLinkUrl.trim();
    if (!name || !url) return;

    setAddingSaving(true);
    setErrorMsg('');
    try {
      await axios.post('/api/global-docs/add-link', {
        category: name,
        linkName: name,
        linkUrl: url
      });
      setNewLinkName('');
      setNewLinkUrl('');
      setShowAddForm(false);
      await fetchDocuments();
      setPreviewUrl(url);
      setPreviewTitle(name);
    } catch (err) {
      setErrorMsg(`Failed to save document for ${name}`);
      console.error(err);
    } finally {
      setAddingSaving(false);
    }
  };

  const handleSaveEdit = async (id) => {
    const name = editName.trim();
    const url = editUrl.trim();
    if (!name || !url) return;

    setEditSaving(true);
    setErrorMsg('');
    try {
      await axios.put(`/api/global-docs/${id}`, {
        category: name,
        linkName: name,
        linkUrl: url
      });

      // Update preview if the edited item is currently active in the Doc Viewer
      const doc = documents.find(d => d.id === id);
      if (doc && (previewTitle === doc.category || previewUrl === doc.fileUrl)) {
        setPreviewTitle(name);
        setPreviewUrl(url);
      }

      setEditingId(null);
      setEditName('');
      setEditUrl('');
      await fetchDocuments();
    } catch (err) {
      setErrorMsg(`Failed to update document for ${name}`);
      console.error(err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id, category) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`/api/global-docs/${id}`);
      if (previewTitle === category) {
        setPreviewUrl('');
        setPreviewTitle('');
      }
      await fetchDocuments();
    } catch (err) {
      setErrorMsg('Failed to delete document.');
      console.error(err);
    }
  };

  const renderPreview = (url) => {
    if (!url) return null;

    // Normalize: strip current origin so /uploads/... paths work via proxy
    let normalizedUrl = url;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) {
        normalizedUrl = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch (e) {
      // If URL parsing fails, use as-is
    }

    const lowerUrl = normalizedUrl.toLowerCase();
    const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/);

    if (isImage && !previewImageError) {
      return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <a
            href={normalizedUrl}
            download
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textDecoration: 'none' }}
          >
            <img
              src={normalizedUrl}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
              onError={() => {
                setPreviewImageError(true);
              }}
            />
          </a>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <iframe
          src={normalizedUrl}
          title="Doc Viewer"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </Box>
    );
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

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid size={{ xs: 12, md: 6 }}>
          {/* Platform Links Card — Fixed Height */}
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
              {/* Fixed-height scrollable area matching Doc Viewer height */}
              <Box sx={{ height: 550, overflowY: 'auto', p: 2 }}>
                {/* Add New Doc Form (inline, at the top) */}
                {showAddForm && (
                  <Box
                    sx={{
                      p: 2, mb: 2,
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      borderRadius: '10px',
                      bgcolor: 'rgba(0,122,140,0.03)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Add New Doc
                      </Typography>
                      <IconButton size="small" onClick={() => { setShowAddForm(false); setNewLinkName(''); setNewLinkUrl(''); }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Doc Name *"
                        placeholder="e.g. Swiggy BTC"
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Doc URL *"
                        placeholder="https://..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewDoc(); } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LinkIcon sx={{ fontSize: 18, color: 'action.active' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => { setShowAddForm(false); setNewLinkName(''); setNewLinkUrl(''); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={addingSaving ? null : <SaveIcon />}
                          disabled={addingSaving || !newLinkName.trim() || !newLinkUrl.trim()}
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 6 }}>
                    <LinkIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No documents added yet. Click "Add New Doc" to get started.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {documents.map(doc => (
                      <Box
                        key={doc.id}
                        sx={{
                          display: 'flex',
                          flexDirection: editingId === doc.id ? 'column' : 'row',
                          alignItems: editingId === doc.id ? 'stretch' : 'center',
                          gap: 1.5,
                          p: 1.5,
                          bgcolor: 'rgba(0,122,140,0.03)',
                          border: '1px solid',
                          borderColor: editingId === doc.id ? 'primary.main' : 'rgba(0,122,140,0.12)',
                          borderRadius: '10px',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(0,122,140,0.06)' }
                        }}
                      >
                        {editingId === doc.id ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                Edit Doc
                              </Typography>
                              <IconButton size="small" onClick={() => { setEditingId(null); setEditName(''); setEditUrl(''); }}>
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
                            <TextField
                              fullWidth
                              size="small"
                              label="Doc URL *"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(doc.id); } }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <LinkIcon sx={{ fontSize: 18, color: 'action.active' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Button
                                size="small"
                                onClick={() => { setEditingId(null); setEditName(''); setEditUrl(''); }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={editSaving ? null : <SaveIcon />}
                                disabled={editSaving || !editName.trim() || !editUrl.trim()}
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
                                fontSize: '0.85rem',
                                minWidth: 120,
                                flexShrink: 0,
                                color: 'text.primary'
                              }}
                            >
                              {doc.category}
                            </Typography>

                            {/* Link URL — clickable to preview */}
                            <Box
                              sx={{
                                flexGrow: 1,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setPreviewUrl(doc.fileUrl);
                                setPreviewTitle(doc.category);
                              }}
                              onMouseEnter={() => {
                                setPreviewUrl(doc.fileUrl);
                                setPreviewTitle(doc.category);
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
                                  fontSize: '0.8rem',
                                  textDecoration: 'underline',
                                  textDecorationColor: 'rgba(0,122,140,0.3)',
                                }}
                              >
                                {doc.fileUrl}
                              </Typography>
                            </Box>

                            {/* Actions */}
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setEditingId(doc.id);
                                setEditName(doc.category);
                                setEditUrl(doc.fileUrl);
                              }}
                              sx={{ flexShrink: 0 }}
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
                              sx={{ flexShrink: 0 }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(doc.id, doc.category)}
                              sx={{ flexShrink: 0 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
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

        {/* Right Column: Doc Viewer (sticky) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ position: 'sticky', top: 80 }}>
            <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardHeader
                title={previewTitle ? `Doc Viewer: ${previewTitle}` : 'Doc Viewer'}
                titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
                action={
                  previewUrl && (
                    <IconButton
                      component="a"
                      href={previewUrl}
                      download
                      color="primary"
                    >
                      <DownloadIcon />
                    </IconButton>
                  )
                }
              />
              <Divider />
              <CardContent sx={{ p: 3, height: '550px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {previewUrl ? (
                  renderPreview(previewUrl)
                ) : (
                  <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                    <DescriptionIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                      No Document Selected
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Hover over or click on a saved document to preview its content here.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
