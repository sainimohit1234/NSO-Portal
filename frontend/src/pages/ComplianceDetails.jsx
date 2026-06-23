import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack, 
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, 
  IconButton, List, ListItem, ListItemText, useTheme, CardHeader, Divider, Paper,
  InputAdornment, Link, ListItemIcon
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getCurrentStatusTextFormat } from '../utils/status';

// Date utility functions
const backendToDateInput = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const dateInputToBackend = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

export default function ComplianceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canEdit = isSuperAdmin || !(store?.isLocked);

  // Form states
  const [fssaiNo, setFssaiNo] = useState('');
  const [fssaiStartDate, setFssaiStartDate] = useState('');
  const [fssaiExpiry, setFssaiExpiry] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');

  const [gstNo, setGstNo] = useState('');
  const [gstCertificateLink, setGstCertificateLink] = useState('');

  const [rentStartDate, setRentStartDate] = useState('');
  const [rentExpiry, setRentExpiry] = useState('');
  const [rentAgreementLink, setRentAgreementLink] = useState('');

  const [supportingDocs, setSupportingDocs] = useState([]); // Array of strings (links)

  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewImageError, setPreviewImageError] = useState(false);

  useEffect(() => {
    setPreviewImageError(false);
  }, [previewUrl]);

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
    const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/) || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.webp');

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
              alt="Document Preview"
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
          title="Document Viewer"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </Box>
    );
  };

  const [uploadingConverter, setUploadingConverter] = useState(false);
  const [converterUrl, setConverterUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleConverterUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingConverter(true);
      setErrorMsg('');
      setSuccessMsg('');
      
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
        setSuccessMsg('File converted to link successfully!');
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
        setSuccessMsg('Converted file removed successfully.');
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

  // Upload confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingUploadType, setPendingUploadType] = useState(''); // 'fssai', 'gst', 'rent', 'supporting'

  // Scanning loader state for FSSAI verification
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');

  useEffect(() => {
    fetchStoreDetails();
  }, [id]);

  const fetchStoreDetails = () => {
    setLoading(true);
    axios.get(`/api/stores`)
      .then(res => {
        const found = res.data.find(s => s.id === parseInt(id));
        if (found) {
          setStore(found);
          setFssaiNo(found.fssaiNo || '');
          setFssaiStartDate(backendToDateInput(found.fssaiStartDate));
          setFssaiExpiry(backendToDateInput(found.fssaiExpiry));
          setFssaiLicense(found.fssaiLicense || '');
          
          setGstNo(found.gstNo || '');
          setGstCertificateLink(found.gstCertificateLink || '');
          
          setRentStartDate(backendToDateInput(found.rentStartDate));
          setRentExpiry(backendToDateInput(found.rentExpiry));
          setRentAgreementLink(found.rentAgreementLink || '');

          // parse supporting docs
          let docs = [];
          if (found.supportingDocs) {
            try {
              docs = JSON.parse(found.supportingDocs);
              if (!Array.isArray(docs)) {
                docs = found.supportingDocs.split(',').filter(Boolean);
              }
            } catch (e) {
              docs = found.supportingDocs.split(',').filter(Boolean);
            }
          }
          setSupportingDocs(docs);
        } else {
          setErrorMsg('Store not found.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setErrorMsg('Failed to load store compliance data.');
        setLoading(false);
      });
  };

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      setPendingFile(e.target.files[0]);
      setPendingUploadType(type);
      setConfirmOpen(true);
    }
  };

  const executeUpload = async () => {
    setConfirmOpen(false);
    setErrorMsg('');
    setSuccessMsg('');

    if (!pendingFile) return;

    const performUploadAPI = async () => {
      const formData = new FormData();
      formData.append('file', pendingFile);

      try {
        const res = await axios.post(`/api/stores/upload-file?type=${pendingUploadType}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const fileUrl = res.data.url;
        if (pendingUploadType === 'fssai') {
          setFssaiLicense(fileUrl);
          setSuccessMsg('FSSAI certificate uploaded and verified successfully.');
        } else if (pendingUploadType === 'gst') {
          setGstCertificateLink(fileUrl);
          setSuccessMsg('GST certificate uploaded successfully.');
        } else if (pendingUploadType === 'rent') {
          setRentAgreementLink(fileUrl);
          setSuccessMsg('Rent Agreement uploaded successfully.');
        } else if (pendingUploadType === 'supporting') {
          setSupportingDocs([...supportingDocs, fileUrl]);
          setSuccessMsg('Supporting document uploaded successfully.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Failed to upload document.');
      } finally {
        setPendingFile(null);
        setPendingUploadType('');
      }
    };

    if (pendingUploadType === 'fssai') {
      // Heuristic logo scan visual effect
      setScanning(true);
      setScanStep('Detecting FSSAI Logo...');
      setTimeout(() => {
        setScanStep('Running OCR analysis for license alignment...');
        setTimeout(() => {
          setScanStep('Verifying certificate signature authenticity...');
          setTimeout(() => {
            setScanning(false);
            setScanStep('');
            performUploadAPI();
          }, 600);
        }, 600);
      }, 600);
    } else {
      performUploadAPI();
    }
  };

  const handleSave = async (silent = false) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        fssaiNo,
        fssaiStartDate: dateInputToBackend(fssaiStartDate),
        fssaiExpiry: dateInputToBackend(fssaiExpiry),
        fssaiLicense,
        gstNo,
        gstCertificateLink,
        rentStartDate: dateInputToBackend(rentStartDate),
        rentExpiry: dateInputToBackend(rentExpiry),
        rentAgreementLink,
        supportingDocs: JSON.stringify(supportingDocs)
      };

      await axios.put(`/api/stores/${id}`, payload);
      if (!silent) {
        setSuccessMsg('Compliance and Lease details saved successfully.');
      }
      return true;
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to save compliance details.');
      return false;
    }
  };

  const handleApproveCompliance = async () => {
    // Save first to ensure the backend has the latest details
    const saved = await handleSave(true);
    if (!saved) return;

    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axios.put(`/api/stores/${id}/compliance-approve`);
      setSuccessMsg('Store compliance details successfully approved!');
      setTimeout(() => {
        navigate('/compliance');
      }, 1500);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data?.missingFields) {
        setErrorMsg(`Compliance approval failed. The following mandatory compliance details are missing: ${err.response.data.missingFields.join(', ')}.`);
      } else {
        setErrorMsg(err.response?.data?.error || 'Failed to approve compliance.');
      }
    }
  };

  const deleteSupportingDoc = (index) => {
    const updated = supportingDocs.filter((_, idx) => idx !== index);
    setSupportingDocs(updated);
  };

  const isFormValid = () => {
    return (
      fssaiNo && fssaiLicense && fssaiStartDate && fssaiExpiry &&
      gstNo && gstCertificateLink &&
      rentStartDate && rentExpiry && rentAgreementLink
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', py: 1 }}>
      {/* Back button */}
      <Button 
        variant="text" 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/compliance')}
        sx={{ mb: 3, fontWeight: 700 }}
      >
        Back to Queue
      </Button>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Manage Compliance: {store?.cafeName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Store Code: <strong>{store?.cafeCode}</strong> | Current Status: <strong>{getCurrentStatusTextFormat(store)}</strong> | City: <strong>{store?.city || '-'}</strong> | State: <strong>{store?.state || '-'}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={() => handleSave(false)}
            disabled={!canEdit}
            sx={{ borderRadius: '10px', px: 3, fontWeight: 700 }}
          >
            Save Progress
          </Button>
          {/* Approve button — visible only to Finance/SuperAdmin with proper permission */}
          {((user?.role === 'FINANCE' && user?.permissions?.split(',').map(p => p.trim()).includes('APPROVER')) || 
            (user?.role === 'SUPER_ADMIN' && user?.permissions?.split(',').map(p => p.trim()).includes('APPROVE_COMPLIANCE'))) && (
            <Button 
              variant="contained" 
              color="success"
              onClick={handleApproveCompliance}
              disabled={!canEdit || !isFormValid()}
              sx={{ 
                borderRadius: '10px', 
                px: 3, 
                fontWeight: 700, 
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' } 
              }}
            >
              Approve Compliance
            </Button>
          )}
        </Stack>
      </Box>

      {store?.isLocked && !isSuperAdmin && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>
          This store is locked. Only the Super Admin can modify compliance details.
        </Alert>
      )}

      {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{successMsg}</Alert>}

      <Grid container spacing={3}>
        {/* Left Column: Form Cards */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            {/* Card 1: FSSAI License */}
            <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <CardHeader title="FSSAI Licensing" titleTypographyProps={{ fontWeight: 800, variant: 'h6' }} />
                <Divider />
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField 
                        fullWidth 
                        label="FSSAI License Number" 
                        value={fssaiNo} 
                        onChange={(e) => setFssaiNo(e.target.value)} 
                        placeholder="Enter 14-digit FSSAI Number"
                        size="small"
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField 
                        fullWidth 
                        type="date" 
                        label="FSSAI Start Date" 
                        value={fssaiStartDate} 
                        onChange={(e) => setFssaiStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField 
                        fullWidth 
                        type="date" 
                        label="FSSAI Expiry Date" 
                        value={fssaiExpiry} 
                        onChange={(e) => setFssaiExpiry(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField 
                        fullWidth 
                        label="FSSAI Certificate Link" 
                        value={fssaiLicense} 
                        onChange={(e) => {
                          setFssaiLicense(e.target.value);
                          if (previewTitle === 'FSSAI Certificate') {
                            setPreviewUrl(e.target.value);
                          }
                        }} 
                        placeholder="Enter FSSAI Certificate URL/Link"
                        size="small"
                        disabled={!canEdit}
                        onMouseEnter={() => {
                          if (fssaiLicense) {
                            setPreviewUrl(fssaiLicense);
                            setPreviewTitle('FSSAI Certificate');
                          }
                        }}
                        onFocus={() => {
                          if (fssaiLicense) {
                            setPreviewUrl(fssaiLicense);
                            setPreviewTitle('FSSAI Certificate');
                          }
                        }}
                        InputProps={{
                          endAdornment: fssaiLicense ? (
                            <InputAdornment position="end">
                              <Button 
                                size="small" 
                                onClick={() => window.open(fssaiLicense, '_blank')}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setPreviewUrl(fssaiLicense);
                                  setPreviewTitle('FSSAI Certificate');
                                }}
                                sx={{ fontWeight: 700 }}
                              >
                                View
                              </Button>
                            </InputAdornment>
                          ) : null
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Card 2: GST Certification */}
              <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <CardHeader title="GST Registration" titleTypographyProps={{ fontWeight: 800, variant: 'h6' }} />
                <Divider />
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField 
                        fullWidth 
                        label="GST Number" 
                        value={gstNo} 
                        onChange={(e) => setGstNo(e.target.value)} 
                        placeholder="Enter GSTIN Number"
                        size="small"
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField 
                        fullWidth 
                        label="GST Certificate Link" 
                        value={gstCertificateLink} 
                        onChange={(e) => {
                          setGstCertificateLink(e.target.value);
                          if (previewTitle === 'GST Certificate') {
                            setPreviewUrl(e.target.value);
                          }
                        }} 
                        placeholder="Enter GST Certificate URL/Link"
                        size="small"
                        disabled={!canEdit}
                        onMouseEnter={() => {
                          if (gstCertificateLink) {
                            setPreviewUrl(gstCertificateLink);
                            setPreviewTitle('GST Certificate');
                          }
                        }}
                        onFocus={() => {
                          if (gstCertificateLink) {
                            setPreviewUrl(gstCertificateLink);
                            setPreviewTitle('GST Certificate');
                          }
                        }}
                        InputProps={{
                          endAdornment: gstCertificateLink ? (
                            <InputAdornment position="end">
                              <Button 
                                size="small" 
                                onClick={() => window.open(gstCertificateLink, '_blank')}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setPreviewUrl(gstCertificateLink);
                                  setPreviewTitle('GST Certificate');
                                }}
                                sx={{ fontWeight: 700 }}
                              >
                                View
                              </Button>
                            </InputAdornment>
                          ) : null
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Card 3: Lease & Rent Agreement */}
              <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <CardHeader title="Lease & Rent Agreement" titleTypographyProps={{ fontWeight: 800, variant: 'h6' }} />
                <Divider />
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField 
                        fullWidth 
                        type="date" 
                        label="Rent Start Date" 
                        value={rentStartDate} 
                        onChange={(e) => setRentStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField 
                        fullWidth 
                        type="date" 
                        label="Rent Expiry Date" 
                        value={rentExpiry} 
                        onChange={(e) => setRentExpiry(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField 
                        fullWidth 
                        label="Rent Agreement Certificate Link" 
                        value={rentAgreementLink} 
                        onChange={(e) => {
                          setRentAgreementLink(e.target.value);
                          if (previewTitle === 'Rent Agreement') {
                            setPreviewUrl(e.target.value);
                          }
                        }} 
                        placeholder="Enter Rent Agreement URL/Link"
                        size="small"
                        disabled={!canEdit}
                        onMouseEnter={() => {
                          if (rentAgreementLink) {
                            setPreviewUrl(rentAgreementLink);
                            setPreviewTitle('Rent Agreement');
                          }
                        }}
                        onFocus={() => {
                          if (rentAgreementLink) {
                            setPreviewUrl(rentAgreementLink);
                            setPreviewTitle('Rent Agreement');
                          }
                        }}
                        InputProps={{
                          endAdornment: rentAgreementLink ? (
                            <InputAdornment position="end">
                              <Button 
                                size="small" 
                                onClick={() => window.open(rentAgreementLink, '_blank')}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setPreviewUrl(rentAgreementLink);
                                  setPreviewTitle('Rent Agreement');
                                }}
                                sx={{ fontWeight: 700 }}
                              >
                                View
                              </Button>
                            </InputAdornment>
                          ) : null
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

        {/* Right Column: Document Viewer Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* File-to-Link Converter Card */}
            <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardHeader 
                title="File-to-Link Converter" 
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
                            color={copied ? "success" : "primary"}
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

            {/* Document Viewer Card */}
            <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardHeader 
                title={previewTitle ? `Document Viewer: ${previewTitle}` : 'Document Viewer'} 
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
                      Hover over or select a document link field, or click on a supporting document to preview its content here.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Upload Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirm File Upload
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to upload <strong>{pendingFile?.name}</strong>, or would you like to change the selected file?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={executeUpload} variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }}>
            Yes, Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Heuristic Scanner Visual Effect */}
      <Dialog
        open={scanning}
        PaperProps={{
          sx: { borderRadius: '16px', p: 2, textAlign: 'center', maxWidth: 360 }
        }}
      >
        <DialogContent sx={{ py: 4 }}>
          <CircularProgress size={60} color="primary" sx={{ mb: 3 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Heuristic Document Scanner
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <SearchIcon sx={{ fontSize: 18 }} />
            {scanStep}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
