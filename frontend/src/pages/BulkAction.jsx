import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  MenuItem,
  TextField,
  Alert,
  AlertTitle,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Portal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import FullScreenLoader from '../components/FullScreenLoader';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/api';

const fieldsGuide = [
  { field: 'brand', status: 'Editable' },
  { field: 'cafeName', status: 'Not Editable' },
  { field: 'cafeCode', status: 'Not Editable' },
  { field: 'cafeModule', status: 'Not Editable' },
  { field: 'cafeAddress', status: 'Editable' },
  { field: 'city', status: 'Editable' },
  { field: 'state', status: 'Editable' },
  { field: 'pinCode', status: 'Editable' },
  { field: 'zone', status: 'Not Editable' },
  { field: 'cafeLocationGoogleLink', status: 'Not Editable' },
  { field: 'latitude', status: 'Not Editable' },
  { field: 'latt', status: 'Not Editable' },
  { field: 'long', status: 'Not Editable' },
  { field: 'cafeOpenTiming', status: 'Editable' },
  { field: 'cafeClosingTime', status: 'Editable' },
  { field: 'actualClosingTime', status: 'Editable' },
  { field: 'gstNo', status: 'Not Editable' },
  { field: 'fssaiNo', status: 'Not Editable' },
  { field: 'cityHeadEmail', status: 'Editable' },
  { field: 'cityHeadPhone', status: 'Editable' },
  { field: 'platformType', status: 'Editable' },
  { field: 'tradingArea', status: 'Editable' },
  { field: 'launchStatus', status: 'Editable' },
  { field: 'launchDate', status: 'Editable' },
  { field: 'fssaiLicense', status: 'Not Editable' },
  { field: 'gstCertificateLink', status: 'Not Editable' },
  { field: 'cafePhoneNumber', status: 'Editable' },
  { field: 'cafeMailId', status: 'Editable' },
  { field: 'cafeManagerName', status: 'Editable' },
  { field: 'cafeManagerMailId', status: 'Editable' },
  { field: 'cafeManagerContactNo', status: 'Editable' },
  { field: 'areaManagerName', status: 'Editable' },
  { field: 'areaManagerEmail', status: 'Editable' },
  { field: 'areaManagerPhone', status: 'Editable' },
  { field: 'cityHeadName', status: 'Editable' },
  { field: 'blueTokaiSwiggyRID', status: 'Editable' },
  { field: 'blueTokaiZomatoRID', status: 'Editable' },
  { field: 'suchaliSwiggyRID', status: 'Editable' },
  { field: 'suchaliZomatoRID', status: 'Editable' },
  { field: 'gotTeaSwiggyRID', status: 'Editable' },
  { field: 'gotTeaZomatoRID', status: 'Editable' },
  { field: 'newPricingCategory', status: 'Editable' },
  { field: 'newPricingSubCategory', status: 'Editable' },
  { field: 'cluster', status: 'Editable' },
  { field: 'menu', status: 'Editable' },
  { field: 'cafeLaunchMonth', status: 'Editable' },
  { field: 'cafeOpeningHr', status: 'Editable' },
  { field: 'smokingZone', status: 'Editable' },
  { field: 'parkingOption', status: 'Editable' },
  { field: 'wheelchairAccessibility', status: 'Editable' }
];

