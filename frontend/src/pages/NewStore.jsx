import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, Typography, TextField, Button, Grid, Card, CardContent, 
  MenuItem, Alert, CircularProgress, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, InputAdornment, Snackbar, Autocomplete
} from '@mui/material';
import axios from 'axios';
import { CAFE_MODELS, MENU_OPTIONS, INDIAN_STATES, INDIAN_CITIES, STATE_CITIES_MAP, MONTH_NAMES, LAUNCH_YEARS } from '../constants/storeOptions';
import { useAuth } from '../context/AuthContext';

const ZONES = ['North', 'South', 'East', 'West'];
const PLATFORM_TYPES = ['Delivery', 'Not Delivery'];
const TRADING_AREAS = [
  'Residential Area', 'Malls', 'Office Zones', 'Event', 'Institutional',
  'Closed', 'Airport - Inside Security', 'Universities',
  'Transit - Metro/Bus Stations', 'Highways', 'B2B'
];

const RequiredBadge = () => (
  <Chip label="Required" size="small" sx={{
    ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700,
    bgcolor: 'rgba(248, 113, 113, 0.12)', color: '#f87171',
    border: '1px solid rgba(248, 113, 113, 0.25)', borderRadius: '4px'
  }} />
);

const OptionalBadge = () => (
  <Chip label="Optional" size="small" sx={{
    ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700,
    bgcolor: 'rgba(52, 211, 153, 0.1)', color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '4px'
  }} />
);

const FIELD_LABELS = {
  cafeName: 'Café Name',
  cafeCode: 'Café Code',
  cafeModel: 'Café Model',
  cafeAddress: 'Café Address',
  city: 'City',
  state: 'State',
  pinCode: 'Pin Code',
  zone: 'Zone',
  cafeLocationGoogleLink: 'Google Maps Link',
  latitude: 'Latitude',
  latt: 'Latt',
  long: 'Longitude',
  cafeOpenTiming: 'Café Opening Time',
  cafeClosingTime: 'Café Closing Time',
  actualClosingTime: 'Actual Closing Time',
  cityHeadId: 'Select City Head',
  cityHeadEmail: 'City Head Mail ID',
  cityHeadPhone: 'City Head Contact No.',
  areaManagerEmail: 'Area Manager Mail ID',
  areaManagerPhone: 'Area Manager Contact No.',
  cafeManagerMailId: 'Cafe Manager Mail ID',
  cafeManagerContactNo: 'Cafe Manager Contact No.',
  platformType: 'Platform Type',
  tradingArea: 'Trading Area',
  launchStatus: 'Launch Status'
};

