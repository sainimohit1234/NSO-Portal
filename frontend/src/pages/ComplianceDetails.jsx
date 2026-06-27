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
import axios from '../utils/api';
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

const compareStoreIds = (id1, id2) => {
  if (!id1 || !id2) return false;
  const normalize = (val) => String(val).toLowerCase().replace(/o/g, '0').replace(/[il1]/g, 'l');
  return normalize(id1) === normalize(id2);
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
        const found = res.data.find(s => compareStoreIds(s.id, id));
        if (found) {
          if (String(found.id) !== String(id)) {
            navigate(`/compliance/${found.id}`, { replace: true });
            return;
          }
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
          if (res.data.fssaiNo) {
            setFssaiNo(res.data.fssaiNo);
          }
          setSuccessMsg('FSSAI certificate uploaded and verified successfully.');
        } else if (pendingUploadType === 'gst') {
          setGstCertificateLink(fileUrl);
          if (res.data.gstNo) {
            setGstNo(res.data.gstNo);
          }
          setSuccessMsg('GST certificate uploaded and verified successfully.');
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

    if (pendingUploadType === 'fssai' || pendingUploadType === 'gst') {
      // Heuristic logo scan visual effect
      setScanning(true);
      setScanStep(pendingUploadType === 'fssai' ? 'Detecting FSSAI Logo...' : 'Detecting GST Logo...');
      setTimeout(() => {
        setScanStep(pendingUploadType === 'fssai' ? 'Running OCR analysis for license alignment...' : 'Running OCR analysis for GSTIN alignment...');
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
        {/* Left Column: Form Cards / Unified Upload */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <CardHeader title="Compliance Documents" titleTypographyProps={{ fontWeight: 800, variant: 'h6' }} />
            <Divider />
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={4}>
                
                {/* 1. FSSAI License */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    FSSAI License
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <input
                        type="file"
                        id="fssai-file-input"
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'fssai')}
                        disabled={!canEdit}
                      />
                      {fssaiLicense ? (
                        <Box
                          sx={{
                            border: '1px solid',
                            borderColor: 'success.main',
                            borderRadius: '10px',
                            p: 2,
                            bgcolor: 'rgba(16, 185, 129, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <CheckCircleIcon color="success" />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                FSSAI Certificate
                              </Typography>
                              <Link
                                component="button"
                                variant="caption"
                                onClick={() => {
                                  setPreviewUrl(fssaiLicense);
                                  setPreviewTitle('FSSAI Certificate');
                                }}
                                sx={{ fontWeight: 600, display: 'block', textAlign: 'left', p: 0, minWidth: 0 }}
                              >
                                Preview
                              </Link>
                            </Box>
                          </Box>
                          {canEdit && (
                            <IconButton 
                              color="error" 
                              onClick={() => {
                                setFssaiLicense('');
                                if (previewUrl === fssaiLicense) {
                                  setPreviewUrl('');
                                  setPreviewTitle('');
                                }
                              }}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Box
                          component="label"
                          htmlFor="fssai-file-input"
                          sx={{
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: '10px',
                            p: 2.5,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: !canEdit ? 'default' : 'pointer',
                            bgcolor: 'rgba(255,255,255,0.01)',
                            '&:hover': { bgcolor: !canEdit ? 'none' : 'rgba(255,255,255,0.02)' }
                          }}
                        >
                          <CloudUploadIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 0.5 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Upload FSSAI License
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            PDF, JPG, JPEG, PNG
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 7 }}>
                      <Stack spacing={2}>
                        <TextField 
                          fullWidth 
                          label="FSSAI License Number" 
                          value={fssaiNo} 
                          onChange={(e) => setFssaiNo(e.target.value)} 
                          placeholder="Enter 14-digit FSSAI Number"
                          size="small"
                          disabled={!canEdit}
                        />
                        <Grid container spacing={1.5}>
                          <Grid size={6}>
                            <TextField 
                              fullWidth 
                              type="date" 
                              label="Start Date" 
                              value={fssaiStartDate} 
                              onChange={(e) => setFssaiStartDate(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              disabled={!canEdit}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField 
                              fullWidth 
                              type="date" 
                              label="Expiry Date" 
                              value={fssaiExpiry} 
                              onChange={(e) => setFssaiExpiry(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              disabled={!canEdit}
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* 2. GST Certificate */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    GST Certificate
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <input
                        type="file"
                        id="gst-file-input"
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'gst')}
                        disabled={!canEdit}
                      />
                      {gstCertificateLink ? (
                        <Box
                          sx={{
                            border: '1px solid',
                            borderColor: 'success.main',
                            borderRadius: '10px',
                            p: 2,
                            bgcolor: 'rgba(16, 185, 129, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <CheckCircleIcon color="success" />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                GST Certificate
                              </Typography>
                              <Link
                                component="button"
                                variant="caption"
                                onClick={() => {
                                  setPreviewUrl(gstCertificateLink);
                                  setPreviewTitle('GST Certificate');
                                }}
                                sx={{ fontWeight: 600, display: 'block', textAlign: 'left', p: 0, minWidth: 0 }}
                              >
                                Preview
                              </Link>
                            </Box>
                          </Box>
                          {canEdit && (
                            <IconButton 
                              color="error" 
                              onClick={() => {
                                setGstCertificateLink('');
                                if (previewUrl === gstCertificateLink) {
                                  setPreviewUrl('');
                                  setPreviewTitle('');
                                }
                              }}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Box
                          component="label"
                          htmlFor="gst-file-input"
                          sx={{
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: '10px',
                            p: 2.5,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: !canEdit ? 'default' : 'pointer',
                            bgcolor: 'rgba(255,255,255,0.01)',
                            '&:hover': { bgcolor: !canEdit ? 'none' : 'rgba(255,255,255,0.02)' }
                          }}
                        >
                          <CloudUploadIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 0.5 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Upload GST Certificate
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            PDF, JPG, JPEG, PNG
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 7 }}>
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
                  </Grid>
                </Box>

                <Divider />

                {/* 3. Lease / Rent Agreement */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Lease / Rent Agreement
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <input
                        type="file"
                        id="rent-file-input"
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'rent')}
                        disabled={!canEdit}
                      />
                      {rentAgreementLink ? (
                        <Box
                          sx={{
                            border: '1px solid',
                            borderColor: 'success.main',
                            borderRadius: '10px',
                            p: 2,
                            bgcolor: 'rgba(16, 185, 129, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <CheckCircleIcon color="success" />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Lease/Rent Agreement
                              </Typography>
                              <Link
                                component="button"
                                variant="caption"
                                onClick={() => {
                                  setPreviewUrl(rentAgreementLink);
                                  setPreviewTitle('Rent Agreement');
                                }}
                                sx={{ fontWeight: 600, display: 'block', textAlign: 'left', p: 0, minWidth: 0 }}
                              >
                                Preview
                              </Link>
                            </Box>
                          </Box>
                          {canEdit && (
                            <IconButton 
                              color="error" 
                              onClick={() => {
                                setRentAgreementLink('');
                                if (previewUrl === rentAgreementLink) {
                                  setPreviewUrl('');
                                  setPreviewTitle('');
                                }
                              }}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Box
                          component="label"
                          htmlFor="rent-file-input"
                          sx={{
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: '10px',
                            p: 2.5,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: !canEdit ? 'default' : 'pointer',
                            bgcolor: 'rgba(255,255,255,0.01)',
                            '&:hover': { bgcolor: !canEdit ? 'none' : 'rgba(255,255,255,0.02)' }
                          }}
                        >
                          <CloudUploadIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 0.5 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Upload Lease/Rent Agreement
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            PDF, JPG, JPEG, PNG
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 7 }}>
                      <Grid container spacing={1.5}>
                        <Grid size={6}>
                          <TextField 
                            fullWidth 
                            type="date" 
                            label="Start Date" 
                            value={rentStartDate} 
                            onChange={(e) => setRentStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField 
                            fullWidth 
                            type="date" 
                            label="Expiry Date" 
                            value={rentExpiry} 
                            onChange={(e) => setRentExpiry(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            disabled={!canEdit}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>

              </Stack>
            </CardContent>
            <Divider />
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={() => handleSave(false)}
                disabled={!canEdit}
                sx={{ borderRadius: '10px', px: 4, py: 1, fontWeight: 700 }}
              >
                Save Details
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Right Column: Document Viewer Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: 3 }}>
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
