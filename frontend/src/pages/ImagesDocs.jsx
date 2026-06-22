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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';

export default function ImagesDocs() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState({});

  // Add new link inline form
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

  // Converter state
  const [uploadingConverter, setUploadingConverter] = useState(false);
  const [converterUrl, setConverterUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/global-docs');
      setDocuments(res.data);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to load links.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAddNewLink = async () => {
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
      setErrorMsg(`Failed to save link for ${name}`);
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

      // Update preview if the edited item is currently active in the Link Viewer
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
      setErrorMsg(`Failed to update link for ${name}`);
      console.error(err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id, category) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;
    try {
      await axios.delete(`/api/global-docs/${id}`);
      if (previewTitle === category) {
        setPreviewUrl('');
        setPreviewTitle('');
      }
      await fetchDocuments();
    } catch (err) {
      setErrorMsg('Failed to delete link.');
      console.error(err);
    }
  };

  // Converter handlers
  const handleConverterUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingConverter(true);
      setErrorMsg('');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const url = `/api/stores/upload-file?type=converter${converterUrl ? `&previousUrl=${encodeURIComponent(converterUrl)}` : ''}`;
        const res = await axios.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fileUrl = res.data.url;
        setConverterUrl(fileUrl);
        setPreviewUrl(fileUrl);
        setPreviewTitle('Converted File Preview');
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to convert file to link. Make sure it is a PDF, JPG, JPEG, or PNG.');
      } finally {
        setUploadingConverter(false);
        e.target.value = '';
      }
    }
  };

  const handleCopyLink = () => {
    if (converterUrl) {
      const fullLink = window.location.origin + converterUrl;
      navigator.clipboard.writeText(fullLink)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy text:', err));
    }
  };

  const handleClearConverter = async () => {
    if (converterUrl) {
      try {
        await axios.delete(`/api/stores/converter-file?url=${encodeURIComponent(converterUrl)}`);
      } catch (err) {
        console.error('Failed to delete converter file:', err);
        setErrorMsg('Failed to remove the converted file from the server.');
      }
      setConverterUrl('');
      if (previewTitle === 'Converted File Preview' || previewUrl === converterUrl) {
        setPreviewUrl('');
        setPreviewTitle('');
      }
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
          title="Link Viewer"
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
              title="Platform Links"
              titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
              action={
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddForm(true)}
                  sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none' }}
                >
                  Add New Link
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {/* Fixed-height scrollable area */}
              <Box sx={{ height: 420, overflowY: 'auto', p: 2 }}>
                {/* Add New Link Form (inline, at the top) */}
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
                        Add New Link
                      </Typography>
                      <IconButton size="small" onClick={() => { setShowAddForm(false); setNewLinkName(''); setNewLinkUrl(''); }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Link Name *"
                        placeholder="e.g. Swiggy BTC"
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Link URL *"
                        placeholder="https://..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewLink(); } }}
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
                          onClick={handleAddNewLink}
                          sx={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                          {addingSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Links list */}
                {documents.length === 0 && !showAddForm ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 6 }}>
                    <LinkIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No links added yet. Click "Add New Link" to get started.
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
                                Edit Link
                              </Typography>
                              <IconButton size="small" onClick={() => { setEditingId(null); setEditName(''); setEditUrl(''); }}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <TextField
                              fullWidth
                              size="small"
                              label="Link Name *"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              label="Link URL *"
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

          {/* File-to-Link Converter */}
          <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mt: 3 }}>
            <CardHeader
              title="File to Link Converter"
              subheader="Upload PDF, JPG, JPEG, PNG to generate a URL"
              titleTypographyProps={{ fontWeight: 800, variant: 'subtitle1' }}
              subheaderTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
            />
            <Divider />
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  disabled={uploadingConverter}
                  startIcon={uploadingConverter ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  sx={{ py: 1.5, borderStyle: 'dashed', borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
                >
                  {uploadingConverter ? 'Generating Link...' : 'Upload File to Convert'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleConverterUpload}
                    disabled={uploadingConverter}
                  />
                </Button>

                {converterUrl && (
                  <Box sx={{ mt: 1, p: 1.5, borderRadius: '8px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Generated Shareable Link:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={window.location.origin + converterUrl}
                      InputProps={{
                        readOnly: true,
                        sx: { fontSize: '0.8rem', fontFamily: 'monospace', bgcolor: 'background.paper' }
                      }}
                      sx={{ mb: 1.5 }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleClearConverter}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '6px' }}
                      >
                        Clear
                      </Button>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setPreviewUrl(converterUrl);
                            setPreviewTitle('Converted File Preview');
                          }}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '6px' }}
                        >
                          Preview File
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color={copied ? 'success' : 'primary'}
                          onClick={handleCopyLink}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '6px', minWidth: 100 }}
                        >
                          {copied ? 'Copied!' : 'Copy Link'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Link Viewer (sticky) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ position: 'sticky', top: 80 }}>
            <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardHeader
                title={previewTitle ? `Link Viewer: ${previewTitle}` : 'Link Viewer'}
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
                      No Link Selected
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Hover over or click on a saved link to preview its content here.
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