const NewStore = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canEditContacts = isSuperAdmin || user?.permissions?.includes('EDIT_CONTACTS');

  const { register, handleSubmit, setValue, watch, formState, reset, formState: { errors } } = useForm({
    defaultValues: {
      brand: '',
      cafeName: '',
      cafeCode: '',
      cafeModel: '',
      menu: '',
      cafeAddress: '',
      city: '',
      state: '',
      pinCode: '',
      zone: 'North',
      cafeLocationGoogleLink: '',
      latitude: '',
      latt: '',
      long: '',
      cafeOpenTiming: '',
      cafeClosingTime: '',
      actualClosingTime: '',
      gstNo: '',
      gstCertificateLink: '',
      fssaiLicense: '',
      fssaiNo: '',
      cafePhoneNumber: '',
      cafeMailId: '',
      cafeManagerMailId: '',
      cafeManagerContactNo: '',
      areaManagerEmail: '',
      areaManagerPhone: '',
      cityHeadEmail: '',
      cityHeadPhone: '',
      blueTokaiSwiggyRID: '',
      blueTokaiZomatoRID: '',
      suchaliSwiggyRID: '',
      suchaliZomatoRID: '',
      gotTeaSwiggyRID: '',
      gotTeaZomatoRID: '',
      newPricingCategory: '',
      newPricingSubCategory: '',
      cluster: '',
      cafeLaunchMonth: '',
      cafeLaunchYear: '',
      cafeOpeningHr: '',
      platformType: '',
      tradingArea: '',
      launchStatus: 'Upcoming Store',
      launchDate: '',
      smokingZone: '',
      parkingOption: '',
      wheelchairAccessibility: '',
      mailStatus: 'Pending for S/Z',
      areaManagerId: null,
      cityHeadId: null,
      cafeManagerId: null,
      cafeManagerName: '',
      areaManagerName: '',
      cityHeadName: '',
      petFriendly: '',
      projectStartDate: '',
      projectHandoverDate: '',
      tentativeDryLaunchDate: '',
      highlights: '',
      expectedSalesVal: '',
      expectedSalesUnit: 'Lakhs',
      nearbyCafes: ''
    }
  });

  const selectedBrand = watch('brand');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const isSavedRef = useRef(false);
  const navigate = useNavigate();

  // Track if form has unsaved changes
  const hasDirtyFields = Object.keys(formState.dirtyFields).length > 0;
  const isDirty = hasDirtyFields && !isSavedRef.current;

  // Watch latitude to auto-fill latt and long
  const latitudeValue = watch('latitude');

  useEffect(() => {
    axios.get('/api/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to load users:', err));
    // Load contacts for auto-fill suggestions
    axios.get('/api/contacts')
      .then(res => setContacts(res.data))
      .catch(err => console.error('Failed to load contacts:', err));
  }, []);

  // Auto-fill Latt and Long from Latitude (split by comma)
  // e.g. latitude = "71128843,77.03373582284817" → latt = 71128843, long = 77.03373582284817
  useEffect(() => {
    if (latitudeValue && String(latitudeValue).includes(',')) {
      const str = String(latitudeValue);
      const commaIndex = str.indexOf(',');
      const firstPart = str.substring(0, commaIndex).trim();
      const secondPart = str.substring(commaIndex + 1).trim();
      if (firstPart) setValue('latt', firstPart, { shouldValidate: true });
      if (secondPart) setValue('long', secondPart, { shouldValidate: true });
    } else {
      setValue('latt', '', { shouldValidate: true });
      setValue('long', '', { shouldValidate: true });
    }
  }, [latitudeValue, setValue]);

  // PIN Code Auto-Population
  const pinCodeValue = watch('pinCode');

  useEffect(() => {
    if (pinCodeValue && String(pinCodeValue).trim().length === 6) {
      const pin = String(pinCodeValue).trim();
      axios.get(`/api/stores/pincode/${pin}`)
        .then(res => {
          if (res.data && res.data[0] && res.data[0].Status === 'Success') {
            const postOfficeList = res.data[0].PostOffice;
            if (postOfficeList && postOfficeList.length > 0) {
              const district = postOfficeList[0].District;
              const stateName = postOfficeList[0].State;
              setValue('city', district, { shouldValidate: true });
              setValue('state', stateName, { shouldValidate: true });
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch city/state for pin code', err);
        });
    } else if (!pinCodeValue) {
      setValue('city', '', { shouldValidate: true });
      setValue('state', '', { shouldValidate: true });
    }
  }, [pinCodeValue, setValue]);

  // Warn user about unsaved changes on browser back / refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasDirtyFields && !isSavedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDirtyFields]);

  // Block in-app navigation when form is dirty
  const blocker = useBlocker(
    useCallback(() => {
      if (isSavedRef.current) return false;
      return hasDirtyFields;
    }, [hasDirtyFields])
  );

  // Unique contacts by designation
  const areaManagers = contacts.filter(c => c.designation === 'Area Manager');
  const cityHeads = contacts.filter(c => c.designation === 'City Head');
  const cafeManagers = contacts.filter(c => c.designation === 'Café Manager');

  const handleAreaManagerSelect = (event, newValue) => {
    const id = newValue ? newValue.id : '';
    setValue('areaManagerId', id, { shouldValidate: true });
    setValue('areaManagerName', newValue?.name || '');
    setValue('areaManagerEmail', newValue?.email || '');
    setValue('areaManagerPhone', newValue?.phone || '');
  };

  const handleCityHeadSelect = (event, newValue) => {
    const id = newValue ? newValue.id : '';
    setValue('cityHeadId', id, { shouldValidate: true });
    setValue('cityHeadName', newValue?.name || '');
    setValue('cityHeadEmail', newValue?.email || '');
    setValue('cityHeadPhone', newValue?.phone || '');
  };

  const handleCafeManagerSelect = (event, newValue) => {
    const id = newValue ? newValue.id : '';
    setValue('cafeManagerId', id, { shouldValidate: true });
    setValue('cafeManagerName', newValue?.name || '');
    setValue('cafeManagerMailId', newValue?.email || '');
    setValue('cafeManagerContactNo', newValue?.phone || '');
  };

  const checkIsComplete = (data) => {
    const mandatoryFields = [
      'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress', 'zone', 
      'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'cafeOpenTiming', 'cafeClosingTime', 
      'actualClosingTime'
    ];
    return mandatoryFields.every(field => {
      const val = data[field];
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  };

  const watchedFields = watch();
  const isCompleteForSubmit = [
    'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress', 'zone', 
    'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'cafeOpenTiming', 'cafeClosingTime', 
    'actualClosingTime'
  ].every(field => {
    const val = watchedFields[field];
    return val !== null && val !== undefined && String(val).trim() !== '';
  });

  const getConfirmMessage = () => {
    if (!pendingSubmitData) return '';
    const isComplete = checkIsComplete(pendingSubmitData);
    if (isComplete) {
      return 'All mandatory fields are completed. This store will be submitted for NSO Approval (Approval Pending). Do you want to proceed?';
    } else {
      return 'Some mandatory fields are missing. The store will be saved in the All Upcoming Stores list with status "Incomplete Information". Do you want to proceed?';
    }
  };

  const onSubmit = (data) => {
    setPendingSubmitData(data);
    setConfirmOpen(true);
  };

  const handleCancelSubmit = () => {
    setConfirmOpen(false);
    setPendingSubmitData(null);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    if (!pendingSubmitData) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const isComplete = checkIsComplete(pendingSubmitData);
      
      let finalCafeCode = pendingSubmitData.cafeCode;
      if (!finalCafeCode || String(finalCafeCode).trim() === '') {
        finalCafeCode = `TEMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      }

      let finalCafeName = pendingSubmitData.cafeName;
      if (!finalCafeName || String(finalCafeName).trim() === '') {
        finalCafeName = 'Untitled Store';
      }

      const payload = {
        ...pendingSubmitData,
        cafeCode: finalCafeCode,
        cafeName: finalCafeName,
        status: isComplete ? 'PENDING_APPROVAL' : 'INCOMPLETE_INFORMATION',
        // Combine month + year into single "Month Year" string
        cafeLaunchMonth: pendingSubmitData.cafeLaunchMonth && pendingSubmitData.cafeLaunchYear
          ? `${pendingSubmitData.cafeLaunchMonth} ${pendingSubmitData.cafeLaunchYear}`
          : pendingSubmitData.cafeLaunchMonth || '',
        launchStatus: 'Upcoming Store',
        latitude: pendingSubmitData.latitude ? parseFloat(pendingSubmitData.latitude) : null,
        latt: pendingSubmitData.latt ? parseFloat(pendingSubmitData.latt) : null,
        long: pendingSubmitData.long ? parseFloat(pendingSubmitData.long) : null,
        lat: pendingSubmitData.latitude ? parseFloat(pendingSubmitData.latitude) : null,
        lng: pendingSubmitData.long ? parseFloat(pendingSubmitData.long) : null,
        areaManagerId: pendingSubmitData.areaManagerId ? parseInt(pendingSubmitData.areaManagerId, 10) : null,
        cityHeadId: pendingSubmitData.cityHeadId ? parseInt(pendingSubmitData.cityHeadId, 10) : null,
        cafeManagerId: pendingSubmitData.cafeManagerId ? parseInt(pendingSubmitData.cafeManagerId, 10) : null,
        expectedSales: pendingSubmitData.expectedSalesVal
          ? `₹${pendingSubmitData.expectedSalesVal} ${pendingSubmitData.expectedSalesUnit || 'Lakhs'}`
          : null,
      };
      delete payload.cafeLaunchYear;
      delete payload.expectedSalesVal;
      delete payload.expectedSalesUnit;
      await axios.post('/api/stores', payload);
      reset();
      setSnackbarMessage(
        isComplete 
          ? 'The new store has been submitted for NSO Approval and the email notification has been sent.'
          : 'The new store was saved as Incomplete Information and the email notification has been sent.'
      );
      setOpenSnackbar(true);
      setPendingSubmitData(null);
    } catch (err) {
      console.error(err);
      const backendError = err.response?.data?.error || err.response?.data?.message || 'Failed to create store. Please check required fields and try again.';
      setErrorMsg(backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', py: 2, px: 1 }}>
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: '12px', '& .MuiAlert-message': { fontWeight: 700 } }}>
          Validation Error: Please complete the following mandatory fields before submitting: 
          {' '}{Object.keys(errors).map(k => FIELD_LABELS[k] || k).join(', ')}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Sticky Header & Remarks Section */}
        <Box sx={{
          position: 'sticky',
          top: { xs: 56, sm: 64 },
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          mt: -5,
          pt: 5,
          pb: 2,
          mb: 4,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          {/* ─── Title Row ─── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                  New Store Creation
                </Typography>

                {/* Live info strip */}
                {(() => {
                  const items = [
                    watch('cafeName'),
                    watch('cafeCode'),
                    watch('city'),
                    watch('state')
                  ].filter(Boolean);

                  if (items.length === 0) return null;

                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      {items.map((val, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center' }}>
                          {idx > 0 && (
                            <Typography sx={{
                              color: 'text.secondary',
                              fontWeight: 600,
                              fontSize: '1.25rem',
                              lineHeight: 1,
                              mx: '6px',
                            }}>
                              |
                            </Typography>
                          )}
                          <Typography sx={{
                            fontWeight: 700,
                            fontSize: '1.25rem',
                            color: 'primary.dark',
                            letterSpacing: '0.01em',
                            lineHeight: 1.2,
                          }}>
                            {val}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
              </Box>

              <Typography variant="body2" color="text.secondary">
                Register a new cafe with full operational details. Fields marked required must be filled before submission.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField size="small" label="Status *" disabled value="Upcoming Store" sx={{ minWidth: 160 }} />
              <TextField
                select
                size="small"
                label="Brand"
                {...register('brand')}
                error={!!errors.brand}
                helperText={errors.brand?.message}
                sx={{ minWidth: 280 }}
              >
                <MenuItem value="">— Clear Selection —</MenuItem>
                <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's Artisan Bakehouse</MenuItem>
                <MenuItem value="GOT_TEA">Got Tea</MenuItem>
              </TextField>
              <Button variant="outlined" onClick={() => navigate(-1)} sx={{ px: 3, borderRadius: '8px' }}>
                Cancel
              </Button>
            </Box>
          </Box>

          {/* ─── CARD: Remarks (Sticky) ─── */}
          {selectedBrand && (
            <Card sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', mb: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Remarks / Special Instructions
                  </Typography>
                  <OptionalBadge />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={3}
                  label="Remarks"
                  placeholder="Enter any operational remarks, constraints, or special instructions according to the requirement..."
                  {...register('remarks')}
                />
              </CardContent>
            </Card>
          )}
        </Box>

        {errorMsg && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4, 
              borderRadius: '12px',
              '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
            }}
          >
            {errorMsg}
          </Alert>
        )}

        {selectedBrand ? (
          <Grid container spacing={4}>
          {/* ─── CARD 1: Café Basic Details (All Required) ─── */}
          <Grid size={12}>
            <Card sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Café Basic Details
                  </Typography>
                  <RequiredBadge />
                </Box>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth label="Café Name **" {...register('cafeName')} error={!!errors.cafeName} helperText={errors.cafeName?.message} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      label="Café Code **"
                      {...register('cafeCode', { 
                        validate: async (value) => {
                          if (!value) return true;
                          try {
                            const res = await axios.get('/api/stores');
                            const exists = res.data.some(s => s.cafeCode && s.cafeCode.toLowerCase() === value.toLowerCase());
                            return !exists || "This Cafe Code already exists in the system. Please enter a unique Cafe Code.";
                          } catch (err) {
                            console.error(err);
                            return true;
                          }
                        }
                      })}
                      error={!!errors.cafeCode}
                      helperText={errors.cafeCode?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField fullWidth label="Pin Code **" {...register('pinCode')} error={!!errors.pinCode} helperText={errors.pinCode?.message} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="City **" 
                      {...register('city')} 
                      error={!!errors.city} 
                      helperText={errors.city?.message}
                      value={watch('city') || ''}
                      InputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: !!watch('city') }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="State **" 
                      {...register('state')} 
                      error={!!errors.state} 
                      helperText={errors.state?.message}
                      value={watch('state') || ''}
                      InputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: !!watch('state') }}
                    />
                  </Grid>
                  
                  <Grid size={12}>
                    <TextField fullWidth label="Café Address **" {...register('cafeAddress')} error={!!errors.cafeAddress} helperText={errors.cafeAddress?.message} />
                  </Grid>
                  
                  {/* Row 3: Zone | Café Location | Lat,Long | Latitude | Longitude */}
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField fullWidth select label="Zone **" {...register('zone')} error={!!errors.zone} value={watch('zone') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      {ZONES.map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth label="Café Location Google Link **" placeholder="https://maps.google.com/..." {...register('cafeLocationGoogleLink')} error={!!errors.cafeLocationGoogleLink} helperText={errors.cafeLocationGoogleLink?.message} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Lat, Long **"
                      placeholder="e.g. 28.6139, 77.2090"
                      {...register('latitude')}
                      error={!!errors.latitude}
                      helperText={errors.latitude?.message || "Latitude, Longitude"}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Latitude **"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ readOnly: true }}
                      {...register('latt')}
                      error={!!errors.latt}
                      helperText={errors.latt?.message || "Auto-filled"}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      label="Longitude **"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ readOnly: true }}
                      {...register('long')}
                      error={!!errors.long}
                      helperText={errors.long?.message || "Auto-filled"}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
 
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField 
                      fullWidth 
                      type="time" 
                      label="Café Opening Time **" 
                      InputLabelProps={{ shrink: true }}
                      {...register('cafeOpenTiming')} 
                      error={!!errors.cafeOpenTiming} 
                      helperText={errors.cafeOpenTiming?.message} 
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField 
                      fullWidth 
                      type="time" 
                      label="Café Closing Time **" 
                      InputLabelProps={{ shrink: true }}
                      {...register('cafeClosingTime')} 
                      error={!!errors.cafeClosingTime} 
                      helperText={errors.cafeClosingTime?.message} 
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField 
                      fullWidth 
                      type="time" 
                      label="Actual Closing Time **" 
                      InputLabelProps={{ shrink: true }}
                      {...register('actualClosingTime')} 
                      error={!!errors.actualClosingTime} 
                      helperText={errors.actualClosingTime?.message} 
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ─── CARD 2: Contact Details ─── */}
          <Grid size={12}>
            <Card sx={{ bgcolor: 'background.paper', opacity: canEditContacts ? 1 : 0.8 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Contact Details
                  </Typography>
                  {!canEditContacts && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  <OptionalBadge />
                </Box>

                {/* Row 1: Café Contact & Café Manager Details */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="Café Phone Number" 
                      {...register('cafePhoneNumber', {
                        pattern: {
                          value: /^\d{10}$/,
                          message: 'invalid contact number'
                        }
                      })} 
                      error={!!errors.cafePhoneNumber}
                      helperText={errors.cafePhoneNumber?.message}
                      disabled={!canEditContacts}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="Café Mail ID" 
                      type="email" 
                      {...register('cafeMailId', {
                        validate: value => {
                          if (!value) return true;
                          const valLower = value.toLowerCase();
                          return valLower.endsWith('@bluetokaicoffee.com') || valLower.endsWith('@gottea.in') || 'Only @bluetokaicoffee.com or @gottea.in emails are allowed';
                        }
                      })} 
                      error={!!errors.cafeMailId}
                      helperText={errors.cafeMailId?.message}
                      disabled={!canEditContacts}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="CM Mail ID" 
                      type="email" 
                      {...register('cmMailId', {
                        validate: value => {
                          if (!value) return true;
                          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email address';
                        }
                      })} 
                      error={!!errors.cmMailId}
                      helperText={errors.cmMailId?.message}
                      disabled={!canEditContacts}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Autocomplete
                      fullWidth
                      options={cafeManagers}
                      getOptionLabel={(option) => option.name || ''}
                      value={cafeManagers.find(c => String(c.id) === String(watch('cafeManagerId'))) || null}
                      onChange={handleCafeManagerSelect}
                      disabled={!canEditContacts}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Café Manager" />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="Café Manager Mail ID" 
                      type="email" 
                      {...register('cafeManagerMailId')} 
                      InputLabelProps={{ shrink: true }} 
                      InputProps={{ readOnly: true }}
                      error={!!errors.cafeManagerMailId}
                      helperText={errors.cafeManagerMailId?.message || "Auto-filled"}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="Café Manager Contact No." 
                      {...register('cafeManagerContactNo')} 
                      InputLabelProps={{ shrink: true }} 
                      InputProps={{ readOnly: true }}
                      error={!!errors.cafeManagerContactNo}
                      helperText={errors.cafeManagerContactNo?.message || "Auto-filled"}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                </Grid>
 
                <Divider sx={{ my: 3 }} />
 
                {/* Row 2: Area Manager & City Head Details */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Autocomplete
                      fullWidth
                      options={areaManagers}
                      getOptionLabel={(option) => option.name || ''}
                      value={areaManagers.find(c => String(c.id) === String(watch('areaManagerId'))) || null}
                      onChange={handleAreaManagerSelect}
                      disabled={!canEditContacts}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Area Manager" />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="Area Manager Mail ID" 
                      type="email" 
                      {...register('areaManagerEmail')} 
                      InputLabelProps={{ shrink: true }} 
                      InputProps={{ readOnly: true }}
                      error={!!errors.areaManagerEmail}
                      helperText={errors.areaManagerEmail?.message || "Auto-filled"}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="Area Manager Contact No." 
                      {...register('areaManagerPhone')} 
                      InputLabelProps={{ shrink: true }} 
                      InputProps={{ readOnly: true }}
                      error={!!errors.areaManagerPhone}
                      helperText={errors.areaManagerPhone?.message || "Auto-filled"}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Autocomplete
                      fullWidth
                      options={cityHeads}
                      getOptionLabel={(option) => option.name || ''}
                      value={cityHeads.find(c => String(c.id) === String(watch('cityHeadId'))) || null}
                      onChange={handleCityHeadSelect}
                      disabled={!canEditContacts}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Select City Head" 
                          error={!!errors.cityHeadId}
                          helperText={errors.cityHeadId?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="City Head Mail ID" 
                      type="email" 
                      {...register('cityHeadEmail')} 
                      InputLabelProps={{ shrink: true }} 
                      InputProps={{ readOnly: true }}
                      error={!!errors.cityHeadEmail} 
                      helperText={errors.cityHeadEmail?.message || "Auto-filled"} 
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField 
                      fullWidth 
                      label="City Head Contact No." 
                      {...register('cityHeadPhone')} 
                      InputLabelProps={{ shrink: true }} 
                      InputProps={{ readOnly: true }}
                      error={!!errors.cityHeadPhone} 
                      helperText={errors.cityHeadPhone?.message || "Auto-filled"} 
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                  </Grid>
                </Grid>


                {/* Hidden inputs for names and relation IDs */}
                <input type="hidden" {...register('areaManagerId')} />
                <input type="hidden" {...register('cityHeadId')} />
                <input type="hidden" {...register('cafeManagerId')} />
                <input type="hidden" {...register('cafeManagerName')} />
                <input type="hidden" {...register('areaManagerName')} />
                <input type="hidden" {...register('cityHeadName')} />
                <input type="hidden" {...register('mailStatus')} />
              </CardContent>
            </Card>
          </Grid>

          {/* ─── CARD: GST & FSSAI Details ─── */}
          <Grid size={12}>
            <Card sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    GST & FSSAI Details
                  </Typography>
                  <OptionalBadge />
                </Box>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField 
                      fullWidth 
                      label="GST No" 
                      {...register('gstNo')} 
                      error={!!errors.gstNo} 
                      helperText={errors.gstNo?.message} 
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField 
                      fullWidth 
                      label="GST Certificate Link" 
                      placeholder="e.g. http://..." 
                      {...register('gstCertificateLink')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField 
                      fullWidth 
                      label="FSSAI License (Certificate Link)" 
                      placeholder="e.g. http://..." 
                      {...register('fssaiLicense')} 
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField 
                      fullWidth 
                      label="FSSAI No" 
                      {...register('fssaiNo')} 
                      error={!!errors.fssaiNo} 
                      helperText={errors.fssaiNo?.message} 
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ─── CARD 4: Others (Mixed Required/Optional) ─── */}
          <Grid size={12}>
            <Card sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Others & Operations
                  </Typography>
                  <OptionalBadge />
                </Box>

                <Grid container spacing={2.5} columns={60}>
                  {/* --- ROW 1 (5 fields, size 12 each) --- */}
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth type="date" label="Project Start Date" InputLabelProps={{ shrink: true }} {...register('projectStartDate')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth type="date" label="Project Handover Date" InputLabelProps={{ shrink: true }} {...register('projectHandoverDate')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth type="date" label="Tentative Dry Launch Date" InputLabelProps={{ shrink: true }} {...register('tentativeDryLaunchDate')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField
                      fullWidth
                      select
                      label="Cafe Launch Month & Year"
                      value={watch('cafeLaunchMonth') && watch('cafeLaunchYear') ? `${watch('cafeLaunchMonth')} ${watch('cafeLaunchYear')}` : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setValue('cafeLaunchMonth', '', { shouldDirty: true });
                          setValue('cafeLaunchYear', '', { shouldDirty: true });
                        } else {
                          const parts = val.split(' ');
                          setValue('cafeLaunchMonth', parts[0], { shouldDirty: true });
                          setValue('cafeLaunchYear', parts[1], { shouldDirty: true });
                        }
                      }}
                      SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}
                    >
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      {LAUNCH_YEARS.map(y =>
                        MONTH_NAMES.map(m => (
                          <MenuItem key={`${m}-${y}`} value={`${m} ${y}`}>{m} {y}</MenuItem>
                        ))
                      )}
                    </TextField>
                    {/* Hidden fields to keep RHF state in sync */}
                    <input type="hidden" {...register('cafeLaunchMonth')} />
                    <input type="hidden" {...register('cafeLaunchYear')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField 
                      fullWidth 
                      type="date" 
                      label="Launch Date" 
                      InputLabelProps={{ shrink: true }} 
                      {...register('launchDate')} 
                      error={!!errors.launchDate} 
                      helperText={errors.launchDate?.message} 
                    />
                  </Grid>
 
                  {/* --- ROW 2 (5 fields, size 12 each) --- */}
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField 
                      fullWidth 
                      select 
                      label="Café Model" 
                      {...register('cafeModel')} 
                      error={!!errors.cafeModel} 
                      helperText={errors.cafeModel?.message} 
                      value={watch('cafeModel') || ''}
                    >
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      {CAFE_MODELS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth label="New Pricing Category" {...register('newPricingCategory')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth label="New Pricing Sub Category" {...register('newPricingSubCategory')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth label="Cluster" placeholder="e.g. South Delhi" {...register('cluster')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth select label="Menu" {...register('menu')} value={watch('menu') || ''}
                      SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      {MENU_OPTIONS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
 
                  {/* --- ROW 3 (5 fields, size 12 each) --- */}
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth label="Cafe Opening Hr" placeholder="e.g. 15 hours" {...register('cafeOpeningHr')} />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth select label="Platform Type" {...register('platformType')} error={!!errors.platformType} helperText={errors.platformType?.message} value={watch('platformType') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      {PLATFORM_TYPES.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth select label="Trading Area" {...register('tradingArea')} error={!!errors.tradingArea} helperText={errors.tradingArea?.message} value={watch('tradingArea') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      {TRADING_AREAS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth select label="Smoking Zone" {...register('smokingZone')} value={watch('smokingZone') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 60, sm: 12 }}>
                    <TextField fullWidth select label="Parking Option" {...register('parkingOption')} value={watch('parkingOption') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                      <MenuItem value="Valet">Valet</MenuItem>
                    </TextField>
                  </Grid>

                  {/* --- ROW 4 (4 fields, size 15 each) --- */}
                  <Grid size={{ xs: 60, sm: 15 }}>
                    <TextField fullWidth select label="Wheelchair accessibility" {...register('wheelchairAccessibility')} value={watch('wheelchairAccessibility') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 60, sm: 15 }}>
                    <TextField fullWidth select label="Pet Friendly" {...register('petFriendly')} value={watch('petFriendly') || ''}>
                      <MenuItem value="">— Clear Selection —</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 60, sm: 15 }}>
                    <TextField
                      fullWidth
                      label="Expected Sale"
                      type="number"
                      error={!!errors.expectedSalesVal}
                      helperText={errors.expectedSalesVal?.message}
                      {...register('expectedSalesVal', {
                        min: { value: 1, message: 'Value must be between 1 and 200' },
                        max: { value: 200, message: 'Value must be between 1 and 200' }
                      })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Select
                              value={watch('expectedSalesUnit') || 'Lakhs'}
                              onChange={(e) => setValue('expectedSalesUnit', e.target.value)}
                              variant="standard"
                              disableUnderline
                              sx={{ mr: 1, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <MenuItem value="Thousands">Thousands</MenuItem>
                              <MenuItem value="Lakhs">Lakhs</MenuItem>
                              <MenuItem value="Crores">Crores</MenuItem>
                            </Select>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 60, sm: 15 }}>
                    <TextField fullWidth label="Nearby Cafe" placeholder="Enter nearby cafe details..." {...register('nearbyCafes')} />
                  </Grid>

                  {/* --- ROW 5 (Highlights, full width) --- */}
                  <Grid size={{ xs: 60, sm: 60 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Highlights"
                      placeholder="Enter highlights of the cafe..."
                      {...register('highlights')}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ─── CARD 3: Swiggy / Zomato Integration (All Optional) ─── */}
          {selectedBrand && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Swiggy / Zomato Integration Status
                    </Typography>
                    <OptionalBadge />
                  </Box>

                  {selectedBrand === 'BLUE_TOKAI_SUCHALI' && (
                    <Grid container spacing={2} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Blue Tokai Swiggy RID" {...register('blueTokaiSwiggyRID')} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Blue Tokai Zomato RID" {...register('blueTokaiZomatoRID')} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Suchali Swiggy RID" {...register('suchaliSwiggyRID')} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Suchali Zomato RID" {...register('suchaliZomatoRID')} />
                      </Grid>
                    </Grid>
                  )}

                  {selectedBrand === 'GOT_TEA' && (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Got Tea Swiggy RID" {...register('gotTeaSwiggyRID')} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Got Tea Zomato RID" {...register('gotTeaZomatoRID')} />
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* ─── Submit Actions ─── */}
          <Grid size={12}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', borderRadius: '16px' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 500, maxWidth: 600 }}>
                  Please verify all required fields are filled correctly. Upon submission, this store setup request will enter the operations approval queue.
                </Typography>
                <Box sx={{ width: '100%', maxWidth: 400 }}>
                  <Button 
                    variant="contained" 
                    size="large" 
                    type="submit" 
                    disabled={loading || !isCompleteForSubmit} 
                    fullWidth 
                    sx={{ py: 1.8, fontSize: '1rem', borderRadius: '10px', fontWeight: 700 }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit for NSO Approval'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
        ) : (
          <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '16px', bgcolor: 'rgba(0,122,140,0.02)', mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
              Select a Brand to Begin
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Please choose a brand from the dropdown in the header to start entering café details.
            </Typography>
          </Card>
        )}
      </form>

      {/* NSO Approval Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={handleCancelSubmit}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', color: 'text.primary' }}>
          Confirm Submission
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {getConfirmMessage()}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.5 }}>
          <Button onClick={handleConfirmSubmit} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700, px: 3 }}>
            OK
          </Button>
          <Button onClick={handleCancelSubmit} variant="outlined" color="inherit" sx={{ borderRadius: '8px', fontWeight: 700, px: 3 }}>
            Back
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved changes warning dialog */}
      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset()}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'text.primary' }}>
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            You have unsaved changes. Do you want to delete/remove all filled fields or do you want to continue with this?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => blocker.reset()} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Continue with this
          </Button>
          <Button onClick={() => blocker.proceed()} variant="outlined" color="error" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Delete/remove all fields
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Notification */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity="success" 
          variant="filled"
          sx={{ 
            width: '100%',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontWeight: 600
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NewStore;