export default function BulkAction() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tabValue, setTabValue] = useState(isSuperAdmin ? 0 : 1); // 0 = Create, 1 = Modify
  const [brand, setBrand] = useState('');
  
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const fileInputRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setErrors(null);
    setSuccessMsg('');
    setBrand('');
  };

  const currentAction = tabValue === 0 ? 'create' : 'modify';

  const handleDownload = async () => {
    if (currentAction === 'modify' && !brand) {
      setErrors([{ message: 'Please select a brand before downloading.' }]);
      return;
    }
    
    setDownloadLoading(true);
    setErrors(null);
    setSuccessMsg('');
    
    try {
      const targetBrand = currentAction === 'create' ? 'ALL_BRANDS' : brand;
      const response = await axios.get('/api/stores/bulk/download', {
        params: { action: currentAction, brand: targetBrand },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      let brandLabel = 'all_brands';
      if (currentAction === 'modify') {
        brandLabel = brand === 'ALL_BRANDS' ? 'all_brands' : brand.toLowerCase();
      }
      link.setAttribute('download', `${currentAction}_stores_${brandLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setErrors([{ message: json.error || json.message || 'Failed to download file.' }]);
        } else if (err.response?.data?.error) {
          setErrors([{ message: err.response.data.error }]);
        } else {
          setErrors([{ message: 'Failed to download file. Please try again later.' }]);
        }
      } catch {
        setErrors([{ message: 'Failed to download file. Please try again later.' }]);
      }
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (currentAction === 'modify' && !brand) {
      setErrors([{ message: 'Please select a brand before uploading.' }]);
      return;
    }
    if (currentAction === 'modify' && brand === 'ALL_BRANDS') {
      setErrors([{ message: 'Please select a specific brand for uploading. "All Brands" is only available for download.' }]);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    e.target.value = null; // Reset input
    setConfirmDialogOpen(true);
  };

  const processUpload = async () => {
    setConfirmDialogOpen(false);
    if (!selectedFile) return;

    setUploadLoading(true);
    setUploadProgress(0);
    setErrors(null);
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('action', currentAction);
    if (currentAction === 'modify' && brand) {
      formData.append('brand', brand);
    }

    try {
      const response = await axios.post('/api/stores/bulk/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      
      if (currentAction === 'create') {
        setSummaryData(response.data);
        setSummaryDialogOpen(true);
      } else {
        if (response.data.errors && response.data.errors.length > 0) {
          setErrors(response.data.errors);
        } else {
          setSuccessMsg(response.data.message || 'Stores successfully processed!');
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.error) {
         setErrors([{ message: err.response.data.error }]);
      } else if (err.response?.data?.message) {
         setErrors([{ message: err.response.data.message }]);
      } else {
        let details = '';
        if (err.response?.data) {
          if (typeof err.response.data === 'string') {
            if (err.response.data.includes('<pre>')) {
              const match = err.response.data.match(/<pre>([\s\S]*?)<\/pre>/);
              details = match ? match[1] : err.response.data.substring(0, 250);
            } else {
              details = err.response.data.substring(0, 250);
            }
          } else {
            details = JSON.stringify(err.response.data);
          }
        }
        const errMsg = err.message || 'An unexpected error occurred during upload.';
        setErrors([{ message: details ? `${errMsg} (${details})` : errMsg }]);
      }
    } finally {
      setUploadLoading(false);
      setSelectedFile(null);
    }
  };

  const downloadErrorReport = () => {
    if (!summaryData || !summaryData.errors || summaryData.errors.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Row,Error Message\n"
      + summaryData.errors.map(e => `"${e.message.replace(/"/g, '""')}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_create_error_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseSummary = () => {
    setSummaryDialogOpen(false);
    setSummaryData(null);
  };

  const isAllBrands = currentAction === 'modify' && brand === 'ALL_BRANDS';

  return (
    <Box sx={{ width: '100%', py: 2, px: { xs: 1, md: 2 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Bulk Actions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create or modify multiple stores at once using CSV files. Please follow the strict format provided in the downloaded templates.
        </Typography>
      </Box>

      <Card sx={{ bgcolor: 'background.paper', borderRadius: '12px' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="bulk action tabs">
            {isSuperAdmin && (
              <Tab label="Create store in bulk" sx={{ fontWeight: 700 }} />
            )}
            <Tab label="Modification in existing stores" sx={{ fontWeight: 700 }} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {successMsg && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>
              {successMsg}
            </Alert>
          )}

          {errors && errors.length > 0 && (
             <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
             <AlertTitle sx={{ fontWeight: 700 }}>Error</AlertTitle>
             <List dense sx={{ py: 0 }}>
               {errors.map((err, i) => (
                 <ListItem key={i} sx={{ py: 0 }}>
                   <ListItemText primary={err.message || err.error} />
                 </ListItem>
               ))}
             </List>
           </Alert>
          )}

          <Grid container spacing={3} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 6 }}>
              {currentAction === 'modify' && (
                <TextField
                  select
                  fullWidth
                  label="Select Brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  variant="outlined"
                  helperText="Required"
                >
                  <MenuItem value="ALL_BRANDS">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: 'primary.main', flexShrink: 0
                        }}
                      />
                      All Brands (Download Only)
                    </Box>
                  </MenuItem>
                  <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's Artisan Bakehouse</MenuItem>
                  <MenuItem value="GOT_TEA">Got Tea</MenuItem>
                </TextField>
              )}
            </Grid>
          </Grid>

          {currentAction === 'modify' && <Divider sx={{ my: 4 }} />}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: '10px', height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <FileDownloadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    1. Download {currentAction === 'create' ? 'Template' : 'Existing Data'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {currentAction === 'create'
                      ? 'Download the CSV template with the correct headers required for store creation.'
                      : isAllBrands
                        ? 'Download a CSV file containing all stores across every brand.'
                        : 'Download a CSV file containing all existing stores for the selected brand.'}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={handleDownload}
                    disabled={downloadLoading || (currentAction === 'modify' && !brand)}
                    startIcon={downloadLoading ? <CircularProgress size={18} color="inherit" /> : <FileDownloadIcon />}
                  >
                    {downloadLoading ? 'Downloading...' : 'Download CSV'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: '10px', height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <FileUploadIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    2. Upload File
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Upload your filled or modified CSV file. Do not change the headers or column order.
                  </Typography>
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange}
                  />
                  <Button 
                    variant="contained" 
                    color="success"
                    fullWidth 
                    onClick={handleUploadClick}
                    disabled={uploadLoading || (currentAction === 'modify' && (!brand || isAllBrands))}
                    startIcon={uploadLoading ? <CircularProgress size={18} color="inherit" /> : <FileUploadIcon />}
                    title={isAllBrands ? '"All Brands" is not available for upload. Please select a specific brand.' : ''}
                  >
                    {uploadLoading ? 'Uploading...' : 'Upload CSV'}
                  </Button>
                  {isAllBrands && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Select a specific brand to enable upload
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {currentAction === 'modify' && (
            <Box sx={{ mt: 4 }}>
              <Accordion variant="outlined" sx={{ borderRadius: '8px', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                  <Typography sx={{ fontWeight: 600 }}>View Editable vs Non-Editable Fields Guide</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Field Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fieldsGuide.map((row) => (
                          <TableRow key={row.field}>
                            <TableCell>{row.field}</TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: row.status === 'Editable' ? 'success.main' : 'error.main'
                                }}
                              >
                                {row.status}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

        </CardContent>
      </Card>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Upload</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to upload this file?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            No
          </Button>
          <Button onClick={processUpload} variant="contained" color="primary" autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={summaryDialogOpen} onClose={handleCloseSummary} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Summary</DialogTitle>
        <DialogContent>
          {summaryData && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Total Records Uploaded:</strong> {summaryData.totalCount}
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ color: 'success.main' }}>
                <strong>Successfully Created Stores:</strong> {summaryData.successCount}
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ color: summaryData.failedCount > 0 ? 'error.main' : 'text.primary' }}>
                <strong>Failed Records:</strong> {summaryData.failedCount}
              </Typography>

              {summaryData.failedCount > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Some records failed validation. You can download the error report to see the reasons.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {summaryData && summaryData.failedCount > 0 && (
            <Button onClick={downloadErrorReport} color="error" variant="outlined" startIcon={<FileDownloadIcon />}>
              Download Error Report
            </Button>
          )}
          <Button onClick={handleCloseSummary} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Portal>
        {uploadLoading && <FullScreenLoader messages={[
          'Warming up the espresso machine…',
          'Grinding the freshest beans…',
          'Processing bulk action…',
          'Applying updates…',
          'Almost ready to serve ☕',
        ]} blocking={true} />}
      </Portal>
    </Box>
  );
}
