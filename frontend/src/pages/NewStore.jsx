import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, Typography, TextField, Button, Grid, Card, CardContent, 
  MenuItem, Alert, CircularProgress, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, InputAdornment, Snackbar, Autocomplete, Tabs, Tab, Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from '../utils/api';
import { CAFE_MODELS, MENU_OPTIONS, MONTH_NAMES, LAUNCH_YEARS } from '../constants/storeOptions';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';

const ZONES = ['North', 'South', 'East', 'West'];
const PLATFORM_TYPES = ['Delivery', 'Not Delivery'];
const TRADING_AREAS = [
  'Residential Area', 'Malls', 'Office Zones', 'Event', 'Institutional',
  'Closed', 'Airport - Inside Security', 'Universities',
  'Transit - Metro/Bus Stations', 'Highways', 'B2B'
];

const formatIndianCurrencyHint = (value) => {
  const num = Number(value);
  if (isNaN(num) || num <= 0) return '';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2).replace(/\.?0+$/, '')} Crore`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2).replace(/\.?0+$/, '')} Lakh`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(2).replace(/\.?0+$/, '')} Thousand`;
  return `₹${num}`;
};

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
  cafeModule: 'Café Module',
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

const DEFAULT_FORM_VALUES = {
  brand: '',
  cafeName: '',
  cafeCode: '',
  cafeModule: '',
  pricingVersion: '',
  indoorSeatingCount: '',
  outdoorSeatingCount: '',
  totalNoOfTables: '',
  copyMenuFrom: '',
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
};

const NewStore = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const canEditContacts = isSuperAdmin || user?.permissions?.includes('EDIT_CONTACTS');

  const { register, handleSubmit, setValue, watch, getValues, formState, reset, formState: { errors } } = useForm({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const selectedBrand = watch('brand');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailMappings, setEmailMappings] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState({});
  const [draftDialog, setDraftDialog] = useState({ open: false, status: '', to: '', cc: '', subject: '', body: '', isEditable: false });
  const [allStoresList, setAllStoresList] = useState([]);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const isSavedRef = useRef(false);
  const navigate = useNavigate();

  const allValues = watch();

  // A helper to check if any field (other than brand/status/defaults) has been modified by the user
  const hasEnteredData = useMemo(() => {
    // List of keys to ignore when checking if user entered any data
    const ignoredKeys = [
      'brand',
      'launchStatus',
      'mailStatus',
      'expectedSalesUnit',
      'zone',
      'cafeMailId',
      'cmMailId',
      'cafeLaunchMonth',
      'cafeLaunchYear',
      'latt',
      'long',
      'areaManagerName',
      'areaManagerEmail',
      'areaManagerPhone',
      'cityHeadName',
      'cityHeadEmail',
      'cityHeadPhone',
      'cafeManagerName',
      'cafeManagerMailId',
      'cafeManagerContactNo'
    ];

    for (const key of Object.keys(allValues)) {
      if (ignoredKeys.includes(key)) continue;

      const currentValue = allValues[key];
      const defaultValue = DEFAULT_FORM_VALUES[key];

      if (currentValue !== defaultValue) {
        if (typeof currentValue === 'string' && currentValue.trim() === '') {
          continue;
        }
        return true;
      }
    }
    return false;
  }, [allValues]);

  // Track if form has unsaved changes
  const hasDirtyFields = Object.keys(formState.dirtyFields).length > 0 && hasEnteredData;

  // Active Tab state for layout categorization
  const [activeTab, setActiveTab] = useState('Cafe Basic Details');

  const TABS = [
    'Cafe Basic Details',
    'Contact Details',
    'GST & FSSAI Details',
    'Others',
    'Operations Details',
    'Partner Integration Hub'
  ];

  const TAB_FIELDS = {
    'Cafe Basic Details': [
      'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress',
      'zone', 'cafeLocationGoogleLink', 'latitude', 'latt', 'long',
      'cafeOpenTiming', 'cafeClosingTime', 'actualClosingTime'
    ],
    'Contact Details': [
      'cafePhoneNumber', 'cafeMailId', 'cmMailId', 'cafeManagerContactNo',
      'areaManagerEmail', 'areaManagerPhone', 'cityHeadEmail', 'cityHeadPhone'
    ],
    'GST & FSSAI Details': [
      'gstNo', 'fssaiNo', 'fssaiStartDate', 'fssaiExpiry'
    ],
    'Operations Details': [
      'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'launchDate'
    ],
    'Others': [
      'cafeModule', 'pricingVersion', 'priceBookRista', 'copyMenuFrom', 'cluster', 'indoorSeatingCount', 'outdoorSeatingCount', 'totalNoOfTables',
      'latitude', 'long', 'areaManagerEmail', 'areaManagerPhone', 'cityHeadEmail', 'cityHeadPhone',
      'cafeOpeningHr',
      'platformType', 'tradingArea', 'smokingZone', 'parkingOption', 'wheelchairAccessibility',
      'petFriendly', 'expectedSalesVal', 'nearbyCafes', 'highlights'
    ],
    'Partner Integration Hub': [
      'blueTokaiSwiggyRID', 'blueTokaiZomatoRID', 'suchaliSwiggyRID', 'suchaliZomatoRID',
      'gotTeaSwiggyRID', 'gotTeaZomatoRID'
    ]
  };

  const getTabHasError = (tabName) => {
    const fields = TAB_FIELDS[tabName] || [];
    return fields.some(field => !!errors[field]);
  };

  const TAB_REQUIRED_FIELDS = {
    'Cafe Basic Details': [
      'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress',
      'zone', 'cafeLocationGoogleLink', 'latitude', 'latt', 'long',
      'cafeOpenTiming', 'cafeClosingTime', 'actualClosingTime'
    ],
    'Contact Details': [
      'cafePhoneNumber', 'cafeMailId', 'cmMailId', 'areaManagerId', 'cityHeadId'
    ],
    'GST & FSSAI Details': [
      'gstNo', 'fssaiNo'
    ],
    'Operations Details': [
      'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'launchDate'
    ],
    'Others': [
      'cafeModule', 'cluster', 'platformType', 'tradingArea', 'smokingZone', 'parkingOption', 'expectedSalesVal', 'nearbyCafes'
    ],
    'Partner Integration Hub': []
  };

  const getTabErrorCount = (tabName, watchedValues) => {
    const requiredList = TAB_REQUIRED_FIELDS[tabName] || [];
    let count = 0;
    requiredList.forEach(field => {
      const val = watchedValues[field];
      if (val === null || val === undefined || String(val).trim() === '') {
        count++;
      }
    });
    return count;
  };

  // Automatically switch activeTab to the first tab that has validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstTabWithError = TABS.find(tab => getTabHasError(tab));
      if (firstTabWithError && firstTabWithError !== activeTab) {
        setActiveTab(firstTabWithError);
      }
    }
  }, [errors]);

  // Watch latitude to auto-fill latt and long
  const latitudeValue = watch('latitude');

  useEffect(() => {
    axios.get('/api/users')
      .then(res => setUsers(normalizeListResponse(res.data, ['users', 'data', 'items'])))
      .catch(err => console.error('Failed to load users:', err));
    // Load contacts for auto-fill suggestions
    axios.get('/api/contacts')
      .then(res => setContacts(normalizeListResponse(res.data, ['contacts', 'data', 'items'])))
      .catch(err => console.error('Failed to load contacts:', err));
    // Load email configurations
    axios.get('/api/system/email-mappings')
      .then(res => setEmailMappings(res.data || []))
      .catch(err => console.error('Failed to load email mappings', err));
    axios.get('/api/system/email-templates')
      .then(res => setEmailTemplates(res.data || {}))
      .catch(err => console.error('Failed to load email templates', err));
    // Load all stores for copy-menu dropdown
    axios.get('/api/stores')
      .then(res => setAllStoresList(normalizeListResponse(res.data, ['stores', 'data', 'items'])))
      .catch(err => console.error('Failed to load stores:', err));
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

  // Auto-extract PIN code from Address field
  const cafeAddressValue = watch('cafeAddress');
  useEffect(() => {
    if (cafeAddressValue) {
      const match = cafeAddressValue.match(/\b\d{6}\b/);
      if (match) {
        const extractedPin = match[0];
        if (pinCodeValue !== extractedPin) {
          setValue('pinCode', extractedPin, { shouldValidate: true });
        }
      }
    }
  }, [cafeAddressValue, pinCodeValue, setValue]);

  // Email ID Auto-Population based on Cafe Name and Brand
  const cafeNameValue = watch('cafeName');
  const brandValue = watch('brand');

  useEffect(() => {
    // Email auto-generation removed as per requirement. User will input manually.
  }, [cafeNameValue, brandValue, setValue]);

  // Auto-fetch GST Number from Global Documents based on State
  const stateValue = watch('state');
  useEffect(() => {
    if (stateValue) {
      axios.get('/api/global-docs')
        .then(res => {
          const stateGst = res.data.find(d => d.category === 'State GST' && d.fileName === stateValue);
          if (stateGst && stateGst.gstNumber && !getValues('gstNo')) {
             setValue('gstNo', stateGst.gstNumber, { shouldValidate: true, shouldDirty: true });
             setSnackbarMessage(`Auto-filled GST Number for ${stateValue}`);
             setOpenSnackbar(true);
          }
        })
        .catch(err => console.error('Failed to auto-fetch GST number for state', err));
    }
  }, [stateValue, setValue, getValues]);

  useEffect(() => {
    const indoor = Number(watch('indoorSeatingCount')) || 0;
    const outdoor = Number(watch('outdoorSeatingCount')) || 0;
    const currentTotal = Number(watch('totalNoOfTables')) || 0;
    if (indoor + outdoor !== currentTotal) {
      setValue('totalNoOfTables', String(indoor + outdoor), { shouldDirty: true, shouldValidate: true });
    }
  }, [watch('indoorSeatingCount'), watch('outdoorSeatingCount'), watch, setValue]);

  // Launch Date → Cafe Launch Month & Year auto-fill
  const launchDateValue = watch('launchDate');
  useEffect(() => {
    if (launchDateValue && String(launchDateValue).trim()) {
      const d = new Date(launchDateValue);
      if (!isNaN(d.getTime())) {
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        setValue('cafeLaunchMonth', monthNames[d.getMonth()], { shouldValidate: true });
        setValue('cafeLaunchYear', String(d.getFullYear()), { shouldValidate: true });
      }
    }
  }, [launchDateValue, setValue]);

  // Auto-generate Price Book (Rista)
  const watchCafeCode = watch('cafeCode');
  const watchPricingVersion = watch('pricingVersion');
  const isPriceBookRistaDirty = formState.dirtyFields?.priceBookRista;

  useEffect(() => {
    if (!isPriceBookRistaDirty) {
      if (watchCafeCode || watchPricingVersion) {
        const generated = [watchCafeCode, watchPricingVersion].filter(Boolean).join(', ');
        setValue('priceBookRista', generated, { shouldValidate: true });
      }
    }
  }, [watchCafeCode, watchPricingVersion, isPriceBookRistaDirty, setValue]);

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

  // Basic 13 fields — minimum required to save any store
  const BASIC_FIELDS = [
    'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress',
    'cafeLocationGoogleLink', 'latitude', 'latt', 'long',
    'cafeOpenTiming', 'cafeClosingTime', 'actualClosingTime'
  ];

  // Full 30 fields — required for NSO Approval
  const NSO_FIELDS = [
    ...BASIC_FIELDS,
    'cafePhoneNumber', 'cafeMailId', 'cmMailId', 'areaManagerId', 'cityHeadId',
    'gstNo',
    'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'launchDate',
    'cafeModule', 'cluster', 'platformType', 'tradingArea',
    'smokingZone', 'parkingOption', 'expectedSalesVal', 'nearbyCafes'
  ];

  const checkFieldsFilled = (data, fields) =>
    fields.every(field => {
      const val = data[field];
      return val !== null && val !== undefined && String(val).trim() !== '';
    });

  // checkIsComplete used in handleConfirmSubmit — checks NSO fields
  const checkIsComplete = (data) => checkFieldsFilled(data, NSO_FIELDS);

  const watchedFields = watch();

  // Basic fields filled → can at least save the store
  const isBasicComplete = checkFieldsFilled(watchedFields, BASIC_FIELDS);

  // All NSO fields filled → show NSO Approval button
  const isNsoComplete = checkFieldsFilled(watchedFields, NSO_FIELDS);

  // 'nso' | 'basic' | 'disabled'
  const submitMode = isNsoComplete ? 'nso' : isBasicComplete ? 'basic' : 'disabled';


  const getStatusAliases = (status) => {
    const norm = (status || '').trim().toUpperCase();
    if (norm === 'IN_PIPELINE' || norm === 'IN PIPELINE') {
      return ['In Pipeline', 'Pipeline'];
    }
    if (norm === 'AGREEMENT_SIGNED' || norm === 'AGREEMENT SIGNED') {
      return ['Agreement Signed'];
    }
    if (norm === 'READY_FOR_CONSTRUCTION' || norm === 'READY FOR CONSTRUCTION') {
      return ['Ready for Construction'];
    }
    if (norm === 'UNDER_DEVELOPMENT' || norm === 'UNDER DEVELOPMENT' || norm === 'UNDER CONSTRUCTION') {
      return ['Under Construction'];
    }

    if (norm === 'PENDING_APPROVAL' || norm === 'APPROVAL_PENDING' || norm === 'APPROVAL PENDING' || norm === 'SENT TO NSO TEAM FOR APPROVAL') {
      return ['Sent to NSO Team for Approval', 'Approval Pending', 'PENDING_APPROVAL'];
    }
    if (norm === 'APPROVED' || norm === 'NSO_APPROVED') {
      return ['Approved', 'APPROVED', 'NSO_APPROVED'];
    }
    if (norm === 'ON_HOLD' || norm === 'ON HOLD') {
      return ['On Hold', 'ON_HOLD'];
    }
    if (norm === 'READY_TO_GO_LIVE' || norm === 'READY TO GO LIVE') {
      return ['Ready to Go Live', 'READY_TO_GO_LIVE'];
    }
    if (norm === 'CLOSED' || norm === 'CLOSED STORES' || norm === 'CLOSED STORE') {
      return ['Closed', 'CLOSED'];
    }
    if (norm === 'LIVE' || norm === 'LIVE STORES' || norm === 'LIVE STORE') {
      return ['Live', 'LIVE'];
    }
    return [status];
  };

  const getMappedConfigForStatus = (status) => {
    const aliases = getStatusAliases(status).map(a => a.toLowerCase());
    const mapping = emailMappings.find(m => 
      (m.category?.toLowerCase() === 'status changes' || m.category?.toLowerCase() === 'status triggered' || m.category?.toLowerCase() === 'status') &&
      aliases.includes(m.subCategory?.toLowerCase())
    );
    if (!mapping) return null;

    const templateKey = Object.keys(emailTemplates).find(k => k.toLowerCase() === mapping.subCategory.toLowerCase());
    const template = templateKey ? emailTemplates[templateKey] : null;
    if (!template) return null;

    return { mapping, template };
  };

  const replacePlaceholders = (templateText, data) => {
    if (!templateText) return '';
    const brandNamePretty = data.brand === 'BLUE_TOKAI_SUCHALI' 
      ? "Blue Tokai / Suchali's Artisan Bakehouse" 
      : (data.brand === 'GOT_TEA' ? "Got Tea" : (data.brand || ''));

    return templateText
      .replace(/{cafeName}|\[Store Name\]|\[Cafe Name\]/gi, data.cafeName || '')
      .replace(/{brandName}|\[Brand Name\]|\[Brand\]/gi, brandNamePretty)
      .replace(/{city}|\[City\]/gi, data.city || '')
      .replace(/{state}|\[State\]/gi, data.state || '')
      .replace(/{address}|\[Address\]/gi, data.cafeAddress || data.address || '')
      .replace(/{model}|\[Model\]|\[Cafe Model\]/gi, data.cafeModule || data.cafeModel || '')
      .replace(/{cafeCode}|\[Store Code\]|\[Cafe Code\]/gi, data.cafeCode || '')
      .replace(/{pincode}|\[Pincode\]|\[Pin Code\]/gi, data.pinCode || '')
      .replace(/<br\s*[\/]?>/gi, '\n');
  };

  const handleSendEmail = async () => {
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
        status: 'PENDING_APPROVAL',
        cafeLaunchMonth: pendingSubmitData.cafeLaunchMonth && pendingSubmitData.cafeLaunchYear
          ? `${pendingSubmitData.cafeLaunchMonth} ${pendingSubmitData.cafeLaunchYear}`
          : pendingSubmitData.cafeLaunchMonth || '',
        launchStatus: 'Upcoming Store',
        latitude: pendingSubmitData.latitude ? parseFloat(pendingSubmitData.latitude) : null,
        latt: pendingSubmitData.latt ? parseFloat(pendingSubmitData.latt) : null,
        long: pendingSubmitData.long ? parseFloat(pendingSubmitData.long) : null,
        lat: pendingSubmitData.latitude ? parseFloat(pendingSubmitData.latitude) : null,
        lng: pendingSubmitData.long ? parseFloat(pendingSubmitData.long) : null,
        areaManagerId: pendingSubmitData.areaManagerId || null,
        cityHeadId: pendingSubmitData.cityHeadId || null,
        cafeManagerId: pendingSubmitData.cafeManagerId || null,
        expectedSales: pendingSubmitData.expectedSalesVal ? Number(pendingSubmitData.expectedSalesVal) : null,
      };
      delete payload.cafeLaunchYear;
      delete payload.expectedSalesVal;
      delete payload.expectedSalesUnit;

      const storeRes = await axios.post('/api/stores', payload);
      const createdStore = storeRes.data;

      await axios.post(`/api/stores/${createdStore.id}/send-status-email`, {
        status: draftDialog.status,
        to: draftDialog.to,
        cc: draftDialog.cc,
        subject: draftDialog.subject,
        body: draftDialog.body
      });

      reset();
      setSnackbarMessage(
        isComplete 
          ? 'The new store has been created and submitted for NSO Approval, and the email notification has been sent.'
          : 'The new store has been created, and the email notification has been sent.'
      );
      setOpenSnackbar(true);
      setDraftDialog({ open: false, status: '', to: '', cc: '', subject: '', body: '', isEditable: false });
      setPendingSubmitData(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to create store and send email.');
    } finally {
      setLoading(false);
    }
  };

  const handleDraftCancel = () => {
    setDraftDialog({ open: false, status: '', to: '', cc: '', subject: '', body: '', isEditable: false });
    setPendingSubmitData(null);
  };

  const onSubmit = (data) => {
    setPendingSubmitData(data);
    const targetStatus = 'PENDING_APPROVAL';
    const config = getMappedConfigForStatus(targetStatus);
    
    if (config) {
      const subject = replacePlaceholders(config.template.subject, data);
      const body = replacePlaceholders(config.template.body, data);
      const to = config.mapping.to.join(', ');
      const cc = config.mapping.cc.join(', ');

      setDraftDialog({
        open: true,
        status: targetStatus,
        to,
        cc,
        subject,
        body,
        isEditable: false
      });
    } else {
      setConfirmOpen(true);
    }
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
        status: 'PENDING_APPROVAL',
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
        areaManagerId: pendingSubmitData.areaManagerId || null,
        cityHeadId: pendingSubmitData.cityHeadId || null,
        cafeManagerId: pendingSubmitData.cafeManagerId || null,
        expectedSales: pendingSubmitData.expectedSalesVal ? Number(pendingSubmitData.expectedSalesVal) : null,
      };
      delete payload.cafeLaunchYear;
      delete payload.expectedSalesVal;
      delete payload.expectedSalesUnit;
      await axios.post('/api/stores', payload);
      reset();
      setSnackbarMessage(
        isComplete 
          ? 'The new store has been submitted for NSO Approval.'
          : 'The new store has been created.'
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
    <Box sx={{ width: '100%', py: 2, px: { xs: 1, md: 2 } }}>
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: '12px', '& .MuiAlert-message': { fontWeight: 700 } }}>
          Validation Error: Please complete the following mandatory fields before submitting: 
          {' '}{Object.keys(errors).map(k => FIELD_LABELS[k] || k).join(', ')}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Sticky Header & Remarks Section */}
        <Box sx={{
          mb: 4,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 3
        }}>
          {/* ─── Title Row ─── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField 
                size="small" 
                label="Status *" 
                disabled 
                value="Upcoming Store" 
                sx={{ 
                  minWidth: 160,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }} 
              />
              <TextField
                select
                size="small"
                label="Brand"
                {...register('brand')}
                error={!!errors.brand}
                helperText={errors.brand?.message}
                sx={{ 
                  minWidth: 280,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                <MenuItem value="">— Clear Selection —</MenuItem>
                <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's Artisan Bakehouse</MenuItem>
                <MenuItem value="GOT_TEA">Got Tea</MenuItem>
              </TextField>
              <Button variant="outlined" onClick={() => navigate(-1)} sx={{ px: 3, borderRadius: '8px', height: 40, bgcolor: 'background.paper' }}>
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

        {/* Horizontal Tabs */}
        {selectedBrand && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, mt: 1 }}>
            <Tabs
              value={activeTab}
              onChange={(e, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.92rem',
                  color: 'text.secondary',
                  px: 3,
                  py: 1.5,
                  transition: 'all 0.2s',
                  borderBottom: '2px solid transparent',
                  '&.Mui-selected': {
                    color: 'primary.main',
                    bgcolor: 'rgba(63,174,191,0.06)',
                  },
                  '&:hover': {
                    color: 'primary.light',
                    bgcolor: 'rgba(63,174,191,0.03)',
                  }
                },
                '& .MuiTabs-indicator': {
                  height: '3px',
                  borderRadius: '3px 3px 0 0',
                }
              }}
            >
              {TABS.map(tab => {
                const errCount = getTabErrorCount(tab, allValues);
                const isComplete = errCount === 0;
                return (
                  <Tab 
                    key={tab} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {tab}
                        {isComplete ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', ml: 0.5 }} />
                        ) : (
                          <Typography variant="caption" sx={{ color: 'error.main', ml: 0.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            — 🔴 {errCount} {errCount === 1 ? 'Error' : 'Errors'}
                          </Typography>
                        )}
                      </Box>
                    } 
                    value={tab} 
                  />
                );
              })}
            </Tabs>
          </Box>
        )}

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
          {activeTab === 'Cafe Basic Details' && (
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
                              const stores = normalizeListResponse(res.data, ['stores', 'data', 'items']);
                              const exists = stores.some(s => s.cafeCode && s.cafeCode.toLowerCase() === value.toLowerCase());
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
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
          )}

          {/* ─── CARD 2: Contact Details ─── */}
          {activeTab === 'Contact Details' && (
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
                    <Grid size={{ xs: 12, sm: 3 }}>
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
                        disabled={!isSuperAdmin && !isAdmin}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
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
                        disabled={!isSuperAdmin && !isAdmin}
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
                        label="Café Manager Contact No." 
                        {...register('cafeManagerContactNo')} 
                        InputLabelProps={{ shrink: true }} 
                        InputProps={{ readOnly: !isSuperAdmin && !isAdmin }}
                        error={!!errors.cafeManagerContactNo}
                        helperText={errors.cafeManagerContactNo?.message || "Auto-filled"}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? 'action.hover' : 'inherit' } }}
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
                        InputProps={{ readOnly: !isSuperAdmin && !isAdmin }}
                        error={!!errors.areaManagerEmail}
                        helperText={errors.areaManagerEmail?.message || "Auto-filled"}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? 'action.hover' : 'inherit' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        label="Area Manager Contact No." 
                        {...register('areaManagerPhone')} 
                        InputLabelProps={{ shrink: true }} 
                        InputProps={{ readOnly: !isSuperAdmin && !isAdmin }}
                        error={!!errors.areaManagerPhone}
                        helperText={errors.areaManagerPhone?.message || "Auto-filled"}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? 'action.hover' : 'inherit' } }}
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
                        InputProps={{ readOnly: !isSuperAdmin && !isAdmin }}
                        error={!!errors.cityHeadEmail} 
                        helperText={errors.cityHeadEmail?.message || "Auto-filled"} 
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? 'action.hover' : 'inherit' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        label="City Head Contact No." 
                        {...register('cityHeadPhone')} 
                        InputLabelProps={{ shrink: true }} 
                        InputProps={{ readOnly: !isSuperAdmin && !isAdmin }}
                        error={!!errors.cityHeadPhone} 
                        helperText={errors.cityHeadPhone?.message || "Auto-filled"} 
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? 'action.hover' : 'inherit' } }}
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
          )}

          {/* ─── CARD: GST & FSSAI Details ─── */}
          {activeTab === 'GST & FSSAI Details' && (
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
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="GST No" 
                        {...register('gstNo')} 
                        error={!!errors.gstNo} 
                        helperText={errors.gstNo?.message} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="FSSAI No" 
                        {...register('fssaiNo')} 
                        error={!!errors.fssaiNo} 
                        helperText={errors.fssaiNo?.message} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        type="date"
                        label="FSSAI Issued On" 
                        InputLabelProps={{ shrink: true }}
                        {...register('fssaiStartDate')} 
                        error={!!errors.fssaiStartDate} 
                        helperText={errors.fssaiStartDate?.message} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        type="date"
                        label="FSSAI Valid Until" 
                        InputLabelProps={{ shrink: true }}
                        {...register('fssaiExpiry')} 
                        error={!!errors.fssaiExpiry} 
                        helperText={errors.fssaiExpiry?.message} 
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* ─── CARD 4: Operations Details ─── */}
          {activeTab === 'Operations Details' && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Operations Details
                    </Typography>
                    <OptionalBadge />
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Project Start Date" InputLabelProps={{ shrink: true }} {...register('projectStartDate')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Project Handover Date" InputLabelProps={{ shrink: true }} {...register('projectHandoverDate')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Tentative Dry Launch Date" InputLabelProps={{ shrink: true }} {...register('tentativeDryLaunchDate')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      {isSuperAdmin || isAdmin ? (
                        <>
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
                          <input type="hidden" {...register('cafeLaunchMonth')} />
                          <input type="hidden" {...register('cafeLaunchYear')} />
                        </>
                      ) : (
                        <>
                          <TextField
                            fullWidth
                            label="Cafe Launch Month & Year"
                            value={watch('cafeLaunchMonth') && watch('cafeLaunchYear') ? `${watch('cafeLaunchMonth')} ${watch('cafeLaunchYear')}` : ''}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ readOnly: true }}
                            helperText="Auto-filled from Launch Date"
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
                          />
                          <input type="hidden" {...register('cafeLaunchMonth')} />
                          <input type="hidden" {...register('cafeLaunchYear')} />
                        </>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
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

                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* ─── CARD 5: Others ─── */}
          {activeTab === 'Others' && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Others
                    </Typography>
                    <OptionalBadge />
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        select 
                        label="Café Module" 
                        {...register('cafeModule')} 
                        error={!!errors.cafeModule} 
                        helperText={errors.cafeModule?.message} 
                        value={watch('cafeModule') || ''}
                      >
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {CAFE_MODELS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Autocomplete
                        fullWidth
                        options={MENU_OPTIONS}
                        value={watch('pricingVersion') || null}
                        onChange={(event, newValue) => {
                          setValue('pricingVersion', newValue || '', { shouldDirty: true });
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Pricing Module" placeholder="Search pricing module..." />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Autocomplete
                        fullWidth
                        options={allStoresList}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          return `${option.cafeName || ''} (${option.cafeCode || ''})`;
                        }}
                        value={allStoresList.find(s => String(s.id) === String(watch('copyMenuFrom'))) || null}
                        onChange={(event, newValue) => {
                          setValue('copyMenuFrom', newValue ? String(newValue.id) : '', { shouldDirty: true });
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Copy Menu From" placeholder="Search by name or code..." />
                        )}
                        filterOptions={(options, state) => {
                          const query = (state.inputValue || '').toLowerCase().trim();
                          return options.filter(option => 
                            String(option.cafeName).toLowerCase().includes(query) ||
                            String(option.cafeCode).toLowerCase().includes(query)
                          );
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Price Book (Rista)" 
                        {...register('priceBookRista')} 
                        InputProps={{ readOnly: !isSuperAdmin }}
                        disabled={!isSuperAdmin}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: !isSuperAdmin ? 'action.hover' : 'inherit' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="Cluster" placeholder="e.g. South Delhi" {...register('cluster')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Indoor Seating Count" 
                        {...register('indoorSeatingCount', {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/[^0-9]/g, '');
                          }
                        })} 
                        value={watch('indoorSeatingCount') || ''}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Outdoor Seating Count" 
                        {...register('outdoorSeatingCount', {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/[^0-9]/g, '');
                          }
                        })} 
                        value={watch('outdoorSeatingCount') || ''}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Total No. of Tables" 
                        {...register('totalNoOfTables')} 
                        value={watch('totalNoOfTables') || ''}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: 'background.paper' }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="Cafe Opening Hr" placeholder="e.g. 15 hours" {...register('cafeOpeningHr')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Platform Type" {...register('platformType')} error={!!errors.platformType} helperText={errors.platformType?.message} value={watch('platformType') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {PLATFORM_TYPES.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Trading Area" {...register('tradingArea')} error={!!errors.tradingArea} helperText={errors.tradingArea?.message} value={watch('tradingArea') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {TRADING_AREAS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Smoking Zone" {...register('smokingZone')} value={watch('smokingZone') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Parking Option" {...register('parkingOption')} value={watch('parkingOption') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                        <MenuItem value="Valet">Valet</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Wheelchair accessibility" {...register('wheelchairAccessibility')} value={watch('wheelchairAccessibility') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Pet Friendly" {...register('petFriendly')} value={watch('petFriendly') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        label="Expected Sale"
                        type="number"
                        error={!!errors.expectedSalesVal}
                        helperText={errors.expectedSalesVal?.message || formatIndianCurrencyHint(watch('expectedSalesVal'))}
                        {...register('expectedSalesVal', {
                          min: { value: 1, message: 'Value must be greater than 0' }
                        })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="Nearby Cafe" placeholder="Enter nearby cafe details..." {...register('nearbyCafes')} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 12 }}>
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
          )}
          </Grid>

          {/* ─── CARD 3: Partner Integration Hub (All Optional) ─── */}
          {activeTab === 'Partner Integration Hub' && selectedBrand && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Partner Integration Hub Status
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
                {/* Helper text changes based on mode */}
                {submitMode === 'nso' && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 500, maxWidth: 600 }}>
                    All mandatory fields are filled. Upon submission, this store setup request will enter the NSO approval queue.
                  </Typography>
                )}
                {submitMode === 'basic' && (
                  <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 500, maxWidth: 600, color: 'warning.dark' }}>
                    Basic details are filled. You can create the store now. Fill in all remaining fields to unlock <strong>Submit for NSO Approval</strong>.
                  </Typography>
                )}
                {submitMode === 'disabled' && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 500, maxWidth: 600 }}>
                    Please fill in all required fields to enable submission. At minimum, complete the Café Basic Details section.
                  </Typography>
                )}

                <Box sx={{ width: '100%', maxWidth: 400 }}>
                  {/* NSO Approval button — visible only when all 30 fields are filled */}
                  {submitMode === 'nso' && (
                    <Button
                      variant="contained"
                      size="large"
                      type="submit"
                      disabled={loading}
                      fullWidth
                      sx={{
                        py: 1.8, fontSize: '1rem', borderRadius: '10px', fontWeight: 700,
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit for NSO Approval'}
                    </Button>
                  )}

                  {/* Create a New Store button — visible when only basic 13 fields are filled */}
                  {submitMode === 'basic' && (
                    <Button
                      variant="contained"
                      size="large"
                      type="submit"
                      disabled={loading}
                      fullWidth
                      sx={{
                        py: 1.8, fontSize: '1rem', borderRadius: '10px', fontWeight: 700,
                        bgcolor: '#f59e0b',
                        color: '#fff',
                        '&:hover': { bgcolor: '#d97706' }
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Create a New Store'}
                    </Button>
                  )}

                  {/* Disabled placeholder when neither condition is met */}
                  {submitMode === 'disabled' && (
                    <Button
                      variant="contained"
                      size="large"
                      disabled
                      fullWidth
                      sx={{ py: 1.8, fontSize: '1rem', borderRadius: '10px', fontWeight: 700 }}
                    >
                      Submit for NSO Approval
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
        ) : (
          <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper', mt: 2, backdropFilter: 'blur(8px)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Select a Brand to Begin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please choose a brand from the dropdown in the header to start entering café details.
            </Typography>
          </Card>
        )}
      </form>

      {/* Simple Confirmation Dialog (when no email mapping exists) */}
      <Dialog
        open={confirmOpen}
        onClose={handleCancelSubmit}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Confirm New Store Creation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {pendingSubmitData && checkIsComplete(pendingSubmitData) 
              ? 'All mandatory fields are completed. This store will be submitted for NSO Approval. Do you want to proceed?'
              : 'The basic details are filled. A new store record will be created. Do you want to proceed?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelSubmit} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSubmit} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Draft Email Dialog */}
      <Dialog
        open={draftDialog.open}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Draft Email
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Status: {draftDialog.status} — {pendingSubmitData?.cafeName || 'Untitled Store'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleDraftCancel}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              disabled={draftDialog.isEditable || loading}
              onClick={() => setDraftDialog(prev => ({ ...prev, isEditable: true }))}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Modify
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={handleSendEmail}
              disabled={loading}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Send
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="To"
              value={draftDialog.to}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="CC"
              value={draftDialog.cc}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Subject"
              value={draftDialog.subject}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={12}
              label="Body"
              value={draftDialog.body}
              disabled={!draftDialog.isEditable || loading}
              onChange={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.value }))}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
            />
          </Stack>
        </DialogContent>
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        style={{ zIndex: 2147483647 }}
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
