import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, Typography, TextField, Button, Grid, Card, CardContent, 
  MenuItem, Alert, CircularProgress, Divider, Chip, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Select, InputAdornment, Autocomplete, Tabs, Tab, Stack
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from '../utils/api';

import { useAuth } from '../context/AuthContext';
import { CAFE_MODELS, MENU_OPTIONS, INDIAN_STATES, INDIAN_CITIES, STATE_CITIES_MAP, MONTH_NAMES, LAUNCH_YEARS } from '../constants/storeOptions';
import { normalizeListResponse } from '../utils/api';

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

const safeGetDateString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  try {
    let d;
    if (typeof val === 'object') {
      if (val.seconds !== undefined) {
        d = new Date(val.seconds * 1000);
      } else if (typeof val.toDate === 'function') {
        d = val.toDate();
      } else {
        return '';
      }
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const compareStoreIds = (id1, id2) => {
  if (!id1 || !id2) return false;
  const normalize = (val) => String(val).toLowerCase().replace(/o/g, '0').replace(/[il1]/g, 'l');
  return normalize(id1) === normalize(id2);
};

export default function EditStore() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/stores';
  const { register, handleSubmit, setValue, reset, watch, getValues, formState, formState: { errors } } = useForm();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [store, setStore] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNsoConfirmDialog, setShowNsoConfirmDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [allStoresList, setAllStoresList] = useState([]);
  const isSavedRef = useRef(false);
  const pendingDataRef = useRef(null);

  // Active Tab state for layout categorization
  const [activeTab, setActiveTab] = useState('Cafe Basic Details');

  const TABS = [
    'Cafe Basic Details',
    'Contact Details',
    'GST & FSSAI Details',
    'Others',
    'Operations Details',
    'Swiggy / Zomato Integration'
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
      'gstNo', 'gstCertificateLink', 'fssaiLicense', 'fssaiNo', 'fssaiExpiry'
    ],
    'Operations Details': [
      'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'launchDate'
    ],
    'Others': [
      'cafeModule', 'pricingVersion', 'indoorSeatingCount', 'outdoorSeatingCount', 'totalNoOfTables', 'copyMenuFrom',
      'latitude', 'long', 'areaManagerEmail', 'areaManagerPhone', 'cityHeadEmail', 'cityHeadPhone',
      'newPricingCategory', 'newPricingSubCategory', 'cluster', 'cafeOpeningHr',
      'platformType', 'tradingArea', 'smokingZone', 'parkingOption', 'wheelchairAccessibility',
      'petFriendly', 'expectedSalesVal', 'nearbyCafes', 'highlights'
    ],
    'Swiggy / Zomato Integration': [
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
    'Swiggy / Zomato Integration': []
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

  
  const [ucDialogOpen, setUcDialogOpen] = useState(false);
  const [ucDialogStore, setUcDialogStore] = useState(null);
  const [ucStartDate, setUcStartDate] = useState('');
  const [ucHandoverDate, setUcHandoverDate] = useState('');
  const [ucDryLaunchDate, setUcDryLaunchDate] = useState('');
  const [ucLaunchDate, setUcLaunchDate] = useState('');
  const [ucLaunchMonth, setUcLaunchMonth] = useState('');
  const [ucDialogError, setUcDialogError] = useState('');

  // Under Construction Handlers
  const handleUcHandoverChange = (e) => {
    const val = e.target.value;
    setUcHandoverDate(val);
    if (val) {
      const d = new Date(val);
      d.setDate(d.getDate() + 3);
      setUcDryLaunchDate(d.toISOString().split('T')[0]);
    } else {
      setUcDryLaunchDate('');
    }
  };

  const handleUcLaunchChange = (e) => {
    const val = e.target.value;
    setUcLaunchDate(val);
    if (val) {
      const d = new Date(val);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      setUcLaunchMonth(month + ' ' + year);
    } else {
      setUcLaunchMonth('');
    }
  };

  const handleConfirmUc = () => {
    if (!ucHandoverDate || !ucLaunchDate) {
      setUcDialogError('Project Handover Date and Launch Date are mandatory.');
      return;
    }
    setUcDialogError('');
    setValue('projectStartDate', ucStartDate, { shouldDirty: true });
    setValue('projectHandoverDate', ucHandoverDate, { shouldDirty: true });
    setValue('tentativeDryLaunchDate', ucDryLaunchDate, { shouldDirty: true });
    setValue('launchDate', ucLaunchDate, { shouldDirty: true });
    if (ucLaunchMonth) {
      const [m, y] = ucLaunchMonth.split(' ');
      setValue('launchMonth', m, { shouldDirty: true });
      setValue('launchYear', y, { shouldDirty: true });
    }
    setValue('status', 'Under Construction', { shouldDirty: true });
    setPrevStatus('Under Construction');
    setUcDialogOpen(false);
  };

  const handleCancelUc = () => {
    setUcDialogOpen(false);
    setUcDialogError('');
    // reset status back to previous
    setValue('status', 'Ready for Construction', { shouldDirty: false });
  };

  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [emailMappings, setEmailMappings] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState({});
  const [draftDialog, setDraftDialog] = useState({ open: false, status: '', to: '', cc: '', subject: '', body: '', isEditable: false });
  const [prevStatus, setPrevStatus] = useState('');
  const [tempInStoreClosed, setTempInStoreClosed] = useState(false);
  const [tempDeliveryClosed, setTempDeliveryClosed] = useState(false);
  const [tempInStoreClosedDate, setTempInStoreClosedDate] = useState('');
  const [tempDeliveryClosedDate, setTempDeliveryClosedDate] = useState('');
  const [closureDialogError, setClosureDialogError] = useState('');

  // Under Construction Dialog State

  const handleConfirmClosure = () => {
    setClosureDialogError('');
    if (!tempInStoreClosed && !tempDeliveryClosed) {
      setClosureDialogError('At least one closure toggle (In-Store or Delivery) must be enabled.');
      return;
    }
    if (tempInStoreClosed && !tempInStoreClosedDate) {
      setClosureDialogError('In-Store Closed Date is mandatory.');
      return;
    }
    if (tempDeliveryClosed && !tempDeliveryClosedDate) {
      setClosureDialogError('Delivery Closed Date is mandatory.');
      return;
    }
    if (tempInStoreClosed && tempInStoreClosedDate && inStoreLiveDateValue) {
      const closedDate = new Date(tempInStoreClosedDate);
      const liveDate = new Date(inStoreLiveDateValue);
      if (!isNaN(closedDate.getTime()) && !isNaN(liveDate.getTime()) && closedDate < liveDate) {
        setClosureDialogError('In-Store Closure Date cannot be earlier than the In-Store Live Date. Please select a valid date.');
        return;
      }
    }
    if (tempDeliveryClosed && tempDeliveryClosedDate && deliveryLiveDateValue) {
      const closedDate = new Date(tempDeliveryClosedDate);
      const liveDate = new Date(deliveryLiveDateValue);
      if (!isNaN(closedDate.getTime()) && !isNaN(liveDate.getTime()) && closedDate < liveDate) {
        setClosureDialogError('Delivery Closure Date cannot be earlier than the Delivery Live Date. Please select a valid date.');
        return;
      }
    }
    // Apply temporary states to the form
    setValue('inStoreClosed', tempInStoreClosed, { shouldDirty: true, shouldValidate: true });
    setValue('deliveryClosed', tempDeliveryClosed, { shouldDirty: true, shouldValidate: true });
    setValue('inStoreClosedDate', tempInStoreClosedDate, { shouldDirty: true, shouldValidate: true });
    setValue('deliveryClosedDate', tempDeliveryClosedDate, { shouldDirty: true, shouldValidate: true });
    setValue('status', 'CLOSED', { shouldDirty: true, shouldValidate: true });
    setPrevStatus('CLOSED');
    setClosureDialogOpen(false);
  };

  const handleCancelClosure = () => {
    setClosureDialogOpen(false);
    setClosureDialogError('');
  };

  const hasDirtyFields = Object.keys(formState.dirtyFields).length > 0;

  // Warn user about unsaved changes on browser refresh/close
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

  // RBAC checks
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isFinance = user?.role === 'FINANCE';
  const isViewOnly = user?.role === 'USER';  // User Access Profile — view only
  const canApprove = isSuperAdmin || user?.permissions?.includes('APPROVER');
  const hasGoLiveAccess = user?.permissions?.includes('GO_LIVE') || isSuperAdmin;
  const hasUpcomingEditor = isSuperAdmin || isAdmin || user?.permissions?.includes('EDITOR');

  // Auto-revert status if any details are changed during Approval stage
  const dirtyFields = formState.dirtyFields;
  useEffect(() => {
    if (isSuperAdmin || isAdmin) return;

    const hasDataChanges = Object.keys(dirtyFields).some(key => key !== 'status');
    if (hasDataChanges) {
       const currentStatus = getValues('status');
       if (currentStatus === 'APPROVED' || currentStatus === 'NSO_APPROVED') {
         setValue('status', 'PENDING_APPROVAL', { shouldDirty: true });
       }
    }
  }, [dirtyFields, getValues, setValue, isSuperAdmin, isAdmin]);

  // Block in-app navigation when form is dirty
  const blocker = useBlocker(
    useCallback(() => {
      if (isSavedRef.current) return false;
      return hasDirtyFields;
    }, [hasDirtyFields])
  );

  useEffect(() => {
    register('inStoreClosed');
    register('deliveryClosed');
    register('inStoreClosedDate');
    register('deliveryClosedDate');
  }, [register]);

  useEffect(() => {
    // User Access Profile: only fetch stores (contacts are not needed and the endpoint blocks USER role)
    const fetchPromises = isViewOnly
      ? [axios.get(`/api/stores`), Promise.resolve({ data: [] })]
      : [axios.get(`/api/stores`), axios.get('/api/contacts')];

    Promise.all([
      ...fetchPromises,
      axios.get('/api/system/email-mappings').catch(() => ({ data: [] })),
      axios.get('/api/system/email-templates').catch(() => ({ data: {} }))
    ]).then(([storesRes, contactsRes, mappingsRes, templatesRes]) => {
      setEmailMappings(mappingsRes.data || []);
      setEmailTemplates(templatesRes.data || {});
      const stores = normalizeListResponse(storesRes.data, ['stores', 'data', 'items']);
      setAllStoresList(stores);
      const contacts = normalizeListResponse(contactsRes.data, ['contacts', 'data', 'items']);
      const currentStore = stores.find(s => compareStoreIds(s.id, id));
      if (!currentStore) {
        setErrorMsg('Store not found.');
        return;
      }
      if (String(currentStore.id) !== String(id)) {
        navigate(`/stores/${currentStore.id}`, { replace: true, state: location.state });
        return;
      }
      setStore(currentStore);
      setPrevStatus(currentStore.status);
      setContacts(contacts);

      // Parse expectedSales
      let expectedSalesVal = '';
      let expectedSalesUnit = 'Lakhs';
      if (currentStore.expectedSales) {
        const cleanSales = currentStore.expectedSales.replace('₹', '').trim();
        const parts = cleanSales.split(/\s+/);
        if (parts.length >= 1) {
          expectedSalesVal = parts[0];
        }
        if (parts.length >= 2) {
          expectedSalesUnit = parts[1];
        }
      }

      // Map status
      let formStatus = currentStore.status;
      if (['NSO_APPROVED', 'APPROVED'].includes(formStatus)) {
        formStatus = 'APPROVED';
      }
      // Format latitude and launchDate for the form representation
      const formattedStore = {
        ...currentStore,
        status: formStatus,
        cafeModule: currentStore.cafeModule || currentStore.cafeModel || '',
        pricingVersion: currentStore.pricingVersion || currentStore.menu || '',
        indoorSeatingCount: currentStore.indoorSeatingCount ?? '',
        outdoorSeatingCount: currentStore.outdoorSeatingCount ?? '',
        totalNoOfTables: currentStore.totalNoOfTables ?? '',
        copyMenuFrom: currentStore.copyMenuFrom || '',
        latitude: currentStore.latt !== null && currentStore.long !== null
          ? `${currentStore.latt},${currentStore.long}`
          : (currentStore.latitude || ''),
        launchDate: safeGetDateString(currentStore.launchDate),
        petFriendly: currentStore.petFriendly || '',
        projectStartDate: safeGetDateString(currentStore.projectStartDate),
        projectHandoverDate: safeGetDateString(currentStore.projectHandoverDate),
        tentativeDryLaunchDate: safeGetDateString(currentStore.tentativeDryLaunchDate),
        highlights: currentStore.highlights || '',
        expectedSalesVal: expectedSalesVal,
        expectedSalesUnit: expectedSalesUnit,
        nearbyCafes: currentStore.nearbyCafes || '',
        inStoreLiveDate: safeGetDateString(currentStore.inStoreLiveDate),
        deliveryLiveDate: safeGetDateString(currentStore.deliveryLiveDate),
        inStoreClosed: currentStore.inStoreClosed ?? false,
        deliveryClosed: currentStore.deliveryClosed ?? false,
        inStoreClosedDate: safeGetDateString(currentStore.inStoreClosedDate),
        deliveryClosedDate: safeGetDateString(currentStore.deliveryClosedDate)
      };
      // Split stored "Month Year" into separate dropdown values
      if (currentStore.cafeLaunchMonth) {
        const parts = currentStore.cafeLaunchMonth.trim().split(/\s+/);
        if (parts.length >= 2) {
          formattedStore.cafeLaunchMonth = parts[0]; // e.g. "June"
          formattedStore.cafeLaunchYear = parts[1];  // e.g. "2026"
        }
      }
      reset(formattedStore);
    }).catch(err => {
      setErrorMsg('Failed to load store details.');
    });
  }, [id, navigate, reset, isSuperAdmin, isViewOnly]);

  // Watch latitude to auto-fill latt and long
  const latitudeValue = watch('latitude');

  useEffect(() => {
    if (latitudeValue && String(latitudeValue).includes(',')) {
      const str = String(latitudeValue);
      const commaIndex = str.indexOf(',');
      const firstPart = str.substring(0, commaIndex).trim();
      const secondPart = str.substring(commaIndex + 1).trim();
      if (firstPart) setValue('latt', firstPart, { shouldValidate: true, shouldDirty: false });
      if (secondPart) setValue('long', secondPart, { shouldValidate: true, shouldDirty: false });
    } else {
      setValue('latt', '', { shouldValidate: true, shouldDirty: false });
      setValue('long', '', { shouldValidate: true, shouldDirty: false });
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
              setValue('city', district, { shouldValidate: true, shouldDirty: false });
              setValue('state', stateName, { shouldValidate: true, shouldDirty: false });
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch city/state for pin code', err);
        });
    } else if (!pinCodeValue) {
      setValue('city', '', { shouldValidate: true, shouldDirty: false });
      setValue('state', '', { shouldValidate: true, shouldDirty: false });
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
          setValue('pinCode', extractedPin, { shouldValidate: true, shouldDirty: true });
        }
      }
    }
  }, [cafeAddressValue, pinCodeValue, setValue]);

  // Email ID Auto-Population based on Cafe Name and Brand
  const cafeNameValue = watch('cafeName');
  const brandValue = watch('brand');
  const cafeMailIdValue = watch('cafeMailId');
  const isMailIdDirty = formState.dirtyFields.cafeMailId;
  const isCmMailIdDirty = formState.dirtyFields.cmMailId;
  const isCafeNameDirty = formState.dirtyFields.cafeName;
  const isBrandDirty = formState.dirtyFields.brand;

  useEffect(() => {
    const shouldAutoGenerate = cafeNameValue && brandValue && (
      !cafeMailIdValue ||
      ((isCafeNameDirty || isBrandDirty) && !isMailIdDirty)
    );

    if (shouldAutoGenerate) {
      const cleanCafeName = String(cafeNameValue).replace(/\s+/g, '').toLowerCase();
      let cafeMail = '';
      if (brandValue === 'BLUE_TOKAI_SUCHALI') {
        cafeMail = `${cleanCafeName}@bluetokaicoffee.com`;
      } else if (brandValue === 'GOT_TEA') {
        cafeMail = `${cleanCafeName}@gottea.in`;
      }
      setValue('cafeMailId', cafeMail, { shouldValidate: true });
      if (!isCmMailIdDirty) {
        setValue('cmMailId', cafeMail ? `cm.${cafeMail}` : '', { shouldValidate: true });
      }
    }
  }, [cafeNameValue, brandValue, cafeMailIdValue, isMailIdDirty, isCmMailIdDirty, isCafeNameDirty, isBrandDirty, setValue]);

  // Launch Date → Cafe Launch Month & Year auto-fill (for non-Super Admin & non-Admin)
  const launchDateValue = watch('launchDate');
  useEffect(() => {
    if (!isSuperAdmin && !isAdmin && launchDateValue && String(launchDateValue).trim()) {
      const d = new Date(launchDateValue);
      if (!isNaN(d.getTime())) {
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        setValue('cafeLaunchMonth', monthNames[d.getMonth()], { shouldDirty: true, shouldValidate: true });
        setValue('cafeLaunchYear', String(d.getFullYear()), { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [launchDateValue, isSuperAdmin, isAdmin, setValue]);

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

  // Determine what is editable
  // Determine what is editable
  // Once the store is locked, no one can make changes to the branch fields.
  const currentStatusVal = watch('status');
  // Unlock locally if the user is transitioning it to Under Construction
  const isLocked = store?.isLocked && currentStatusVal !== 'Under Construction';
  const isApprovedStatus = store && ['NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(store.status);
  
  const hasEditStores = user?.permissions?.includes('EDIT_STORES');
  const hasEditContacts = isSuperAdmin || user?.permissions?.includes('EDIT_CONTACTS');
  
  // Go-Live Configuration card visibility and editability
  const isGoLiveVisible = currentStatusVal === 'LIVE';
  const canEditGoLive = store && hasGoLiveAccess && (!isLocked || isSuperAdmin) && (store?.status !== 'CLOSED' || isSuperAdmin);

  const instLiveWatched = watch('inStoreLive');
  const inStoreLiveValue = canEditGoLive 
    ? (instLiveWatched !== undefined ? instLiveWatched : (store?.inStoreLive ?? false))
    : (store?.inStoreLive ?? false);

  const delivLiveWatched = watch('deliveryLive');
  const deliveryLiveValue = canEditGoLive 
    ? (delivLiveWatched !== undefined ? delivLiveWatched : (store?.deliveryLive ?? false))
    : (store?.deliveryLive ?? false);
  
  let canEditBasicDetails = false;
  let canEditContacts = false;
  let canEditFinance = false;

  if (isSuperAdmin) {
    canEditBasicDetails = true;
    canEditContacts = true;
    canEditFinance = true;
  } else if (isViewOnly) {
    // User Access Profile: view only — all flags remain false
  } else {
    // Non-Super Admin
    // If the store is locked or has been approved (NSO Approval stage), restrict edits (read-only)
    if (!isLocked && !isApprovedStatus) {
      // 1. Store Edit Sub-Access grants full edit capabilities
      if (hasEditStores) {
        canEditBasicDetails = true;
        canEditContacts = true;
        canEditFinance = true;
      }

      // 2. Edit Contact Sub-Access only grants contact edit capabilities
      if (hasEditContacts) {
        canEditContacts = true;
      }
    }
  }

  // If the store is CLOSED or READY FOR CONSTRUCTION, restrict editing
  if (currentStatusVal === 'CLOSED' && !isSuperAdmin) {
    canEditBasicDetails = false;
    canEditContacts = false;
    canEditFinance = false;
  }

  if (currentStatusVal === 'Ready for Construction') {
    canEditBasicDetails = false;
    canEditContacts = false;
    canEditFinance = false;
  }

  const isGoLiveFormValid = () => {
    const currentStatusVal = watch('status');
    if (currentStatusVal === 'LIVE') {
      if (!inStoreLiveValue && !deliveryLiveValue) return false;
      
      const instLiveDateVal = watch('inStoreLiveDate') !== undefined ? watch('inStoreLiveDate') : (store?.inStoreLiveDate ?? '');
      const delivLiveDateVal = watch('deliveryLiveDate') !== undefined ? watch('deliveryLiveDate') : (store?.deliveryLiveDate ?? '');
      
      if (inStoreLiveValue && !instLiveDateVal) return false;
      if (deliveryLiveValue && !delivLiveDateVal) return false;
    }
    return true;
  };

  const isClosedVisible = watch('status') === 'CLOSED';
  const canEditClosure = isSuperAdmin;

  const inStoreClosedWatched = watch('inStoreClosed');
  const inStoreClosedValue = inStoreClosedWatched !== undefined ? inStoreClosedWatched : (store?.inStoreClosed ?? false);

  const deliveryClosedWatched = watch('deliveryClosed');
  const deliveryClosedValue = deliveryClosedWatched !== undefined ? deliveryClosedWatched : (store?.deliveryClosed ?? false);

  const inStoreClosedDateWatched = watch('inStoreClosedDate');
  const inStoreClosedDateValue = inStoreClosedDateWatched !== undefined ? inStoreClosedDateWatched : safeGetDateString(store?.inStoreClosedDate);

  const deliveryClosedDateWatched = watch('deliveryClosedDate');
  const deliveryClosedDateValue = deliveryClosedDateWatched !== undefined ? deliveryClosedDateWatched : safeGetDateString(store?.deliveryClosedDate);

  const inStoreLiveDateWatched = watch('inStoreLiveDate');
  const inStoreLiveDateValue = inStoreLiveDateWatched !== undefined ? inStoreLiveDateWatched : safeGetDateString(store?.inStoreLiveDate);

  const deliveryLiveDateWatched = watch('deliveryLiveDate');
  const deliveryLiveDateValue = deliveryLiveDateWatched !== undefined ? deliveryLiveDateWatched : safeGetDateString(store?.deliveryLiveDate);

  const formatDateString = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(safeGetDateString(dateStr));
      if (isNaN(d.getTime())) return typeof dateStr === 'object' ? '—' : String(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return typeof dateStr === 'object' ? '—' : String(dateStr);
    }
  };

  const getInStoreClosureError = () => {
    if (inStoreClosedValue && inStoreClosedDateValue && inStoreLiveDateValue) {
      const closedDate = new Date(inStoreClosedDateValue);
      const liveDate = new Date(inStoreLiveDateValue);
      if (!isNaN(closedDate.getTime()) && !isNaN(liveDate.getTime()) && closedDate < liveDate) {
        return 'In-Store Closure Date cannot be earlier than the In-Store Live Date. Please select a valid date.';
      }
    }
    return '';
  };

  const getDeliveryClosureError = () => {
    if (deliveryClosedValue && deliveryClosedDateValue && deliveryLiveDateValue) {
      const closedDate = new Date(deliveryClosedDateValue);
      const liveDate = new Date(deliveryLiveDateValue);
      if (!isNaN(closedDate.getTime()) && !isNaN(liveDate.getTime()) && closedDate < liveDate) {
        return 'Delivery Closure Date cannot be earlier than the Delivery Live Date. Please select a valid date.';
      }
    }
    return '';
  };

  const isClosureFormValid = () => {
    const currentStatusVal = watch('status');
    if (currentStatusVal === 'CLOSED') {
      if (!inStoreClosedValue && !deliveryClosedValue) return false;
      if (inStoreClosedValue && (!inStoreClosedDateValue || !!getInStoreClosureError())) return false;
      if (deliveryClosedValue && (!deliveryClosedDateValue || !!getDeliveryClosureError())) return false;
    }
    return true;
  };

  // Human-readable field labels for the change summary
  const FIELD_LABELS = {
    cafeName: 'Café Name', cafeCode: 'Café Code', cafeModule: 'Café Module',
    pricingVersion: 'Pricing Version', menu: 'Pricing Version',
    indoorSeatingCount: 'Indoor Seating Count', outdoorSeatingCount: 'Outdoor Seating Count',
    totalNoOfTables: 'Total No. of Tables', copyMenuFrom: 'Copy Menu From',
    cafeAddress: 'Address', city: 'City', state: 'State', pinCode: 'Pin Code',
    zone: 'Zone', status: 'Status', cafeLocationGoogleLink: 'Google Maps Link',
    latitude: 'Latitude', latt: 'Latt', long: 'Long',
    cafeOpenTiming: 'Open Timing', cafeClosingTime: 'Closing Time', actualClosingTime: 'Actual Closing Time',
    inStoreClosed: 'In-Store Closed',
    deliveryClosed: 'Delivery Closed',
    inStoreClosedDate: 'In-Store Closed Date',
    deliveryClosedDate: 'Delivery Closed Date',
    gstNo: 'GST No', gstCertificateLink: 'GST Certificate Link',
    fssaiLicense: 'FSSAI License', fssaiNo: 'FSSAI No',
    cafePhoneNumber: 'Café Phone Number', cafeMailId: 'Café Mail ID',
    cafeManagerName: 'Café Manager Name', cafeManagerMailId: 'Café Manager Mail ID',
    cafeManagerContactNo: 'Café Manager Contact No',
    areaManagerName: 'Area Manager Name', areaManagerEmail: 'Area Manager Mail ID',
    areaManagerPhone: 'Area Manager Contact No.',
    cityHeadName: 'City Head Name', cityHeadEmail: 'City Head Mail ID',
    cityHeadPhone: 'City Head Contact No.',
    mailStatus: 'Mail Status',
    blueTokaiSwiggyRID: 'Blue Tokai Swiggy RID', blueTokaiZomatoRID: 'Blue Tokai Zomato RID',
    suchaliSwiggyRID: 'Suchali Swiggy RID', suchaliZomatoRID: 'Suchali Zomato RID',
    gotTeaSwiggyRID: 'Got Tea Swiggy RID', gotTeaZomatoRID: 'Got Tea Zomato RID',
    newPricingCategory: 'New Pricing Category', newPricingSubCategory: 'New Pricing Sub Category',
    cluster: 'Cluster', cafeLaunchMonth: 'Cafe Launch Month & Year', menu: 'Menu', cafeOpeningHr: 'Cafe Opening Hr',
    platformType: 'Platform Type', tradingArea: 'Trading Area', launchStatus: 'Launch Status',
    smokingZone: 'Smoking Zone', parkingOption: 'Parking Option',
    wheelchairAccessibility: 'Wheelchair Accessibility',
    fssaiExpiry: 'FSSAI Expiry', rentExpiry: 'Rent Expiry',
    storeType: 'Store Type',
    launchDate: 'Launch Date',
    petFriendly: 'Pet Friendly',
    projectStartDate: 'Project Start Date',
    projectHandoverDate: 'Project Handover Date',
    tentativeDryLaunchDate: 'Tentative Dry Launch Date',
    highlights: 'Highlights',
    expectedSales: 'Expected Sale',
    nearbyCafes: 'Nearby Cafe',
    cmMailId: 'CM Mail ID',
    gstNo: 'GST No.',
    cafeOpeningHr: 'Cafe Opening Hours',
    areaManagerId: 'Select Area Manager',
    cityHeadId: 'Select City Head',
    expectedSalesVal: 'Expected Sale',
  };

  // Compute changes between stored original and current form data
  const computeChanges = (data) => {
    if (!store) return [];
    const changes = [];
    const skipFields = [
      'id', 'createdAt', 'updatedAt', 'isLocked', 'areaManagerId', 'cityHeadId', 'cafeManagerId',
      'cafeLaunchYear', 'expectedSalesVal', 'expectedSalesUnit'
    ];
    for (const key of Object.keys(data)) {
      if (skipFields.includes(key)) continue;
      
      const oldRaw = store[key];
      const newRaw = data[key];
      
      // Special comparison for latitude (comma-separated helper field)
      if (key === 'latitude') {
        const oldLatVal = store.latt !== null && store.long !== null
          ? `${store.latt},${store.long}`
          : (store.latitude || '');
        const newLatVal = newRaw || '';
        if (oldLatVal.toString().trim() !== newLatVal.toString().trim()) {
          changes.push({
            field: 'Latitude',
            oldValue: oldLatVal || '—',
            newValue: newLatVal || '—',
          });
        }
        continue;
      }

      // Special comparison for cafeLaunchMonth (combines month and year)
      if (key === 'cafeLaunchMonth') {
        const oldMonthVal = (store.cafeLaunchMonth ?? '').toString().trim();
        const newMonthVal = data.cafeLaunchMonth && data.cafeLaunchYear
          ? `${data.cafeLaunchMonth} ${data.cafeLaunchYear}`
          : (data.cafeLaunchMonth || '');
        if (oldMonthVal !== newMonthVal.trim()) {
          changes.push({
            field: 'Cafe Launch Month & Year',
            oldValue: oldMonthVal || '—',
            newValue: newMonthVal || '—',
          });
        }
        continue;
      }
      
      // Special comparison for dates (launchDate, projectStartDate, projectHandoverDate, tentativeDryLaunchDate)
      if (['launchDate', 'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'inStoreClosedDate', 'deliveryClosedDate'].includes(key)) {
        const parseDate = (val) => {
          if (!val) return '';
          try {
            const d = new Date(val);
            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
          } catch {
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
              return val.split('T')[0];
            }
            return '';
          }
        };
        const oldDate = parseDate(oldRaw);
        const newDate = parseDate(newRaw);
        if (oldDate !== newDate) {
          const formatDisplayDate = (dStr) => {
            if (!dStr) return '—';
            const parts = dStr.split('-');
            if (parts.length === 3) {
              const [y, m, d] = parts;
              return `${d}/${m}/${y}`;
            }
            return dStr;
          };
          changes.push({
            field: FIELD_LABELS[key] || key,
            oldValue: formatDisplayDate(oldDate),
            newValue: formatDisplayDate(newDate),
          });
        }
        continue;
      }

      // Special comparison for expectedSales
      if (key === 'expectedSales') {
        const oldSalesVal = store.expectedSales || '';
        const newSalesVal = data.expectedSalesVal
          ? `₹${data.expectedSalesVal} ${data.expectedSalesUnit || 'Lakhs'}`
          : '';
        if (oldSalesVal !== newSalesVal) {
          changes.push({
            field: 'Expected Sale',
            oldValue: oldSalesVal || '—',
            newValue: newSalesVal || '—',
          });
        }
        continue;
      }
      
      const oldVal = (oldRaw ?? '').toString().trim();
      const newVal = (newRaw ?? '').toString().trim();
      if (oldVal !== newVal) {
        changes.push({
          field: FIELD_LABELS[key] || key,
          oldValue: oldVal || '—',
          newValue: newVal || '—',
        });
      }
    }
    return changes;
  };

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
    if (norm === 'UNDER_CONSTRUCTION' || norm === 'UNDER CONSTRUCTION' || norm === 'UNDER CONSTRUCTION') {
      return ['Under Construction'];
    }
    if (norm === 'INCOMPLETE_INFORMATION' || norm === 'INCOMPLETE' || norm === 'INCOMPLETE INFORMATION') {
      return ['Incomplete Information', 'Incomplete', 'INCOMPLETE_INFORMATION'];
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
    if (norm === 'COMPLIANCE_APPROVED' || norm === 'COMPLIANCE APPROVED') {
      return ['Compliance Approved', 'COMPLIANCE_APPROVED'];
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

  const replacePlaceholders = (templateText, store) => {
    if (!templateText) return '';
    const brandNamePretty = store.brand === 'BLUE_TOKAI_SUCHALI' 
      ? "Blue Tokai / Suchali's Artisan Bakehouse" 
      : (store.brand === 'GOT_TEA' ? "Got Tea" : (store.brand || ''));

    return templateText
      .replace(/{cafeName}|\[Store Name\]|\[Cafe Name\]/gi, store.cafeName || '')
      .replace(/{brandName}|\[Brand Name\]|\[Brand\]/gi, brandNamePretty)
      .replace(/{city}|\[City\]/gi, store.city || '')
      .replace(/{state}|\[State\]/gi, store.state || '')
      .replace(/{address}|\[Address\]/gi, store.cafeAddress || store.address || '')
      .replace(/{model}|\[Model\]|\[Cafe Model\]/gi, store.cafeModule || store.cafeModel || '')
      .replace(/{cafeCode}|\[Store Code\]|\[Cafe Code\]/gi, store.cafeCode || '')
      .replace(/{pincode}|\[Pincode\]|\[Pin Code\]/gi, store.pinCode || '');
  };

  const handleSendEmail = async () => {
    const data = pendingDataRef.current;
    if (!data) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Send the email first
      await axios.post(`/api/stores/${id}/send-status-email`, {
        status: draftDialog.status,
        to: draftDialog.to,
        cc: draftDialog.cc,
        subject: draftDialog.subject,
        body: draftDialog.body
      });

      // 2. Save store details
      const payload = {
        ...data,
        cafeLaunchMonth: data.cafeLaunchMonth && data.cafeLaunchYear
          ? `${data.cafeLaunchMonth} ${data.cafeLaunchYear}`
          : data.cafeLaunchMonth || '',
        areaManagerId: data.areaManagerId || null,
        cityHeadId: data.cityHeadId || null,
        cafeManagerId: data.cafeManagerId || null,
        expectedSales: data.expectedSalesVal
          ? `₹${data.expectedSalesVal} ${data.expectedSalesUnit || 'Lakhs'}`
          : null,
        ...(data.status === 'REJECTED' ? { mailStatus: '' } : {})
      };
      delete payload.cafeLaunchYear;
      delete payload.expectedSalesVal;
      delete payload.expectedSalesUnit;
      
      await axios.put(`/api/stores/${id}`, payload);
      isSavedRef.current = true;
      setIsSaved(true);
      setDraftDialog({ open: false, status: '', to: '', cc: '', subject: '', body: '', isEditable: false });
      navigate(fromPath);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to send email and update store.');
    } finally {
      setLoading(false);
      pendingDataRef.current = null;
    }
  };

  const handleDraftCancel = () => {
    setDraftDialog({ open: false, status: '', to: '', cc: '', subject: '', body: '', isEditable: false });
    pendingDataRef.current = null;
  };

  // Step 1: Intercept form submit → compute diffs → show changes dialog
  const onSubmit = (data) => {
    setErrorMsg('');

    // Block status change to PENDING_APPROVAL if any NSO mandatory fields are missing.
    // Users can still save freely when status remains INCOMPLETE_INFORMATION.
    if (data.status === 'PENDING_APPROVAL') {
      const missingNso = nsoMandatoryFields.filter(field => {
        const val = data[field];
        return val === null || val === undefined || String(val).trim() === '';
      });
      if (missingNso.length > 0) {
        const missingLabels = missingNso.map(f => FIELD_LABELS[f] || f);
        setErrorMsg(`These mandatory fields must be filled before submitting for NSO Approval: ${missingLabels.join(', ')}.`);
        return;
      }
    }

    const changes = computeChanges(data);
    if (changes.length === 0) {
      setSuccessMsg('No changes detected.');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }
    pendingDataRef.current = data;
    setPendingChanges(changes);
    setShowChangesDialog(true);
  };

  // Step 2: User reviewed changes → show final Yes/No confirmation
  const handleChangesReviewed = () => {
    setShowChangesDialog(false);
    const data = pendingDataRef.current;
    if (!data) return;

    const isStatusChanged = data.status !== store.status;
    if (isStatusChanged) {
      const config = getMappedConfigForStatus(data.status);
      if (config) {
        const subject = replacePlaceholders(config.template.subject, store);
        const body = replacePlaceholders(config.template.body, store);
        const to = config.mapping.to.join(', ');
        const cc = config.mapping.cc.join(', ');

        setDraftDialog({
          open: true,
          status: data.status,
          to,
          cc,
          subject,
          body,
          isEditable: false
        });
        return;
      }
    }

    const isTransitioningToApproved = (store?.status === 'PENDING_APPROVAL') && data?.status === 'APPROVED';
    if (isTransitioningToApproved) {
      setShowNsoConfirmDialog(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  // Step 3: User confirmed → actually save
  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    const data = pendingDataRef.current;
    if (!data) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        ...data,
        // Combine month + year into single "Month Year" string
        cafeLaunchMonth: data.cafeLaunchMonth && data.cafeLaunchYear
          ? `${data.cafeLaunchMonth} ${data.cafeLaunchYear}`
          : data.cafeLaunchMonth || '',
        areaManagerId: data.areaManagerId || null,
        cityHeadId: data.cityHeadId || null,
        cafeManagerId: data.cafeManagerId || null,
        expectedSales: data.expectedSalesVal
          ? `₹${data.expectedSalesVal} ${data.expectedSalesUnit || 'Lakhs'}`
          : null,
        ...(data.status === 'REJECTED' ? { mailStatus: '' } : {}),
        ...(data.status === 'Under Construction' ? { isLocked: false, isLockedAutoApplied: false } : {})
      };
      delete payload.cafeLaunchYear;
      delete payload.expectedSalesVal;
      delete payload.expectedSalesUnit;
      await axios.put(`/api/stores/${id}`, payload);
      isSavedRef.current = true;
      setIsSaved(true);
      navigate(fromPath);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to update store.');
    } finally {
      setLoading(false);
      pendingDataRef.current = null;
    }
  };

  // Step 3a: User confirmed via NSO Approval dialog → save and trigger email
  const handleConfirmNsoSave = async () => {
    setShowNsoConfirmDialog(false);
    const data = pendingDataRef.current;
    if (!data) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        ...data,
        cafeLaunchMonth: data.cafeLaunchMonth && data.cafeLaunchYear
          ? `${data.cafeLaunchMonth} ${data.cafeLaunchYear}`
          : data.cafeLaunchMonth || '',
        areaManagerId: data.areaManagerId || null,
        cityHeadId: data.cityHeadId || null,
        cafeManagerId: data.cafeManagerId || null,
        expectedSales: data.expectedSalesVal
          ? `₹${data.expectedSalesVal} ${data.expectedSalesUnit || 'Lakhs'}`
          : null,
        ...(data.status === 'REJECTED' ? { mailStatus: '' } : {}),
        ...(data.status === 'Under Construction' ? { isLocked: false, isLockedAutoApplied: false } : {})
      };
      delete payload.cafeLaunchYear;
      delete payload.expectedSalesVal;
      delete payload.expectedSalesUnit;
      await axios.put(`/api/stores/${id}`, payload);
      isSavedRef.current = true;
      setIsSaved(true);
      navigate('/approvals', { state: { successMessage: `${data.cafeName} Café has been approved successfully.` } });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to update store.');
    } finally {
      setLoading(false);
      pendingDataRef.current = null;
    }
  };

  const handleCancelNsoSave = () => {
    setShowNsoConfirmDialog(false);
    pendingDataRef.current = null;
  };

  const handleCancelSave = () => {
    setShowChangesDialog(false);
    setShowConfirmDialog(false);
    setShowNsoConfirmDialog(false);
    pendingDataRef.current = null;
  };

  // Basic fields used only for legacy checks elsewhere
  const mandatoryFields = [
    'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress', 'zone', 
    'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'cafeOpenTiming', 'cafeClosingTime', 
    'actualClosingTime'
  ];

  // All 30 NSO fields — required to enable "Sent to NSO Team for Approval"
  const nsoMandatoryFields = [
    'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress',
    'cafeLocationGoogleLink', 'latitude', 'latt', 'long',
    'cafeOpenTiming', 'cafeClosingTime', 'actualClosingTime',
    'cafePhoneNumber', 'cafeMailId', 'cmMailId', 'areaManagerId', 'cityHeadId',
    'gstNo',
    'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'launchDate',
    'cafeModule', 'cluster', 'platformType', 'tradingArea',
    'smokingZone', 'parkingOption', 'expectedSalesVal', 'nearbyCafes'
  ];

  const watchedFields = watch();

  // isApprovedSelectable: all 30 NSO fields must be filled to enable 'Sent to NSO Team for Approval'
  const isApprovedSelectable = nsoMandatoryFields.every(field => {
    const val = watchedFields[field];
    return val !== null && val !== undefined && String(val).trim() !== '';
  });

  const isLaunchDateFilled = !!(watchedFields['launchDate'] && String(watchedFields['launchDate']).trim() !== '');

  if (!store) {
    if (errorMsg) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', '& .MuiAlert-message': { fontWeight: 700 } }}>
            {errorMsg}
          </Alert>
          <Button variant="outlined" onClick={() => navigate(fromPath)} sx={{ borderRadius: '8px' }}>
            ← Back to List
          </Button>
        </Box>
      );
    }
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  const isNsoFlow = store && ['PENDING_APPROVAL', 'APPROVED', 'NSO_APPROVED', 'ON_HOLD'].includes(store.status);
  // Finance & Legal is read-only for ALL users in NSO flow or Upcoming (INCOMPLETE_INFORMATION) flow
  const isFinanceReadOnly = isNsoFlow || (store?.status === 'INCOMPLETE_INFORMATION');
  const isComplianceApprovedOrLive = store && ['COMPLIANCE_APPROVED', 'LIVE'].includes(store.status);

  const baseOptions = isSuperAdmin 
    ? [
        { value: 'INCOMPLETE_INFORMATION', label: 'Incomplete Information' },
        { value: 'PENDING_APPROVAL', label: 'Approval Pending', disabled: !isApprovedSelectable },
        { value: 'APPROVED', label: 'Approved', disabled: !isApprovedSelectable || !isLaunchDateFilled },
        { value: 'ON_HOLD', label: 'On Hold' },
        { value: 'COMPLIANCE_APPROVED', label: 'Compliance Approved' },
        ...(isComplianceApprovedOrLive ? [{ value: 'LIVE', label: 'Live' }] : []),
        { value: 'CLOSED', label: 'Closed' }
      ]
    : isComplianceApprovedOrLive
      ? [
          { value: 'COMPLIANCE_APPROVED', label: 'Compliance Approved' },
          ...((hasGoLiveAccess || store?.status === 'LIVE') ? [{ value: 'LIVE', label: 'Live' }] : [])
        ]
      : isNsoFlow 
        ? [
            { value: 'INCOMPLETE_INFORMATION', label: 'Incomplete Information' },
            { value: 'PENDING_APPROVAL', label: 'Approval Pending', disabled: !isApprovedSelectable },
            ...(canApprove ? [
              { value: 'APPROVED', label: 'Approved', disabled: !isApprovedSelectable || !isLaunchDateFilled },
              { value: 'ON_HOLD', label: 'On Hold' }
            ] : [])
          ]
        : [
            { value: 'INCOMPLETE_INFORMATION', label: 'Incomplete Information' },
            { value: 'PENDING_APPROVAL', label: 'Sent to NSO Team for Approval', disabled: !isApprovedSelectable }
          ];

  let statusOptions = [...baseOptions];
  if (!isSuperAdmin && store?.status === 'CLOSED') {
    if (!statusOptions.some(opt => opt.value === 'CLOSED')) {
      statusOptions.push({ value: 'CLOSED', label: 'Closed' });
    }
  }

  if (['Ready for Construction', 'Under Construction'].includes(store?.status)) {
    if (!statusOptions.some(opt => opt.value === 'Ready for Construction')) {
      statusOptions.push({ value: 'Ready for Construction', label: 'Ready for Construction' });
    }
    if (!statusOptions.some(opt => opt.value === 'Under Construction')) {
      statusOptions.push({ 
        value: 'Under Construction', 
        label: 'Under Construction',
        disabled: store?.status === 'Ready for Construction' && !hasUpcomingEditor
      });
    }
  }

  if (store?.status === 'Under Construction') {
    statusOptions = statusOptions.filter(opt => !['INCOMPLETE_INFORMATION', 'Ready for Construction'].includes(opt.value));
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', py: 2, px: 1 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{
          position: 'sticky',
          top: { xs: 56, sm: 64 },
          zIndex: 10,
          bgcolor: 'background.default',
          mt: -5,
          pt: 5,
          pb: 2,
          mb: 4,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                {isViewOnly ? `Store Details: ${store.cafeName}` : `Modify Existing Store: ${store.cafeName}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update store information based on your access level.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Brand field — locked for all except Super Admin */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  select
                  size="small"
                  label="Brand *"
                  {...register('brand', { required: 'Brand is required' })}
                  value={watch('brand') || ''}
                  error={!!errors.brand}
                  disabled={isViewOnly || !isSuperAdmin}
                  sx={{ minWidth: 280 }}
                >
                  <MenuItem value="">— Clear Selection —</MenuItem>
                  <MenuItem value="BLUE_TOKAI_SUCHALI">Blue Tokai / Suchali's Artisan Bakehouse</MenuItem>
                  <MenuItem value="GOT_TEA">Got Tea</MenuItem>
                </TextField>
              </Box>

              <TextField
                select
                size="small"
                label="Status"
                {...register('status')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CLOSED') {
                    setTempInStoreClosed(watch('inStoreClosed') ?? store?.inStoreClosed ?? false);
                    setTempDeliveryClosed(watch('deliveryClosed') ?? store?.deliveryClosed ?? false);
                    setTempInStoreClosedDate(watch('inStoreClosedDate') ?? safeGetDateString(store?.inStoreClosedDate) ?? '');
                    setTempDeliveryClosedDate(watch('deliveryClosedDate') ?? safeGetDateString(store?.deliveryClosedDate) ?? '');
                    setClosureDialogError('');
                    setClosureDialogOpen(true);
                  } else if (store?.status === 'Ready for Construction' && val === 'Under Construction') {
                    setUcDialogStore(store);
                    setUcDialogOpen(true);
                  } else {
                    setValue('status', val, { shouldDirty: true });
                    setPrevStatus(val);
                  }
                }}
                value={watch('status') || ''}
                disabled={
                  isViewOnly || 
                  (store && store.isLocked && !isSuperAdmin) || 
                  (() => {
                    if (store && ['COMPLIANCE_APPROVED', 'LIVE'].includes(store.status)) {
                      return !hasGoLiveAccess;
                    }
                    if (store?.status === 'Ready for Construction') {
                      return !(isSuperAdmin || isAdmin || hasEditStores);
                    }
                    if (!isSuperAdmin && !isAdmin && !canEditBasicDetails) return true;
                    if (store && store.status !== 'INCOMPLETE_INFORMATION' && !isSuperAdmin && !user?.permissions?.includes('APPROVER')) return true;
                    return false;
                  })()
                }
                sx={{ minWidth: 160 }}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
              {/* Approved By - read-only display */}
              {(store?.approvedBy || store?.complianceApprovedBy) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {store?.approvedBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Approved By:
                      </Typography>
                      <Chip
                        label={store.approvedBy}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: '6px' }}
                      />
                    </Box>
                  )}
                  {store?.complianceApprovedBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Compliance By:
                      </Typography>
                      <Chip
                        label={store.complianceApprovedBy}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: '6px' }}
                      />
                    </Box>
                  )}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate(fromPath)} sx={{ px: 3, borderRadius: '8px' }}>
                  &larr; Back to List
                </Button>
              </Box>
            </Box>
          </Box>

          {/* ─── CARD: Remarks (Sticky) ─── */}
          <Card sx={{ bgcolor: 'background.paper', opacity: canEditBasicDetails ? 1 : 0.8, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', mb: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Remarks / Special Instructions
                </Typography>
                {watch('status') === 'ON_HOLD' ? <RequiredBadge /> : <OptionalBadge />}
                {!canEditBasicDetails && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={3}
                label={watch('status') === 'ON_HOLD' ? "Remarks *" : "Remarks"}
                placeholder={watch('status') === 'ON_HOLD' ? "Enter the reason for placing the cafe on hold..." : "Enter any operational remarks, constraints, or special instructions according to the requirement..."}
                {...register('remarks', { required: watch('status') === 'ON_HOLD' ? 'Required' : false })}
                error={!!errors.remarks}
                helperText={errors.remarks?.message}
                disabled={!canEditBasicDetails}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Horizontal Tabs */}
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
              const errCount = getTabErrorCount(tab, watchedFields);
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

        {isViewOnly && (
          <Alert
            severity="info"
            sx={{
              mb: 4,
              borderRadius: '12px',
              fontWeight: 700,
              '& .MuiAlert-message': { fontWeight: 700 }
            }}
          >
            You have <strong>view-only access</strong> to this store. All fields are read-only and no changes can be saved.
          </Alert>
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
        {successMsg && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 4, 
              borderRadius: '12px'
            }}
          >
            {successMsg}
          </Alert>
        )}
        {!isApprovedSelectable && !isViewOnly && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 4, 
              borderRadius: '12px',
              '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
            }}
          >
            To enable the <strong>"Sent to NSO Team for Approval"</strong> action, please complete all mandatory fields:{' '}
            <strong>
              {nsoMandatoryFields.filter(f => {
                const val = watch(f);
                return val === null || val === undefined || String(val).trim() === '';
              }).map(f => FIELD_LABELS[f] || f).join(', ')}
            </strong>
          </Alert>
        )}
        {canApprove && isApprovedSelectable && !isLaunchDateFilled && !isViewOnly && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 4, 
              borderRadius: '12px',
              '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
            }}
          >
            <strong>Launch Date</strong> is required to select the <strong>"Approved"</strong> status.
          </Alert>
        )}

        <Grid container spacing={4}>
          
          {/* Go-Live Configuration Card */}
          {isGoLiveVisible && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditGoLive ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Go-Live Configuration
                    </Typography>
                    {!canEditGoLive && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              {...(canEditGoLive ? register('inStoreLive') : {})}
                              checked={inStoreLiveValue || false}
                              disabled={!canEditGoLive}
                              onChange={(e) => {
                                if (canEditGoLive) {
                                  setValue('inStoreLive', e.target.checked, { shouldDirty: true });
                                  if (!e.target.checked) {
                                    setValue('inStoreLiveDate', '', { shouldDirty: true });
                                  }
                                }
                              }}
                            />
                          }
                          label={<span style={{ fontWeight: 600 }}>In-Store Go-Live</span>}
                        />
                        {inStoreLiveValue && (
                          <TextField
                            fullWidth
                            type="date"
                            label="In-Store Live Date *"
                            InputLabelProps={{ shrink: true }}
                            {...(canEditGoLive ? register('inStoreLiveDate', { 
                              required: inStoreLiveValue ? 'Required when In-Store is enabled' : false 
                            }) : {})}
                            value={canEditGoLive ? undefined : safeGetDateString(store?.inStoreLiveDate)}
                            error={canEditGoLive ? !!errors.inStoreLiveDate : false}
                            helperText={canEditGoLive ? errors.inStoreLiveDate?.message : ''}
                            disabled={!canEditGoLive}
                          />
                        )}
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              {...(canEditGoLive ? register('deliveryLive') : {})}
                              checked={deliveryLiveValue || false}
                              disabled={!canEditGoLive}
                              onChange={(e) => {
                                if (canEditGoLive) {
                                  setValue('deliveryLive', e.target.checked, { shouldDirty: true });
                                  if (!e.target.checked) {
                                    setValue('deliveryLiveDate', '', { shouldDirty: true });
                                  }
                                }
                              }}
                            />
                          }
                          label={<span style={{ fontWeight: 600 }}>Delivery Go-Live</span>}
                        />
                        {deliveryLiveValue && (
                          <TextField
                            fullWidth
                            type="date"
                            label="Delivery Live Date *"
                            InputLabelProps={{ shrink: true }}
                            {...(canEditGoLive ? register('deliveryLiveDate', { 
                              required: deliveryLiveValue ? 'Required when Delivery is enabled' : false 
                            }) : {})}
                            value={canEditGoLive ? undefined : safeGetDateString(store?.deliveryLiveDate)}
                            error={canEditGoLive ? !!errors.deliveryLiveDate : false}
                            helperText={canEditGoLive ? errors.deliveryLiveDate?.message : ''}
                            disabled={!canEditGoLive}
                          />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Closure Configuration Card */}
          {isClosedVisible && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditClosure ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Closure Configuration
                    </Typography>
                    {!canEditClosure && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={inStoreClosedValue || false}
                              disabled={!canEditClosure}
                              onChange={(e) => {
                                if (canEditClosure) {
                                  setValue('inStoreClosed', e.target.checked, { shouldDirty: true });
                                  if (!e.target.checked) {
                                    setValue('inStoreClosedDate', '', { shouldDirty: true });
                                  }
                                }
                              }}
                            />
                          }
                          label={<span style={{ fontWeight: 600 }}>In-Store Closed</span>}
                        />
                        {inStoreClosedValue && (
                          <>
                            <TextField
                              fullWidth
                              label="In-Store Live Date (Read Only)"
                              value={formatDateString(inStoreLiveDateValue)}
                              disabled
                              InputProps={{ readOnly: true }}
                              sx={{ mb: 2 }}
                            />
                            <TextField
                              fullWidth
                              type="date"
                              label="In-Store Closed Date *"
                              InputLabelProps={{ shrink: true }}
                              inputProps={{ min: inStoreLiveDateValue }}
                              value={inStoreClosedDateValue || ''}
                              onChange={(e) => {
                                if (canEditClosure) {
                                    setValue('inStoreClosedDate', e.target.value, { shouldDirty: true, shouldValidate: true });
                                }
                              }}
                              error={!!getInStoreClosureError()}
                              helperText={getInStoreClosureError()}
                              disabled={!canEditClosure}
                            />
                          </>
                        )}
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={deliveryClosedValue || false}
                              disabled={!canEditClosure}
                              onChange={(e) => {
                                if (canEditClosure) {
                                  setValue('deliveryClosed', e.target.checked, { shouldDirty: true });
                                  if (!e.target.checked) {
                                    setValue('deliveryClosedDate', '', { shouldDirty: true });
                                  }
                                }
                              }}
                            />
                          }
                          label={<span style={{ fontWeight: 600 }}>Delivery Closed</span>}
                        />
                        {deliveryClosedValue && (
                          <>
                            <TextField
                              fullWidth
                              label="Delivery Live Date (Read Only)"
                              value={formatDateString(deliveryLiveDateValue)}
                              disabled
                              InputProps={{ readOnly: true }}
                              sx={{ mb: 2 }}
                            />
                            <TextField
                              fullWidth
                              type="date"
                              label="Delivery Closed Date *"
                              InputLabelProps={{ shrink: true }}
                              inputProps={{ min: deliveryLiveDateValue }}
                              value={deliveryClosedDateValue || ''}
                              onChange={(e) => {
                                if (canEditClosure) {
                                    setValue('deliveryClosedDate', e.target.value, { shouldDirty: true, shouldValidate: true });
                                }
                              }}
                              error={!!getDeliveryClosureError()}
                              helperText={getDeliveryClosureError()}
                              disabled={!canEditClosure}
                            />
                          </>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {activeTab === 'Cafe Basic Details' && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditBasicDetails ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Café Basic Details
                    </Typography>
                    {!canEditBasicDetails && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>
                  
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="Café Name **" 
                        {...register('cafeName', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.cafeName}
                        helperText={errors.cafeName?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="Café Code **" 
                        {...register('cafeCode', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.cafeCode}
                        helperText={errors.cafeCode?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        label="Pin Code **" 
                        {...register('pinCode', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.pinCode}
                        helperText={errors.pinCode?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        label="City **" 
                        {...register('city')} 
                        value={watch('city') || ''}
                        InputProps={{ readOnly: true }}
                        InputLabelProps={{ shrink: !!watch('city') }}
                        disabled={true} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        label="State **" 
                        {...register('state')} 
                        value={watch('state') || ''}
                        InputProps={{ readOnly: true }}
                        InputLabelProps={{ shrink: !!watch('state') }}
                        disabled={true} 
                      />
                    </Grid>
                    
                    <Grid size={12}>
                      <TextField 
                        fullWidth 
                        label="Café Address **" 
                        {...register('cafeAddress', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.cafeAddress}
                        helperText={errors.cafeAddress?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField 
                        fullWidth 
                        select 
                        label="Zone **" 
                        {...register('zone', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.zone}
                        value={watch('zone') || ''}
                        disabled={!canEditBasicDetails}
                      >
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {ZONES.map(z => (
                          <MenuItem key={z} value={z}>{z}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="Café Location Google Link **" 
                        placeholder="e.g. https://maps.google.com/..." 
                        {...register('cafeLocationGoogleLink', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.cafeLocationGoogleLink}
                        helperText={errors.cafeLocationGoogleLink?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Lat, Long **"
                        placeholder="e.g. 28.6139, 77.2090"
                        {...register('latitude', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })}
                        error={!!errors.latitude}
                        disabled={!canEditBasicDetails}
                        helperText={errors.latitude?.message || "Latitude, Longitude"}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Latitude **"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ readOnly: true }}
                        {...register('latt', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })}
                        error={!!errors.latt}
                        helperText={errors.latt?.message || "Auto-filled"}
                        disabled={!canEditBasicDetails}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField
                        fullWidth
                        label="Longitude **"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ readOnly: true }}
                        {...register('long', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })}
                        error={!!errors.long}
                        helperText={errors.long?.message || "Auto-filled"}
                        disabled={!canEditBasicDetails}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                      />
                    </Grid>
   
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Café Opening Time **" 
                        {...register('cafeOpenTiming', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.cafeOpenTiming}
                        helperText={errors.cafeOpenTiming?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Café Closing Time **" 
                        {...register('cafeClosingTime', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.cafeClosingTime}
                        helperText={errors.cafeClosingTime?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Actual Closing Time **" 
                        {...register('actualClosingTime', { required: watch('status') !== 'INCOMPLETE_INFORMATION' ? 'Required' : false })} 
                        error={!!errors.actualClosingTime}
                        helperText={errors.actualClosingTime?.message}
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Contact Details */}
          {activeTab === 'Contact Details' && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditContacts ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Contact Details
                    </Typography>
                    {!canEditContacts && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
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
                        disabled={!canEditContacts} 
                        error={!!errors.cafePhoneNumber}
                        helperText={errors.cafePhoneNumber?.message}
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
                        disabled={!isSuperAdmin && !isAdmin} 
                        error={!!errors.cafeMailId}
                        helperText={errors.cafeMailId?.message}
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
                        disabled={!isSuperAdmin && !isAdmin} 
                        error={!!errors.cmMailId}
                        helperText={errors.cmMailId?.message}
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? '#f8fafc' : 'inherit' } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? '#f8fafc' : 'inherit' } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? '#f8fafc' : 'inherit' } }}
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
                          <TextField {...params} label="Select City Head" />
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? '#f8fafc' : 'inherit' } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: (!isSuperAdmin && !isAdmin) ? '#f8fafc' : 'inherit' } }}
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

          {/* GST & FSSAI Details */}
          {activeTab === 'GST & FSSAI Details' && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditBasicDetails ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      GST & FSSAI Details
                    </Typography>
                    <OptionalBadge />
                    {!canEditBasicDetails && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="GST No" 
                        {...register('gstNo')} 
                        error={!!errors.gstNo} 
                        helperText={errors.gstNo?.message} 
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="GST Certificate Link" 
                        placeholder="e.g. http://..." 
                        {...register('gstCertificateLink')} 
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="FSSAI License (Certificate Link)" 
                        placeholder="e.g. http://..." 
                        {...register('fssaiLicense')} 
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField 
                        fullWidth 
                        label="FSSAI No" 
                        {...register('fssaiNo')} 
                        error={!!errors.fssaiNo} 
                        helperText={errors.fssaiNo?.message} 
                        disabled={!canEditBasicDetails} 
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Finance Information */}
          {activeTab === 'GST & FSSAI Details' && (canEditFinance || isFinanceReadOnly || isSuperAdmin || isAdmin || isManager) && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: (canEditFinance && !isFinanceReadOnly) ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Finance & Legal Expiries
                    </Typography>
                    <Chip label="Read Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth type="date" label="FSSAI License Expiry Date" InputLabelProps={{ shrink: true }} {...register('fssaiExpiry')} error={!!errors.fssaiExpiry} helperText={errors.fssaiExpiry?.message} disabled={true} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth type="date" label="Rent Agreement Expiry Date" InputLabelProps={{ shrink: true }} {...register('rentExpiry')} error={!!errors.rentExpiry} helperText={errors.rentExpiry?.message} disabled={true} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* ─── CARD 4: Operations Details ─── */}
          {activeTab === 'Operations Details' && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditBasicDetails ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Operations Details
                    </Typography>
                    <OptionalBadge />
                    {!canEditBasicDetails && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Project Start Date" InputLabelProps={{ shrink: true }} {...register('projectStartDate')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Project Handover Date" InputLabelProps={{ shrink: true }} {...register('projectHandoverDate')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Tentative Dry Launch Date" InputLabelProps={{ shrink: true }} {...register('tentativeDryLaunchDate')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      {isSuperAdmin || isAdmin ? (
                        <>
                          <TextField
                            fullWidth
                            select
                            label="Cafe Launch Month & Year"
                            disabled={!canEditBasicDetails}
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
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
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
                        {...register('launchDate', { required: ['APPROVED', 'NSO_APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(watch('status')) ? 'Launch Date is required for approval' : false })} 
                        error={!!errors.launchDate} 
                        helperText={errors.launchDate?.message} 
                        disabled={!canEditBasicDetails} 
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
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditBasicDetails ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Others
                    </Typography>
                    <OptionalBadge />
                    {!canEditBasicDetails && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="New Pricing Category" {...register('newPricingCategory')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="New Pricing Sub Category" {...register('newPricingSubCategory')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="Cluster" placeholder="e.g. South Delhi" {...register('cluster')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        select 
                        label="Café Module" 
                        {...register('cafeModule')} 
                        error={!!errors.cafeModule} 
                        helperText={errors.cafeModule?.message} 
                        disabled={!canEditBasicDetails}
                        value={watch('cafeModule') || ''}
                      >
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {CAFE_MODELS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        select 
                        label="Pricing Version" 
                        {...register('pricingVersion')} 
                        disabled={!canEditBasicDetails}
                        value={watch('pricingVersion') || ''}
                        SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}
                      >
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {MENU_OPTIONS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
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
                        disabled={!canEditBasicDetails}
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
                        disabled={!canEditBasicDetails}
                        value={watch('outdoorSeatingCount') || ''}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Total No. of Tables" 
                        {...register('totalNoOfTables', {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/[^0-9]/g, '');
                          }
                        })} 
                        disabled={!canEditBasicDetails}
                        value={watch('totalNoOfTables') || ''}
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
                        disabled={!canEditBasicDetails}
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
                        label="Latitude (Read-only)" 
                        value={watch('latt') || ''} 
                        InputProps={{ readOnly: true }} 
                        sx={{ bgcolor: '#f8fafc' }} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Longitude (Read-only)" 
                        value={watch('long') || ''} 
                        InputProps={{ readOnly: true }} 
                        sx={{ bgcolor: '#f8fafc' }} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Area Manager Mail ID (Read-only)" 
                        value={watch('areaManagerEmail') || ''} 
                        InputProps={{ readOnly: true }} 
                        sx={{ bgcolor: '#f8fafc' }} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="Area Manager Contact Number (Read-only)" 
                        value={watch('areaManagerPhone') || ''} 
                        InputProps={{ readOnly: true }} 
                        sx={{ bgcolor: '#f8fafc' }} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="City Head Mail ID (Read-only)" 
                        value={watch('cityHeadEmail') || ''} 
                        InputProps={{ readOnly: true }} 
                        sx={{ bgcolor: '#f8fafc' }} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField 
                        fullWidth 
                        label="City Head Contact Number (Read-only)" 
                        value={watch('cityHeadPhone') || ''} 
                        InputProps={{ readOnly: true }} 
                        sx={{ bgcolor: '#f8fafc' }} 
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="Cafe Opening Hr" placeholder="e.g. 15 hours" {...register('cafeOpeningHr')} disabled={!canEditBasicDetails} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Platform Type" {...register('platformType')} error={!!errors.platformType} helperText={errors.platformType?.message} disabled={!canEditBasicDetails} value={watch('platformType') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {PLATFORM_TYPES.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Trading Area" {...register('tradingArea')} error={!!errors.tradingArea} helperText={errors.tradingArea?.message} disabled={!canEditBasicDetails} value={watch('tradingArea') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        {TRADING_AREAS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Smoking Zone" {...register('smokingZone')} disabled={!canEditBasicDetails} value={watch('smokingZone') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Parking Option" {...register('parkingOption')} disabled={!canEditBasicDetails} value={watch('parkingOption') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                        <MenuItem value="Valet">Valet</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Wheelchair accessibility" {...register('wheelchairAccessibility')} disabled={!canEditBasicDetails} value={watch('wheelchairAccessibility') || ''}>
                        <MenuItem value="">— Clear Selection —</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Pet Friendly" {...register('petFriendly')} disabled={!canEditBasicDetails} value={watch('petFriendly') || ''}>
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
                        helperText={errors.expectedSalesVal?.message}
                        disabled={!canEditBasicDetails}
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
                                disabled={!canEditBasicDetails}
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
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth label="Nearby Cafe" placeholder="Enter nearby cafe details..." {...register('nearbyCafes')} disabled={!canEditBasicDetails} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 12 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Highlights"
                        placeholder="Enter highlights of the cafe..."
                        {...register('highlights')}
                        disabled={!canEditBasicDetails}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Swiggy / Zomato Integration Status (Conditional on Brand) */}
          {activeTab === 'Swiggy / Zomato Integration' && watch('brand') && (
            <Grid size={12}>
              <Card sx={{ bgcolor: 'background.paper', opacity: canEditBasicDetails ? 1 : 0.8 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Swiggy / Zomato Integration Status
                    </Typography>
                    <Chip label="Optional" size="small" sx={{
                      ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700,
                      bgcolor: 'rgba(52, 211, 153, 0.1)', color: '#34d399',
                      border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '4px'
                    }} />
                    {!canEditBasicDetails && <Chip label="View Only" size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}
                  </Box>

                  {watch('brand') === 'BLUE_TOKAI_SUCHALI' && (
                    <Grid container spacing={2} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Blue Tokai Swiggy RID" {...register('blueTokaiSwiggyRID')} disabled={!canEditBasicDetails} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Blue Tokai Zomato RID" {...register('blueTokaiZomatoRID')} disabled={!canEditBasicDetails} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Suchali Swiggy RID" {...register('suchaliSwiggyRID')} disabled={!canEditBasicDetails} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Suchali Zomato RID" {...register('suchaliZomatoRID')} disabled={!canEditBasicDetails} />
                      </Grid>
                    </Grid>
                  )}

                  {watch('brand') === 'GOT_TEA' && (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Got Tea Swiggy RID" {...register('gotTeaSwiggyRID')} disabled={!canEditBasicDetails} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Got Tea Zomato RID" {...register('gotTeaZomatoRID')} disabled={!canEditBasicDetails} />
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid size={12}>
            <Card sx={{ bgcolor: 'background.paper', border: 'none' }}>
              <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                {!isViewOnly && (
                  <Button 
                    variant="contained" 
                    size="large" 
                    type="submit" 
                    disabled={loading || (!canEditBasicDetails && !canEditContacts && !canEditFinance && !canEditGoLive && !canEditClosure) || !isGoLiveFormValid() || !isClosureFormValid()} 
                    sx={{ px: 4, borderRadius: '8px' }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      </form>

      {/* Dialog 1: Review Changes (Old vs New) */}
      <Dialog 
        open={showChangesDialog} 
        onClose={handleCancelSave} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary', pb: 1 }}>
          Review Your Changes
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            The following fields have been modified. Please review before confirming.
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Old Value</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>New Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingChanges.map((change, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{change.field}</TableCell>
                    <TableCell sx={{ color: '#b71c1c', fontWeight: 500 }}>{change.oldValue}</TableCell>
                    <TableCell sx={{ color: '#1b5e20', fontWeight: 500 }}>{change.newValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancelSave} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleChangesReviewed} variant="contained" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Final Yes / No Confirmation */}
      <Dialog 
        open={showConfirmDialog} 
        onClose={handleCancelSave}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 360 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'text.primary' }}>
          Confirm Save
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Are you sure you want to save these changes?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancelSave} variant="outlined" color="error" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            No
          </Button>
          <Button onClick={handleConfirmSave} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2a: NSO Approval confirmation pop-up */}
      <Dialog 
        open={showNsoConfirmDialog} 
        onClose={handleCancelNsoSave}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary' }}>
          Confirm Approval Notification
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
            Do you want to send the email notification for this NSO-approved café?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleCancelNsoSave} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Back
          </Button>
          <Button onClick={handleConfirmNsoSave} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            OK
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
            You have unsaved changes. Do you want to discard your changes or do you want to continue with this?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => blocker.reset()} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Continue with this
          </Button>
          <Button onClick={() => blocker.proceed()} variant="outlined" color="error" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Discard changes
          </Button>
        </DialogActions>
      </Dialog>

      
      {/* Dialog: Under Construction Operation Details */}
      <Dialog
        open={ucDialogOpen}
        onClose={handleCancelUc}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
          Operation Details
        </DialogTitle>
        <DialogContent sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ucDialogError && (
            <Alert severity="error" sx={{ borderRadius: '8px' }}>
              {ucDialogError}
            </Alert>
          )}
          <TextField
            fullWidth type="date" label="Project Start Date" InputLabelProps={{ shrink: true }}
            value={ucStartDate} onChange={(e) => setUcStartDate(e.target.value)}
          />
          <TextField
            fullWidth type="date" label="Project Handover Date *" InputLabelProps={{ shrink: true }}
            value={ucHandoverDate} onChange={handleUcHandoverChange} required
          />
          <TextField
            fullWidth type="date" label="Tentative Dry Launch Date" InputLabelProps={{ shrink: true }}
            value={ucDryLaunchDate} onChange={(e) => setUcDryLaunchDate(e.target.value)}
          />
          <TextField
            fullWidth type="date" label="Launch Date *" InputLabelProps={{ shrink: true }}
            value={ucLaunchDate} onChange={handleUcLaunchChange} required
          />
          <TextField
            fullWidth label="Cafe Launch Month & Year" InputProps={{ readOnly: true }}
            value={ucLaunchMonth}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleCancelUc} color="inherit" sx={{ fontWeight: 600, borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUc} variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: '8px', px: 3, boxShadow: 2 }}>
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 4: Closure Configuration */}
      <Dialog
        open={closureDialogOpen}
        onClose={handleCancelClosure}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary', pb: 1 }}>
          Closure Configuration
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          {closureDialogError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontWeight: 600 }}>
              {closureDialogError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Please configure the closure details for this café.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={tempInStoreClosed}
                    onChange={(e) => {
                      setTempInStoreClosed(e.target.checked);
                      if (!e.target.checked) setTempInStoreClosedDate('');
                    }}
                  />
                }
                label={<span style={{ fontWeight: 600 }}>In-Store Closed</span>}
              />
              {tempInStoreClosed && (
                <>
                  <TextField
                    fullWidth
                    label="In-Store Live Date (Read Only)"
                    value={formatDateString(inStoreLiveDateValue)}
                    disabled
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    label="In-Store Closed Date *"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: inStoreLiveDateValue }}
                    value={tempInStoreClosedDate}
                    onChange={(e) => setTempInStoreClosedDate(e.target.value)}
                  />
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={tempDeliveryClosed}
                    onChange={(e) => {
                      setTempDeliveryClosed(e.target.checked);
                      if (!e.target.checked) setTempDeliveryClosedDate('');
                    }}
                  />
                }
                label={<span style={{ fontWeight: 600 }}>Delivery Closed</span>}
              />
              {tempDeliveryClosed && (
                <>
                  <TextField
                    fullWidth
                    label="Delivery Live Date (Read Only)"
                    value={formatDateString(deliveryLiveDateValue)}
                    disabled
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    label="Delivery Closed Date *"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: deliveryLiveDateValue }}
                    value={tempDeliveryClosedDate}
                    onChange={(e) => setTempDeliveryClosedDate(e.target.value)}
                  />
                </>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancelClosure} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmClosure} variant="contained" color="primary" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Confirm
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
              Status: {draftDialog.status} — {store?.cafeName}
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

          </Box>
  );
}
