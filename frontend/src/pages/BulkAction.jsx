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
  Paper
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from '../utils/api';

const fieldsGuide = [
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
  const [tabValue, setTabValue] = useState(0); // 0 = Create, 1 = Modify
  const [brand, setBrand] = useState('');
  // Separate loading states so Download and Upload spinners are independent
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setErrors(null);
    setSuccessMsg('');
    setBrand('');
  };

  const currentAction = tabValue === 0 ? 'create' : 'modify';

  const handleDownload = async () => {
    if (!brand) {
      setErrors([{ message: 'Please select a brand before downloading.' }]);
      return;
    }
    
    setDownloadLoading(true);
    setErrors(null);
    setSuccessMsg('');
    
    try {
      const response = await axios.get('/api/stores/bulk/download', {
        params: { action: currentAction, brand },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const brandLabel = brand === 'ALL_BRANDS' ? 'all_brands' : brand.toLowerCase();
      link.setAttribute('download', `${currentAction}_stores_${brandLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      // When responseType is 'blob', error responses come back as blobs too.
      // Parse the blob to extract the real error message.
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
    if (!brand) {
      setErrors([{ message: 'Please select a brand before uploading.' }]);
      return;
    }
    if (brand === 'ALL_BRANDS') {
      setErrors([{ message: 'Please select a specific brand for uploading. "All Brands" is only available for download.' }]);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input
    e.target.value = null;

    setUploadLoading(true);
    setErrors(null);
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', currentAction);
    if (brand) {
      formData.append('brand', brand);
    }

    try {
      const response = await axios.post('/api/stores/bulk/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccessMsg(response.data.message || 'Stores successfully processed!');
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
    }
  };

  const isAllBrands = brand === 'ALL_BRANDS';

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', py: 2, px: 1 }}>
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
            <Tab label="Create store in bulk" sx={{ fontWeight: 700 }} />
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
              <TextField
                select
                fullWidth
                label="Select Brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                variant="outlined"
                helperText="Required"
              >
                {tabValue === 1 && (
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
                )}
                <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's Artisan Bakehouse</MenuItem>
                <MenuItem value="GOT_TEA">Got Tea</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: '10px', height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <FileDownloadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    1. Download {tabValue === 0 ? 'Template' : 'Existing Data'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {tabValue === 0
                      ? 'Download the CSV template with the correct headers required for store creation.'
                      : isAllBrands
                        ? 'Download a CSV file containing all stores across every brand.'
                        : 'Download a CSV file containing all existing stores for the selected brand.'}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={handleDownload}
                    disabled={downloadLoading || !brand}
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
                    disabled={uploadLoading || !brand || isAllBrands}
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

          {tabValue === 1 && (
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
    </Box>
  );
}
