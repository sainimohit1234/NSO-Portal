import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack, 
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Chip, useTheme, CardHeader, Divider, List, ListItem, ListItemText,
  IconButton, Alert, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';
import { fetchStoresFromFirestore } from '../services/storeService';

export default function AggregatorMail() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageEmailDirectory = isSuperAdmin || user?.permissions?.split(',').includes('EMAIL_DIRECTORY');

  const [stores, setStores] = useState([]);
  const [mailFilter, setMailFilter] = useState('pending');
  const [selectedStore, setSelectedStore] = useState(null);
  const [aggregator, setAggregator] = useState('swiggy_blue_tokai');

  // Configured recipient categories loaded from backend
  const [categories, setCategories] = useState([]);
  const [newEmailInputs, setNewEmailInputs] = useState({});

  // Auto Mail configuration state
  const [newAutoEmailInput, setNewAutoEmailInput] = useState('');
  const [newAutoCcEmailInput, setNewAutoCcEmailInput] = useState('');
  const [editingAutoCat, setEditingAutoCat] = useState(null); // 'auto_mails' or 'auto_mails_cc'
  const [editingAutoIndex, setEditingAutoIndex] = useState(null);
  const [editingAutoValue, setEditingAutoValue] = useState('');
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const filteredStores = stores.filter(store => {
    const isSent = store.mailStatus === 'Sent';
    const isMailCreated = store.mailStatus === 'Mail Created';
    
    if (mailFilter === 'sent') return isSent;
    if (mailFilter === 'drafted') return isMailCreated;
    if (mailFilter === 'pending') return !isSent && !isMailCreated;
    return true;
  });

  
  // Mail composer fields
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [swiggyTableRows, setSwiggyTableRows] = useState([]);
  const [smtpConfirmOpen, setSmtpConfirmOpen] = useState(false);
  const [popTo, setPopTo] = useState('');
  const [popCc, setPopCc] = useState('');
  const [popSubject, setPopSubject] = useState('');
  const [popBody, setPopBody] = useState('');
  const [popErrors, setPopErrors] = useState({});
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const theme = useTheme();

  const fetchStores = () => {
    fetchStoresFromFirestore()
      .then(stores => {
        // Filter: COMPLIANCE_APPROVED or LIVE
        const filtered = stores.filter(s => s.status === 'COMPLIANCE_APPROVED' || s.status === 'LIVE');
        setStores(filtered);
      })
      .catch(async err => {
        console.error('Failed to load stores from Firestore, falling back to API:', err);
        try {
          const res = await axios.get('/api/stores');
          const stores = normalizeListResponse(res.data, ['stores', 'data', 'items']);
          const filtered = stores.filter(s => s.status === 'COMPLIANCE_APPROVED' || s.status === 'LIVE');
          setStores(filtered);
        } catch (apiError) {
          console.error(apiError);
        }
      });
  };

  const fetchRecipients = () => {
    axios.get('/api/system/email-recipients')
      .then(res => {
        setCategories(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch email recipients:', err);
        // Fallback default mappings
        setCategories([
          { id: 'swiggy', name: 'Swiggy', type: 'to', emails: ['rahul.mukhi@swiggy.in', 'shaik.ansar@swiggy.in', 'premiumvm@swiggy.in'] },
          { id: 'zomato', name: 'Zomato', type: 'to', emails: ['kriti.lahoty@zomato.com', 'ananya.roy@zomato.com', 'ananya.bawa@zomato.com'] },
          { id: 'others', name: 'Others', type: 'to', emails: [] },
          { id: 'cc', name: 'CC Email IDs (Applicable for Both Templates)', type: 'cc', emails: ['centraloperations@bluetokaicoffee.com', 'Anushree@bluetokaicoffee.com', 'akash.t@bluetokaicoffee.com'] },
          { id: 'auto_mails', name: 'Mail IDs for Auto Mails (TO)', type: 'to', emails: [] },
          { id: 'auto_mails_cc', name: 'Mail IDs for Auto Mails (CC)', type: 'cc', emails: [] }
        ]);
      });
  };

  useEffect(() => {
    fetchStores();
    fetchRecipients();
  }, []);

    // Update mail template when store, aggregator, or configured emails change
  useEffect(() => {
    if (!selectedStore) return;

    const brandNames = {
      BLUE_TOKAI_SUCHALI: "Blue Tokai / Suchali's Artisan Bakehouse",
      GOT_TEA: "Got Tea"
    };
    const brandName = brandNames[selectedStore.brand] || selectedStore.brand || 'N/A';

    const swiggyEmailsList = categories.find(c => c.id === 'swiggy')?.emails || [];
    const zomatoEmailsList = categories.find(c => c.id === 'zomato')?.emails || [];
    const othersEmailsList = categories.find(c => c.id === 'others')?.emails || [];
    const ccEmailsList = categories.find(c => c.id === 'cc')?.emails || [];

    const isSwiggy = aggregator.startsWith('swiggy');
    const isZomato = aggregator.startsWith('zomato');
    
    let recipientsTo = '';
    if (isSwiggy) recipientsTo = swiggyEmailsList.join(', ');
    else if (isZomato) recipientsTo = zomatoEmailsList.join(', ');
    else recipientsTo = othersEmailsList.join(', ');

    const recipientsCc = ccEmailsList.join(', ');

    setTo(recipientsTo);
    setCc(recipientsCc);

    const filterNames = {
      swiggy_blue_tokai: 'Swiggy <> Blue Tokai Coffee Roasters',
      zomato_blue_tokai: 'Zomato <> Blue Tokai Coffee Roasters',
      swiggy_suchali: 'Swiggy <> Suchali Artisan Bakehouse',
      zomato_suchali: 'Zomato <> Suchali Artisan Bakehouse',
      swiggy_got_tea: 'Swiggy <> Got Tea',
      zomato_got_tea: 'Zomato <> Got Tea',
      others: 'Others'
    };
    const filterName = filterNames[aggregator] || 'Others';
    const subjAgg = `${filterName} | New Store | ${selectedStore.cafeName} | ${selectedStore.cafeCode}`;
    setSubject(subjAgg);

    setSubject(subjAgg);

    if (isSwiggy) {
      let restaurantName = "Blue Tokai Coffee Roasters";
      if (aggregator === 'swiggy_suchali') {
        restaurantName = "Suchali Artisan Bakehouse";
      } else if (aggregator === 'swiggy_got_tea') {
        restaurantName = "Got Tea";
      }

      const completeAddress = [
        selectedStore.cafeAddress || selectedStore.address,
        selectedStore.city,
        selectedStore.state,
        selectedStore.pinCode
      ].filter(Boolean).join(', ');

      const latLong = [
        selectedStore.latitude || selectedStore.lat,
        selectedStore.long || selectedStore.lng
      ].filter(val => val !== null && val !== undefined && val !== '').join(', ');

      const swiggyData = [
        ["Attribute", "Validation", ""],
        ["New / Existing Onboarding*", "New", ""],
        ["Restaurant Name*", restaurantName, "orange"],
        ["Number of outlets to be onboarded*", "1", ""],
        ["Existing RID", "", ""],
        ["Display Name", selectedStore.cafeName || "", "green"],
        ["New Outlet City*", selectedStore.city || "", ""],
        ["Complete Address", completeAddress, ""],
        ["Lat & long", latLong, ""],
        ["City Type", "", ""],
        ["Menu type* ( POS )", "POS", ""],
        ["Replication ID / POS partner name", "Rista", ""],
        ["Partner app training requirement*", "No", "bold"],
        ["OB Fee* (If OB is diff from the approved value, attach the approval email)", ".", ""],
        ["Commission %*", "17", ""],
        ["Commission type ( Gross / Net )", "Net", ""],
        ["Launch type*", "", ""],
        ["Owner email ID / Invoicing email ID", "aggregator@bluetokaicoffee.com", ""],
        ["Owner Name", "Satwik", ""],
        ["GST category ( Restaurant / Non - Restaurant / Hybrid )", "Restaurant", ""],
        ["Restaurant Timings", "7 AM - 11 PM", ""],
        ["Owner Phone number", "9667440872", ""],
        ["Packing Type ( Item level / cart level )", "Cart Level", ""],
        ["Packing chargers - if item level mentioned % if cart level mentioned flat amount", "25", ""],
        ["Cuisines", "Cafe, Coffee, Beverages", ""],
        ["CFT", "", ""],
        ["CGST & SGST", "5", ""],
        ["Order Notification Email ID", selectedStore.cafeMailId || selectedStore.email || "", ""],
        ["Order Manager Number", selectedStore.cafePhoneNumber || selectedStore.phone || "", ""],
        ["Map Link", selectedStore.cafeLocationGoogleLink || "", ""]
      ];

      const introText = `Hi Team,
 
 This is regarding our new cafe onboarding.
 
 Please find below the details and initiate the process for the same.

`;
      const compactTableText = swiggyData.map((row) => `${row[0]} | ${row[1]}`).join('\n');

      setBody(introText + compactTableText);
      setSwiggyTableRows(swiggyData);
    } else {
      setSwiggyTableRows([]);
      let swiggyRid = '';
      let zomatoRid = '';
      if (selectedStore.brand === 'BLUE_TOKAI_SUCHALI') {
        swiggyRid = selectedStore.blueTokaiSwiggyRID || selectedStore.suchaliSwiggyRID || 'N/A';
        zomatoRid = selectedStore.blueTokaiZomatoRID || selectedStore.suchaliZomatoRID || 'N/A';
      } else if (selectedStore.brand === 'GOT_TEA') {
        swiggyRid = selectedStore.gotTeaSwiggyRID || 'N/A';
        zomatoRid = selectedStore.gotTeaZomatoRID || 'N/A';
      } else {
        swiggyRid = selectedStore.blueTokaiSwiggyRID || 'N/A';
        zomatoRid = selectedStore.blueTokaiZomatoRID || 'N/A';
      }

      const brandNameShort = selectedStore.brand === 'BLUE_TOKAI_SUCHALI' 
        ? 'Blue Tokai x Suchali\'s' 
        : selectedStore.brand === 'GOT_TEA' 
          ? 'Got Tea' 
          : 'Blue Tokai';

      const bodyText = `Hi Team,
 
 This is regarding our new cafe onboarding.
 
 Please find below the details and initiate the process for the same.

Store Information:
- Cafe Name: ${selectedStore.cafeName}
- Cafe Code: ${selectedStore.cafeCode}
- Brand: ${brandNameShort}
- Cafe Model: ${selectedStore.cafeModel || 'N/A'}
- Address: ${selectedStore.cafeAddress || selectedStore.address || 'N/A'}
- City: ${selectedStore.city || 'N/A'}
- State: ${selectedStore.state || 'N/A'}
- Pin Code: ${selectedStore.pinCode || 'N/A'}
- Platform Type: ${selectedStore.platformType || 'N/A'}
- Opening Hours: ${selectedStore.cafeOpenTiming || 'N/A'} to ${selectedStore.cafeClosingTime || 'N/A'}

Integration IDs:
- Swiggy RID: ${swiggyRid}
- Zomato RID: ${zomatoRid}

Compliance Details:
- GST Number: ${selectedStore.gstNo || 'N/A'}
- FSSAI License Number: ${selectedStore.fssaiNo || 'N/A'}

Contact Details:
- Cafe Contact Number: ${selectedStore.cafePhoneNumber || 'N/A'}
- Cafe Manager: ${selectedStore.cafeManagerName || 'N/A'} (${selectedStore.cafeManagerMailId || 'N/A'})
- Area Manager: ${selectedStore.areaManagerName || 'N/A'} (${selectedStore.areaManagerEmail || 'N/A'})
- City Head: ${selectedStore.cityHeadName || 'N/A'} (${selectedStore.cityHeadEmail || 'N/A'})

Please let us know once the store is live.

Best regards,
Operations Team`;
      setBody(bodyText);
    }
  }, [selectedStore, aggregator, categories]);

  const handleInputChange = (categoryId, value) => {
    setNewEmailInputs(prev => ({
      ...prev,
      [categoryId]: value
    }));
  };

  const handleAddEmail = async (categoryId) => {
    const email = (newEmailInputs[categoryId] || '').trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        if (cat.emails.includes(email)) return cat;
        return {
          ...cat,
          emails: [...cat.emails, email]
        };
      }
      return cat;
    });

    try {
      const res = await axios.put('/api/system/email-recipients', updatedCategories);
      setCategories(res.data.config);
      setNewEmailInputs(prev => ({ ...prev, [categoryId]: '' }));
      setSuccessMsg('Email configurations updated successfully.');
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update email configuration.');
    }
  };

  const handleRemoveEmail = async (categoryId, emailIndex) => {
    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          emails: cat.emails.filter((_, idx) => idx !== emailIndex)
        };
      }
      return cat;
    });

    try {
      const res = await axios.put('/api/system/email-recipients', updatedCategories);
      setCategories(res.data.config);
      setSuccessMsg('Email configurations updated successfully.');
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update email configuration.');
    }
  };

  const handleSendSMTP = () => {
    if (!selectedStore || selectedStore.isMailLocked) return;
    setPopTo(to);
    setPopCc(cc);
    setPopSubject(subject);
    setPopBody(body);
    setPopErrors({});
    setSmtpConfirmOpen(true);
  };

  const handleConfirmSMTP = async () => {
    const errors = {};
    const toEmails = popTo.split(',').map(e => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (toEmails.length === 0) {
      errors.to = 'To field must contain at least one email address.';
    } else {
      const invalid = toEmails.filter(e => !emailRegex.test(e));
      if (invalid.length > 0) {
        errors.to = `Invalid email formats: ${invalid.join(', ')}`;
      }
    }

    if (!popSubject.trim()) {
      errors.subject = 'Subject cannot be blank.';
    }

    if (Object.keys(errors).length > 0) {
      setPopErrors(errors);
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      await axios.post(`/api/stores/${selectedStore.id}/send-swiggy-onboarding-email`, {
        brand: aggregator,
        to: popTo,
        cc: popCc,
        subject: popSubject,
        body: popBody
      });
      setSuccessMsg('Email has been sent successfully.');
      setSmtpConfirmOpen(false);
      
      // Update local state directly so UI responds instantly
      setSelectedStore(null);
      setStores(prev => prev.map(s => s.id === selectedStore.id ? { ...s, mailStatus: 'Sent' } : s));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to send onboarding email.');
      setSmtpConfirmOpen(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedStore) return;
    const newLockState = !selectedStore.isMailLocked;
    try {
      await axios.put(`/api/stores/${selectedStore.id}`, {
        isMailLocked: newLockState
      });
      setSelectedStore(prev => ({ ...prev, isMailLocked: newLockState }));
      setStores(prev => prev.map(s => s.id === selectedStore.id ? { ...s, isMailLocked: newLockState } : s));
      setSuccessMsg(`Email ${newLockState ? 'locked' : 'unlocked'} successfully.`);
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update lock status.');
    }
  };

  const handleMarkAsSent = async () => {
    if (!selectedStore) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await axios.put(`/api/stores/${selectedStore.id}`, {
        mailStatus: 'Sent'
      });
      setSelectedStore(prev => ({ ...prev, mailStatus: 'Sent' }));
      setStores(prev => prev.map(s => s.id === selectedStore.id ? { ...s, mailStatus: 'Sent' } : s));
      setSuccessMsg('Store status updated to "Sent".');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update status.');
    }
  };

  const handleAddAutoEmail = async (categoryId) => {
    const inputVal = (categoryId === 'auto_mails' ? newAutoEmailInput : newAutoCcEmailInput).trim();
    if (!inputVal) return;

    const emailsToAdd = inputVal.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emailsToAdd) {
      if (!emailRegex.test(email)) {
        setErrorMsg(`Invalid email format: ${email}`);
        return;
      }
    }

    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        const newEmails = [...cat.emails];
        for (const email of emailsToAdd) {
          if (!newEmails.includes(email)) {
            newEmails.push(email);
          }
        }
        return { ...cat, emails: newEmails };
      }
      return cat;
    });

    try {
      const res = await axios.put('/api/system/email-recipients', updated);
      setCategories(res.data.config);
      if (categoryId === 'auto_mails') {
        setNewAutoEmailInput('');
      } else {
        setNewAutoCcEmailInput('');
      }
      setSuccessMsg('Email added successfully.');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to add email.');
    }
  };

  const handleSaveEditAutoEmail = async (categoryId, idx) => {
    const email = editingAutoValue.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        const newEmails = [...cat.emails];
        newEmails[idx] = email;
        return { ...cat, emails: newEmails };
      }
      return cat;
    });

    try {
      const res = await axios.put('/api/system/email-recipients', updated);
      setCategories(res.data.config);
      setEditingAutoCat(null);
      setEditingAutoIndex(null);
      setEditingAutoValue('');
      setSuccessMsg('Email updated successfully.');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update email.');
    }
  };

  const handleConfirmDeleteAutoEmail = async () => {
    if (deleteIndex === null || !deleteCatId) return;

    const updated = categories.map(cat => {
      if (cat.id === deleteCatId) {
        return {
          ...cat,
          emails: cat.emails.filter((_, idx) => idx !== deleteIndex)
        };
      }
      return cat;
    });

    try {
      const res = await axios.put('/api/system/email-recipients', updated);
      setCategories(res.data.config);
      setSuccessMsg('Email deleted successfully.');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete email.');
    } finally {
      setConfirmDeleteDialogOpen(false);
      setDeleteCatId(null);
      setDeleteIndex(null);
    }
  };

  const renderAutoMailsCard = () => {
    const autoMailsCategory = categories.find(c => c.id === 'auto_mails') || { id: 'auto_mails', name: 'Mail IDs for Auto Mails (TO)', type: 'to', emails: [] };
    const autoCcMailsCategory = categories.find(c => c.id === 'auto_mails_cc') || { id: 'auto_mails_cc', name: 'Mail IDs for Auto Mails (CC)', type: 'cc', emails: [] };

    const renderSubSection = (category, inputValue, setInputValue, label) => {
      return (
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={category.type.toUpperCase()} 
              size="small" 
              color={category.type === 'to' ? 'primary' : 'secondary'} 
              variant={category.type === 'cc' ? 'outlined' : 'filled'}
              sx={{ fontWeight: 800, height: 18, fontSize: '0.6rem', borderRadius: '4px' }} 
            />
            {label}
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)', mb: 2, minHeight: 180, maxHeight: 300, overflowY: 'auto' }}>
            <List dense sx={{ py: 0 }}>
              {category.emails.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 6, fontWeight: 500 }}>
                  No email IDs configured.
                </Typography>
              ) : (
                category.emails.map((email, idx) => {
                  const isEditing = editingAutoCat === category.id && editingAutoIndex === idx;
                  return (
                    <ListItem 
                      key={idx} 
                      disablePadding 
                      sx={{ 
                        py: 0.75, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' } 
                      }} 
                      secondaryAction={
                        isEditing ? (
                          <Stack direction="row" spacing={1}>
                            <IconButton 
                              edge="end" 
                              size="small" 
                              onClick={() => handleSaveEditAutoEmail(category.id, idx)} 
                              color="success"
                            >
                              <CheckIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton 
                              edge="end" 
                              size="small" 
                              onClick={() => {
                                setEditingAutoCat(null);
                                setEditingAutoIndex(null);
                                setEditingAutoValue('');
                              }} 
                              color="error"
                            >
                              <CloseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1}>
                            <IconButton 
                              edge="end" 
                              size="small" 
                              onClick={() => {
                                setEditingAutoCat(category.id);
                                setEditingAutoIndex(idx);
                                setEditingAutoValue(email);
                              }} 
                              color="primary"
                              disabled={!canManageEmailDirectory}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton 
                              edge="end" 
                              size="small" 
                              onClick={() => {
                                setDeleteCatId(category.id);
                                setDeleteIndex(idx);
                                setConfirmDeleteDialogOpen(true);
                              }} 
                              color="error"
                              disabled={!canManageEmailDirectory}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Stack>
                        )
                      }
                    >
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={editingAutoValue}
                          onChange={(e) => setEditingAutoValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditAutoEmail(category.id, idx);
                            if (e.key === 'Escape') {
                              setEditingAutoCat(null);
                              setEditingAutoIndex(null);
                              setEditingAutoValue('');
                            }
                          }}
                          sx={{ mr: 12 }}
                          autoFocus
                        />
                      ) : (
                        <ListItemText 
                          primary={email} 
                          primaryTypographyProps={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 600,
                            style: { wordBreak: 'break-all', paddingRight: '100px' } 
                          }} 
                        />
                      )}
                    </ListItem>
                  );
                })
              )}
            </List>
          </Paper>

          <Stack direction="row" spacing={2}>
            <TextField 
              size="small" 
              placeholder={`Add email ID(s) (e.g. alert1@bluetokai.com, alert2@bluetokai.com)`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              fullWidth
              disabled={!canManageEmailDirectory}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddAutoEmail(category.id);
                }
              }}
            />
            <Button 
              variant="contained" 
              onClick={() => handleAddAutoEmail(category.id)}
              disabled={!canManageEmailDirectory}
              startIcon={<AddIcon />}
              sx={{ borderRadius: '8px', px: 3, fontWeight: 700, boxShadow: 'none' }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      );
    };

    return (
      <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', width: '100%', border: '1px solid', borderColor: 'divider' }}>
        <CardHeader 
          title="Mail IDs for Auto Mails" 
          titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
          subheader="Manage email recipients for system-generated and automated emails"
        />
        <Divider />
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              {renderSubSection(autoMailsCategory, newAutoEmailInput, setNewAutoEmailInput, "To Recipient List")}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {renderSubSection(autoCcMailsCategory, newAutoCcEmailInput, setNewAutoCcEmailInput, "CC Recipient List")}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Email Directory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isSuperAdmin 
            ? "Draft and send onboarding and operations details for new stores."
            : "Manage email recipients for system-generated and automated emails."
          }
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{errorMsg}</Alert>}

      {!canManageEmailDirectory && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>
          You are in view-only mode. You need the "Email Directory" sub-access permission to add, edit, or delete Mail IDs.
        </Alert>
      )}

      {isSuperAdmin ? (
        <Grid container spacing={3}>
        {/* Left Column: Stores Queue */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', height: '100%' }}>
            <CardHeader 
              title="Approved Queue" 
              titleTypographyProps={{ fontWeight: 800, variant: 'h6' }} 
              subheader="Select an approved store to draft onboarding email dispatches"
              action={
                <Box sx={{ display: 'flex', gap: 2, mt: 1, mr: 2 }}>
                  <TextField
                    select
                    size="small"
                    label="Mail Status"
                    value={mailFilter}
                    onChange={(e) => setMailFilter(e.target.value)}
                    sx={{ width: 130 }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="drafted">Mail Created</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                  </TextField>
                </Box>
              }
            />
            <Divider />
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Cafe Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cafe Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mail Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 8, color: 'text.secondary', fontWeight: 600 }}>
                          No approved stores found.
                        </TableCell>
                      </TableRow>
                  ) : (
                    filteredStores.map((store) => {
                      const isSelected = selectedStore?.id === store.id;
                      const hasSent = store.mailStatus === 'Sent';
                      const isDrafted = store.mailStatus === 'Mail Created';
                      return (
                        <TableRow 
                          key={store.id} 
                          hover={!hasSent} 
                          onClick={hasSent ? undefined : () => setSelectedStore(store)}
                          selected={isSelected && !hasSent}
                          sx={{ 
                            cursor: hasSent ? 'default' : 'pointer',
                            opacity: hasSent ? 0.6 : 1,
                            pointerEvents: hasSent ? 'none' : 'auto',
                            '&.Mui-selected': {
                              bgcolor: 'action.selected',
                              '&:hover': { bgcolor: 'action.selected' }
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700, color: isSelected && !hasSent ? 'primary.main' : 'text.primary' }}>
                            {store.cafeCode}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{store.cafeName}</TableCell>
                          <TableCell>
                            {hasSent ? (
                              <Chip 
                                label="Sent" 
                                color="success" 
                                size="small" 
                                icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                sx={{ fontWeight: 700, borderRadius: '6px' }} 
                              />
                            ) : isDrafted ? (
                              <Chip 
                                label="Mail Created" 
                                color="info" 
                                size="small" 
                                sx={{ fontWeight: 700, borderRadius: '6px' }} 
                              />
                            ) : (
                              <Chip 
                                label="Pending" 
                                color="warning" 
                                size="small" 
                                sx={{ fontWeight: 700, borderRadius: '6px' }} 
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Right Column: Mail Drafting Interface & Configuration */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            {selectedStore ? (
              <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper' }}>
                <CardHeader 
                  title={`Draft Onboarding Dispatch`} 
                  titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
                  subheader={`Store: ${selectedStore.cafeName} (${selectedStore.cafeCode})`}
                  action={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FormControlLabel
                        control={<Switch checked={selectedStore.isMailLocked || false} onChange={handleToggleLock} color="warning" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: selectedStore.isMailLocked ? 'warning.main' : 'text.secondary' }}>
                            {selectedStore.isMailLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {selectedStore.isMailLocked ? 'Locked' : 'Unlocked'}
                            </Typography>
                          </Box>
                        }
                      />
                      <TextField
                        select
                        size="small"
                        disabled={selectedStore.isMailLocked}
                        value={aggregator}
                        onChange={(e) => setAggregator(e.target.value)}
                        sx={{ width: 300 }}
                      >
                        <MenuItem value="swiggy_blue_tokai">Swiggy {"<>"} Blue Tokai Coffee Roasters</MenuItem>
                        <MenuItem value="zomato_blue_tokai">Zomato {"<>"} Blue Tokai Coffee Roasters</MenuItem>
                        <MenuItem value="swiggy_suchali">Swiggy {"<>"} Suchali Artisan Bakehouse</MenuItem>
                        <MenuItem value="zomato_suchali">Zomato {"<>"} Suchali Artisan Bakehouse</MenuItem>
                        <MenuItem value="swiggy_got_tea">Swiggy {"<>"} Got Tea</MenuItem>
                        <MenuItem value="zomato_got_tea">Zomato {"<>"} Got Tea</MenuItem>
                        <MenuItem value="others">Others</MenuItem>
                      </TextField>
                    </Stack>
                  }
                />
                <Divider />
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <TextField 
                      fullWidth 
                      label="To" 
                      value={to} 
                      onChange={(e) => setTo(e.target.value)} 
                      size="small"
                      disabled={selectedStore.isMailLocked}
                    />
                    <TextField 
                      fullWidth 
                      label="CC" 
                      value={cc} 
                      onChange={(e) => setCc(e.target.value)} 
                      size="small"
                      disabled={selectedStore.isMailLocked}
                    />
                    <TextField 
                      fullWidth 
                      label="Subject" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)} 
                      size="small"
                      disabled={selectedStore.isMailLocked}
                    />
                    {aggregator.startsWith('swiggy') ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Message Body (Visual Table View)
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1, color: 'text.primary', lineHeight: 1.6, fontFamily: 'inherit' }}>
                          {`Hi Team,
 
 This is regarding our new cafe onboarding.
 
 Please find below the details and initiate the process for the same.`}
                        </Typography>
                        <TableContainer 
                          component={Paper} 
                          variant="outlined" 
                          sx={{ 
                            borderRadius: '12px', 
                            overflow: 'auto', 
                            borderColor: 'divider',
                            maxHeight: 450
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                 <TableCell 
                                  align="center" 
                                  sx={{ 
                                    bgcolor: '#B45309 !important', 
                                    color: '#ffffff !important', 
                                    fontWeight: 'bold', 
                                    fontSize: '0.85rem',
                                    borderRight: '1px solid #7c3500',
                                    py: 1.5,
                                    width: '45%'
                                  }}
                                >
                                  {swiggyTableRows[0]?.[0] || 'Attribute'}
                                </TableCell>
                                <TableCell 
                                  align="center" 
                                  sx={{ 
                                    bgcolor: '#B45309 !important', 
                                    color: '#ffffff !important', 
                                    fontWeight: 'bold', 
                                    fontSize: '0.85rem',
                                    py: 1.5,
                                    width: '55%'
                                  }}
                                >
                                  {swiggyTableRows[0]?.[1] || 'Validation'}
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {swiggyTableRows.slice(1).map((row, index) => {
                                const colorHint = row[2] || '';
                                const isBoldRow = colorHint === 'bold';
                                const validationBg = colorHint === 'orange' ? '#FF8C00' : colorHint === 'green' ? '#00A651' : 'transparent';
                                return (
                                  <TableRow key={index} hover>
                                    <TableCell 
                                      align="left" 
                                      sx={{ 
                                        fontWeight: isBoldRow ? 700 : 400, 
                                        fontSize: '0.8rem',
                                        borderRight: '1px solid #e2e8f0',
                                        borderBottom: '1px solid #e2e8f0',
                                        py: 0.8,
                                        px: 1.5,
                                        color: '#000000'
                                      }}
                                    >
                                      {row[0]}
                                    </TableCell>
                                    <TableCell 
                                      align="center" 
                                      sx={{ 
                                        fontSize: '0.8rem',
                                        py: 0.8,
                                        px: 1.5,
                                        borderBottom: '1px solid #e2e8f0',
                                        bgcolor: validationBg,
                                        color: '#000000',
                                        fontWeight: 400
                                      }}
                                    >
                                      {row[1] || ''}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ) : (
                      <TextField 
                        fullWidth 
                        multiline 
                        rows={12} 
                        label="Message Body" 
                        value={body} 
                        onChange={(e) => setBody(e.target.value)}
                        disabled={selectedStore.isMailLocked}
                        sx={{ 
                          fontFamily: 'monospace',
                          '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' } 
                        }}
                      />
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                      <Button 
                        variant="outlined" 
                        color="success" 
                        startIcon={<CheckIcon />}
                        onClick={handleMarkAsSent}
                        sx={{ 
                          borderRadius: '10px', 
                          px: 3, 
                          py: 1.2,
                          fontWeight: 700
                        }}
                      >
                        Mark as Sent
                      </Button>

                      {aggregator && (
                        <Button 
                          variant="contained" 
                          color="success" 
                          startIcon={<SendIcon />}
                          onClick={handleSendSMTP}
                          disabled={selectedStore.isMailLocked}
                          sx={{ 
                            borderRadius: '10px', 
                            px: 3, 
                            py: 1.2,
                            fontWeight: 700,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' }
                          }}
                        >
                          Send Email via SMTP
                        </Button>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ 
                borderRadius: '16px', 
                bgcolor: 'background.paper', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 6
              }}>
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <MailOutlineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary', mb: 0.5 }}>
                    No Store Selected
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please select a store from the Approved Queue on the left to begin drafting.
                  </Typography>
                </Box>
              </Card>
            )}

            {/* Email Configuration Section */}
            <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper' }}>
              <CardHeader 
                title="Email Recipient Configuration" 
                titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
                subheader="Manage TO and CC mappings dynamically for aggregator dispatches"
              />
              <Divider />
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {categories.filter(c => c.id !== 'auto_mails' && c.id !== 'auto_mails_cc').map((category) => (
                    <Grid size={{ xs: 12, md: 4 }} key={category.id}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={category.type.toUpperCase()} 
                          size="small" 
                          color={category.type === 'to' ? (category.id === 'swiggy' ? 'primary' : 'secondary') : 'default'} 
                          variant={category.type === 'cc' ? 'outlined' : 'filled'}
                          sx={{ fontWeight: 800, height: 18, fontSize: '0.6rem', borderRadius: '4px' }} 
                        />
                        {category.name}
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.01)', mb: 2, minHeight: 180, maxHeight: 180, overflowY: 'auto' }}>
                        <List dense sx={{ py: 0 }}>
                          {category.emails.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 4 }}>
                              No emails configured.
                            </Typography>
                          ) : (
                            category.emails.map((email, idx) => (
                              <ListItem key={idx} disablePadding sx={{ py: 0.25 }} secondaryAction={
                                <IconButton edge="end" size="small" onClick={() => handleRemoveEmail(category.id, idx)} color="error">
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              }>
                                <ListItemText primary={email} primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 500, style: { wordBreak: 'break-all', paddingRight: '24px' } }} />
                              </ListItem>
                            ))
                          )}
                        </List>
                      </Paper>
                      <Stack direction="row" spacing={1}>
                        <TextField 
                          size="small" 
                          placeholder="Add email ID"
                          value={newEmailInputs[category.id] || ''}
                          onChange={(e) => handleInputChange(category.id, e.target.value)}
                          fullWidth
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddEmail(category.id);
                            }
                          }}
                        />
                        <Button 
                          variant={category.type === 'cc' ? 'outlined' : 'contained'} 
                          color={category.id === 'zomato' ? 'secondary' : 'primary'}
                          onClick={() => handleAddEmail(category.id)} 
                          sx={{ minWidth: 40, px: 0, borderRadius: '8px', boxShadow: 'none' }}
                        >
                          <AddIcon sx={{ fontSize: 20 }} />
                        </Button>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Mail IDs for Auto Mails Card */}
            {renderAutoMailsCard()}
          </Stack>
        </Grid>
      </Grid>
      ) : (
        <Box sx={{ mt: 2 }}>
          {renderAutoMailsCard()}
        </Box>
      )}

      {/* Confirmation Dialog for Auto Mail ID Deletion */}
      <Dialog
        open={confirmDeleteDialogOpen}
        onClose={() => setConfirmDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this Mail ID?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDeleteAutoEmail} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: '8px' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Confirmation Dialog for SMTP Onboarding Dispatch */}
      <Dialog
        open={smtpConfirmOpen}
        onClose={() => setSmtpConfirmOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: '16px', 
            p: 1.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          } 
        }}
      >
        <DialogTitle component="div" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          <Typography component="div" variant="h6" sx={{ fontWeight: 800 }}>Confirm SMTP Email Dispatch</Typography>
          <Stack direction="row" spacing={1.5}>
            <Button 
              onClick={() => setSmtpConfirmOpen(false)} 
              variant="outlined" 
              color="inherit" 
              sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
            >
              Back
            </Button>
            <Button 
              onClick={handleConfirmSMTP} 
              variant="contained" 
              color="success" 
              sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', boxShadow: 'none' }}
            >
              OK
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              disabled
              label="From Mail ID"
              value="analytics@bluetokaicoffee.com"
              size="small"
              helperText="This email will be dispatched from our verified analytics alias."
            />
            
            <TextField
              fullWidth
              label="To"
              value={popTo}
              onChange={(e) => setPopTo(e.target.value)}
              size="small"
              error={!!popErrors.to}
              helperText={popErrors.to || "Comma-separated list of recipient email addresses."}
            />

            <TextField
              fullWidth
              label="CC"
              value={popCc}
              onChange={(e) => setPopCc(e.target.value)}
              size="small"
              helperText="Comma-separated list of CC email addresses."
            />

            <TextField
              fullWidth
              label="Subject"
              value={popSubject}
              onChange={(e) => setPopSubject(e.target.value)}
              size="small"
              error={!!popErrors.subject}
              helperText={popErrors.subject}
            />

            {aggregator.startsWith('swiggy') ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1, color: 'text.primary', lineHeight: 1.6, fontFamily: 'inherit' }}>
                  {`Hi Team,\n \n This is regarding our new cafe onboarding.\n \n Please find below the details and initiate the process for the same.`}
                </Typography>
                <TableContainer 
                  component={Paper} 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: '12px', 
                    overflow: 'auto', 
                    borderColor: 'divider',
                    maxHeight: 450
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          align="center" 
                          sx={{ 
                            bgcolor: '#B45309 !important', 
                            color: '#ffffff !important', 
                            fontWeight: 'bold', 
                            fontSize: '0.85rem',
                            borderRight: '1px solid #7c3500',
                            py: 1.5,
                            width: '45%'
                          }}
                        >
                          {swiggyTableRows[0]?.[0] || 'Attribute'}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ 
                            bgcolor: '#B45309 !important', 
                            color: '#ffffff !important', 
                            fontWeight: 'bold', 
                            fontSize: '0.85rem',
                            py: 1.5,
                            width: '55%'
                          }}
                        >
                          {swiggyTableRows[0]?.[1] || 'Validation'}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {swiggyTableRows.slice(1).map((row, index) => {
                        const colorHint = row[2] || '';
                        const isBoldRow = colorHint === 'bold';
                        const validationBg = colorHint === 'orange' ? '#FF8C00' : colorHint === 'green' ? '#00A651' : 'transparent';
                        return (
                          <TableRow key={index} hover>
                            <TableCell 
                              align="left" 
                              sx={{ 
                                fontWeight: isBoldRow ? 700 : 400, 
                                fontSize: '0.8rem',
                                borderRight: '1px solid #e2e8f0',
                                borderBottom: '1px solid #e2e8f0',
                                py: 0.8,
                                px: 1.5,
                                color: '#000000'
                              }}
                            >
                              {row[0]}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: '0.8rem',
                                py: 0.8,
                                px: 1.5,
                                borderBottom: '1px solid #e2e8f0',
                                bgcolor: validationBg,
                                color: '#000000',
                                fontWeight: 400
                              }}
                            >
                              {row[1] || ''}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <TextField
                fullWidth
                multiline
                rows={12}
                label="Email Body"
                value={popBody}
                onChange={(e) => setPopBody(e.target.value)}
                sx={{ 
                  fontFamily: 'monospace',
                  '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' } 
                }}
              />
            )}

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Attachments:{' '}
                {aggregator.startsWith('swiggy') ? (
                  <a
                    href={`/api/stores/${selectedStore?.id}/swiggy-template?brand=${aggregator}&token=${localStorage.getItem('token')}`}
                    download
                    style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {`Swiggy_${selectedStore?.brand === 'BLUE_TOKAI_SUCHALI' ? 'Suchali_Artisan_Bakehouse' : selectedStore?.brand === 'GOT_TEA' ? 'Got_Tea' : 'Blue_Tokai'}_Onboarding_Template_${selectedStore?.cafeCode}.xlsx`}
                  </a>
                ) : (
                  'None'
                )}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
