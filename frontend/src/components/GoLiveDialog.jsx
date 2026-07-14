import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, FormControlLabel, Switch, TextField, Box, Typography, Grid, IconButton, CircularProgress, Snackbar, Alert, Portal
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import axios from '../utils/api';
import { DOCUMENT_CONFIG } from './DocumentManagerModal';

const getRelativeTime = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = new Date() - new Date(dateStr);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours >= 24) return null; // Over 24h
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
};

export default function GoLiveDialog({ open, onClose, store, onSave, onStoreUpdated }) {
  const [inStoreLive, setInStoreLive] = useState(false);
  const [inStoreLiveDate, setInStoreLiveDate] = useState('');
  const [inStoreClosureDate, setInStoreClosureDate] = useState('');
  
  const [deliveryLive, setDeliveryLive] = useState(false);
  const [deliveryLiveDate, setDeliveryLiveDate] = useState('');
  const [deliveryClosureDate, setDeliveryClosureDate] = useState('');
  
  const [blueTokaiSwiggyLive, setBlueTokaiSwiggyLive] = useState(false);
  const [blueTokaiZomatoLive, setBlueTokaiZomatoLive] = useState(false);
  const [suchaliSwiggyLive, setSuchaliSwiggyLive] = useState(false);
  const [suchaliZomatoLive, setSuchaliZomatoLive] = useState(false);
  const [gotTeaSwiggyLive, setGotTeaSwiggyLive] = useState(false);
  const [gotTeaZomatoLive, setGotTeaZomatoLive] = useState(false);

  const [initialInStoreLive, setInitialInStoreLive] = useState(false);
  const [initialDeliveryLive, setInitialDeliveryLive] = useState(false);
  
  const [missingDocs, setMissingDocs] = useState({ 'Legal Documents': [], 'Financial Documents': [], 'Project Documents': [] });
  const [draftDialog, setDraftDialog] = useState({ open: false, category: '', to: '', cc: '', subject: '', body: '', missingList: [] });
  const [isDraftEditing, setIsDraftEditing] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (open && store) {
      setInStoreLive(store.inStoreLive || false);
      setInitialInStoreLive(store.inStoreLive || false);
      setInStoreLiveDate(store.inStoreLiveDate ? store.inStoreLiveDate.substring(0, 10) : '');
      setInStoreClosureDate(store.inStoreClosureDate ? store.inStoreClosureDate.substring(0, 10) : '');
      
      setDeliveryLive(store.deliveryLive || false);
      setInitialDeliveryLive(store.deliveryLive || false);
      setDeliveryLiveDate(store.deliveryLiveDate ? store.deliveryLiveDate.substring(0, 10) : '');
      setDeliveryClosureDate(store.deliveryClosureDate ? store.deliveryClosureDate.substring(0, 10) : '');
      
      setBlueTokaiSwiggyLive(store.blueTokaiSwiggyLive || false);
      setBlueTokaiZomatoLive(store.blueTokaiZomatoLive || false);
      setSuchaliSwiggyLive(store.suchaliSwiggyLive || false);
      setSuchaliZomatoLive(store.suchaliZomatoLive || false);
      setGotTeaSwiggyLive(store.gotTeaSwiggyLive || false);
      setGotTeaZomatoLive(store.gotTeaZomatoLive || false);
      setMissingDocs({ 'Legal Documents': [], 'Financial Documents': [], 'Project Documents': [] });
    } else if (!open) {
      setInStoreLive(false);
      setInitialInStoreLive(false);
      setInStoreLiveDate('');
      setInStoreClosureDate('');
      setDeliveryLive(false);
      setInitialDeliveryLive(false);
      setDeliveryLiveDate('');
      setDeliveryClosureDate('');
      setBlueTokaiSwiggyLive(false);
      setBlueTokaiZomatoLive(false);
      setSuchaliSwiggyLive(false);
      setSuchaliZomatoLive(false);
      setGotTeaSwiggyLive(false);
      setGotTeaZomatoLive(false);
      setMissingDocs({ 'Legal Documents': [], 'Financial Documents': [], 'Project Documents': [] });
    }
  }, [open, store]);

  if (!store) return null;
  const isGotTea = store.brand === 'GOT_TEA';

  const hasAnyRid = Boolean(
    store.blueTokaiSwiggyRID || 
    store.blueTokaiZomatoRID || 
    store.suchaliSwiggyRID || 
    store.suchaliZomatoRID || 
    store.gotTeaSwiggyRID || 
    store.gotTeaZomatoRID
  );

  const isInStoreClosing = initialInStoreLive && !inStoreLive;
  const isDeliveryClosing = initialDeliveryLive && !deliveryLive;

  const isSaveInStoreDisabled = () => {
    if (inStoreLive && !inStoreLiveDate) return true;
    if (isInStoreClosing && !inStoreClosureDate) return true;
    return false;
  };

  const isSaveDeliveryDisabled = () => {
    if (deliveryLive && !deliveryLiveDate) return true;
    if (deliveryLive) {
      const anyPlatformOn = blueTokaiSwiggyLive || blueTokaiZomatoLive || suchaliSwiggyLive || suchaliZomatoLive || gotTeaSwiggyLive || gotTeaZomatoLive;
      if (!anyPlatformOn) return true;
    }
    if (isDeliveryClosing && !deliveryClosureDate) return true;
    return false;
  };

  const getMissingRequiredDocs = (storeObj) => {
    const missing = {
      'Legal Documents': [],
      'Financial Documents': [],
      'Project Documents': []
    };
    if (!storeObj) return missing;

    let currentDocs = Array.isArray(storeObj.documents) ? [...storeObj.documents] : [];
    
    const migrateField = (urlField, docType) => {
      if (storeObj[urlField] && !currentDocs.find(d => d.type === docType)) {
        currentDocs.push({ type: docType, url: storeObj[urlField] });
      }
    };
    migrateField('loiUrl', 'Letter of Intent (LOI)');
    migrateField('budgetUrl', 'Budget Approval');
    migrateField('agreementUrl', 'Lease / Rental Agreement');
    migrateField('fssaiUrl', 'FSSAI License');
    
    DOCUMENT_CONFIG.forEach(cat => {
      let reqTypes = [];
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          reqTypes = [...reqTypes, ...sub.docs.filter(d => d.mandatory).map(d => d.type)];
        });
      } else if (cat.docs) {
        reqTypes = [...reqTypes, ...cat.docs.filter(d => d.mandatory).map(d => d.type)];
      }

      const missingForCat = reqTypes.filter(reqType => {
        const doc = currentDocs.find(d => d.type === reqType);
        return !(doc && (doc.url || doc.disabled));
      });

      if (missing[cat.name] !== undefined) {
        missing[cat.name] = [...missing[cat.name], ...missingForCat];
      }
    });

    return missing;
  };

  const handleOpenDraftMail = async (category, docs) => {
    try {
      setDraftLoading(true);
      const categoryName = category.replace(' Documents', ''); // Legal, Financial, Project, Miscellaneous
      // Normalize to match the exact keys stored in the Email Directory
      const categoryNameMap = {
        'Financial': 'Finance',
        'Miscellaneous': 'Miscellaneous',
        'Legal': 'Legal',
        'Project': 'Project',
      };
      const normalizedCategoryName = categoryNameMap[categoryName] ?? categoryName;
      const subCategoryKey = `Draft a mail to ${normalizedCategoryName} Team`;
      
      const [templatesRes, mappingsRes] = await Promise.all([
        axios.get('/api/system/email-templates'),
        axios.get('/api/system/email-mappings'),
      ]);
      const templates = templatesRes.data || {};
      const mappings = Array.isArray(mappingsRes.data) ? mappingsRes.data : [];
      const mapping = mappings.find(
        m => m.subCategory?.toLowerCase() === subCategoryKey.toLowerCase()
      );

      const template = templates[subCategoryKey] || {};
      const rawSubject = template.subject || `${subCategoryKey} | ${store.cafeName}`;
      let rawBody = template.body || `Hi Team,\n\nPlease upload the following documents for ${store.cafeName}:\n[Pending Documents]`;
      rawBody = rawBody.replace(/<br\s*\/?>/gi, '\n');

      const missingListHtml = docs.map(d => `- ${d}`).join('\n');
      const placeholderMap = {
        '[Cafe Name]': store.cafeName || '',
        '[Cafe Code]': store.cafeCode || '',
        '[Brand]': store.brand || '',
        '[Pending Documents]': missingListHtml,
        '[All List of Pending Documents]': missingListHtml
      };
      
      let subject = rawSubject;
      let body = rawBody;
      for (const [token, value] of Object.entries(placeholderMap)) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        subject = subject.replace(new RegExp(escaped, 'gi'), value);
        body = body.replace(new RegExp(escaped, 'gi'), value);
      }

      const toList = (mapping?.to || []).join(', ');
      const ccList = (mapping?.cc || []).join(', ');

      setIsDraftEditing(false);
      setDraftDialog({
        open: true,
        category,
        missingList: docs,
        to: toList,
        cc: ccList,
        subject,
        body
      });
    } catch (error) {
      console.error('Failed to load email config:', error);
      setSnackbar({ open: true, message: 'Failed to load email configuration.', severity: 'error' });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSendDraftMail = async () => {
    try {
      setDraftLoading(true);
      const res = await axios.post(`/api/stores/${store.id}/send-pending-docs-email`, {
        to: draftDialog.to,
        cc: draftDialog.cc,
        subject: draftDialog.subject,
        body: draftDialog.body,
        category: draftDialog.category
      });
      setSnackbar({ open: true, message: 'Email sent successfully!', severity: 'success' });
      setDraftDialog(prev => ({ ...prev, open: false }));
      if (res.data.store && onStoreUpdated) {
        onStoreUpdated(res.data.store);
      } else if (res.data.store) {
        // Fallback for immediate UI update if parent doesn't handle onStoreUpdated
        if (draftDialog.category === 'Legal Documents') store.legalMailSentAt = res.data.store.legalMailSentAt;
        if (draftDialog.category === 'Financial Documents') store.financialMailSentAt = res.data.store.financialMailSentAt;
        if (draftDialog.category === 'Project Documents') store.projectMailSentAt = res.data.store.projectMailSentAt;
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      setSnackbar({ open: true, message: 'Failed to send email.', severity: 'error' });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleInStoreToggle = (e) => {
    const isChecked = e.target.checked;
    
    if (isChecked) {
      const missing = getMissingRequiredDocs(store);
      const totalMissingCount = Object.values(missing).reduce((acc, curr) => acc + curr.length, 0);
      if (totalMissingCount > 0) {
         setMissingDocs(missing);
         return; // Prevent turning on
      }
    }
    
    setMissingDocs({ 'Legal Documents': [], 'Financial Documents': [], 'Project Documents': [] });

    if (initialInStoreLive && !isChecked) {
      if (!window.confirm("Are you sure you want to close this outlet for In-Store?")) {
        return; // user cancelled closing
      }
    }
    setInStoreLive(isChecked);
  };

  const handleDeliveryToggle = (e) => {
    const isChecked = e.target.checked;
    if (initialDeliveryLive && !isChecked) {
      if (!window.confirm("Are you sure you want to close this outlet for Delivery?")) {
        return; // user cancelled closing
      }
    }
    setDeliveryLive(isChecked);
  };

  const handleSaveInStore = () => {
    const autoCloseDelivery = isInStoreClosing && deliveryLive;
    const finalDeliveryLive = autoCloseDelivery ? false : deliveryLive;
    
    // Only mark delivery as closed if it was previously live or we are auto-closing it
    const finalDeliveryClosed = autoCloseDelivery || (store.deliveryLiveDate && !finalDeliveryLive) || store.deliveryClosed;
    const finalDeliveryClosedDate = autoCloseDelivery 
      ? inStoreClosureDate 
      : (isDeliveryClosing ? deliveryClosureDate : store.deliveryClosureDate);

    const payload = {
      status: (!inStoreLive && !finalDeliveryLive) ? 'CLOSED' : 'LIVE',
      inStoreLive,
      inStoreLiveDate: inStoreLive ? inStoreLiveDate : store.inStoreLiveDate,
      inStoreClosureDate: isInStoreClosing ? inStoreClosureDate : (inStoreLive ? null : store.inStoreClosureDate),
      inStoreClosed: !inStoreLive,
      inStoreClosedDate: isInStoreClosing ? inStoreClosureDate : (inStoreLive ? null : store.inStoreClosureDate),
      deliveryLive: finalDeliveryLive,
      deliveryClosureDate: finalDeliveryClosedDate,
      deliveryClosed: !!finalDeliveryClosed,
      deliveryClosedDate: finalDeliveryClosedDate,
    };
    onSave(payload);
  };

  const handleSaveDelivery = () => {
    // Delivery closure does not affect in-store toggle
    const finalDeliveryClosed = isDeliveryClosing || (store.deliveryLiveDate && !deliveryLive) || store.deliveryClosed;
    const finalDeliveryClosedDate = isDeliveryClosing ? deliveryClosureDate : (deliveryLive ? null : store.deliveryClosureDate);

    const payload = {
      status: (!inStoreLive && !deliveryLive) ? 'CLOSED' : 'LIVE',
      deliveryLive,
      deliveryLiveDate: deliveryLive ? deliveryLiveDate : store.deliveryLiveDate,
      deliveryClosureDate: finalDeliveryClosedDate,
      inStoreClosed: !inStoreLive,
      inStoreClosedDate: isInStoreClosing ? inStoreClosureDate : (inStoreLive ? null : store.inStoreClosureDate),
      deliveryClosed: !!finalDeliveryClosed,
      deliveryClosedDate: finalDeliveryClosedDate,
      blueTokaiSwiggyLive,
      blueTokaiSwiggyLiveDate: (deliveryLive && blueTokaiSwiggyLive) ? deliveryLiveDate : (blueTokaiSwiggyLive ? store.blueTokaiSwiggyLiveDate : null),
      blueTokaiZomatoLive,
      blueTokaiZomatoLiveDate: (deliveryLive && blueTokaiZomatoLive) ? deliveryLiveDate : (blueTokaiZomatoLive ? store.blueTokaiZomatoLiveDate : null),
      suchaliSwiggyLive,
      suchaliSwiggyLiveDate: (deliveryLive && suchaliSwiggyLive) ? deliveryLiveDate : (suchaliSwiggyLive ? store.suchaliSwiggyLiveDate : null),
      suchaliZomatoLive,
      suchaliZomatoLiveDate: (deliveryLive && suchaliZomatoLive) ? deliveryLiveDate : (suchaliZomatoLive ? store.suchaliZomatoLiveDate : null),
      gotTeaSwiggyLive,
      gotTeaSwiggyLiveDate: (deliveryLive && gotTeaSwiggyLive) ? deliveryLiveDate : (gotTeaSwiggyLive ? store.gotTeaSwiggyLiveDate : null),
      gotTeaZomatoLive,
      gotTeaZomatoLiveDate: (deliveryLive && gotTeaZomatoLive) ? deliveryLiveDate : (gotTeaZomatoLive ? store.gotTeaZomatoLiveDate : null),
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Manage Live Status: {store.cafeName}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 800 }}>1. In-Store Status</Typography>
            <Button onClick={handleSaveInStore} disabled={isSaveInStoreDisabled()} variant="contained" color={isInStoreClosing ? "error" : "success"} size="small" sx={{ fontWeight: 800 }}>Save In-Store</Button>
          </Box>
          <FormControlLabel
            control={<Switch checked={inStoreLive} onChange={handleInStoreToggle} />}
            label={inStoreLive ? "In-Store is LIVE" : "In-Store is CLOSED"}
          />
          {(missingDocs['Legal Documents'].length > 0 || missingDocs['Financial Documents'].length > 0 || missingDocs['Project Documents'].length > 0) && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="error" sx={{ fontWeight: 800, mb: 1 }}>
                Cannot enable In-Store. The following required documents are missing:
              </Typography>
              {['Legal Documents', 'Financial Documents', 'Project Documents'].map((category) => {
                const docs = missingDocs[category];
                if (!docs || docs.length === 0) return null;
                const categoryName = category.replace(' Documents', '');
                
                let mailSentAt = null;
                if (category === 'Legal Documents') mailSentAt = store?.legalMailSentAt;
                if (category === 'Financial Documents') mailSentAt = store?.financialMailSentAt;
                if (category === 'Project Documents') mailSentAt = store?.projectMailSentAt;
                
                const relativeTime = getRelativeTime(mailSentAt);

                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#991b1b' }}>
                        {category} Pending List
                      </Typography>
                      {relativeTime ? (
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#16a34a', bgcolor: '#dcfce7', px: 1, py: 0.5, borderRadius: 1, border: '1px solid #bbf7d0' }}>
                          Mail Sent ({relativeTime})
                        </Typography>
                      ) : (
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => handleOpenDraftMail(category, docs)}
                          sx={{ color: '#166534', borderColor: '#86efac', '&:hover': { borderColor: '#166534', bgcolor: '#f0fdf4' }, textTransform: 'none', fontWeight: 600, fontSize: '0.70rem', px: 1, py: 0.25 }}
                        >
                          Draft a mail to {categoryName} Team
                        </Button>
                      )}
                    </Box>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#dc2626', fontSize: '0.85rem' }}>
                      {docs.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </Box>
                );
              })}
            </Box>
          )}
          {inStoreLive && (
            <TextField
              type="date"
              label="In-Store Live Date"
              fullWidth
              size="small"
              value={inStoreLiveDate}
              onChange={(e) => setInStoreLiveDate(e.target.value)}
              sx={{ mt: 2, bgcolor: 'white' }}
              InputLabelProps={{ shrink: true }}
              required
            />
          )}
          {isInStoreClosing && (
            <TextField
              type="date"
              label="In-Store Closure Date"
              fullWidth
              size="small"
              value={inStoreClosureDate}
              onChange={(e) => setInStoreClosureDate(e.target.value)}
              sx={{ mt: 2, bgcolor: '#fee2e2' }}
              InputLabelProps={{ shrink: true }}
              required
            />
          )}
        </Box>

        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 800 }}>2. Delivery Status</Typography>
            <Button onClick={handleSaveDelivery} disabled={isSaveDeliveryDisabled()} variant="contained" color={isDeliveryClosing ? "error" : "success"} size="small" sx={{ fontWeight: 800 }}>Save Delivery</Button>
          </Box>
          <FormControlLabel
            control={<Switch checked={deliveryLive} onChange={handleDeliveryToggle} disabled={!hasAnyRid} />}
            label={deliveryLive ? "Delivery is LIVE" : "Delivery is CLOSED"}
          />
          {!hasAnyRid && (
            <Typography variant="caption" sx={{ display: 'block', color: 'error.main', fontWeight: 700, mt: 0.5 }}>
              Integration pending (No RIDs updated in Swiggy/Zomato Integration module)
            </Typography>
          )}
          
          {deliveryLive && (
            <Box sx={{ mt: 2 }}>
              <TextField
                type="date"
                label="Delivery Live Date (Applies to all selected platforms)"
                fullWidth
                size="small"
                value={deliveryLiveDate}
                onChange={(e) => setDeliveryLiveDate(e.target.value)}
                sx={{ mb: 3, bgcolor: 'white' }}
                InputLabelProps={{ shrink: true }}
                required
              />

              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 700 }}>Select Active Platforms</Typography>
              {!isGotTea ? (
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={blueTokaiSwiggyLive} onChange={(e) => setBlueTokaiSwiggyLive(e.target.checked)} disabled={!store.blueTokaiSwiggyRID} />} label="BT Swiggy" />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={blueTokaiZomatoLive} onChange={(e) => setBlueTokaiZomatoLive(e.target.checked)} disabled={!store.blueTokaiZomatoRID} />} label="BT Zomato" />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={suchaliSwiggyLive} onChange={(e) => setSuchaliSwiggyLive(e.target.checked)} disabled={!store.suchaliSwiggyRID} />} label="Suchali's Swiggy" />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={suchaliZomatoLive} onChange={(e) => setSuchaliZomatoLive(e.target.checked)} disabled={!store.suchaliZomatoRID} />} label="Suchali's Zomato" />
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={gotTeaSwiggyLive} onChange={(e) => setGotTeaSwiggyLive(e.target.checked)} disabled={!store.gotTeaSwiggyRID} />} label="Got Tea Swiggy" />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={gotTeaZomatoLive} onChange={(e) => setGotTeaZomatoLive(e.target.checked)} disabled={!store.gotTeaZomatoRID} />} label="Got Tea Zomato" />
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
          {isDeliveryClosing && (
            <TextField
              type="date"
              label="Delivery Closure Date"
              fullWidth
              size="small"
              value={deliveryClosureDate}
              onChange={(e) => setDeliveryClosureDate(e.target.value)}
              sx={{ mt: 2, bgcolor: '#fee2e2' }}
              InputLabelProps={{ shrink: true }}
              required
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>Close</Button>
      </DialogActions>

      {/* Draft Mail Dialog */}
      <Dialog open={draftDialog.open} onClose={() => setDraftDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: '16px', p: 0, overflow: 'hidden' } }}>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #0A314D 0%, #061e30 100%)', 
          color: '#ffffff',
          fontWeight: 800, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          px: 3,
          py: 2,
          flexShrink: 0
        }}>
          <Box>Draft a mail to {draftDialog.category.replace(' Documents', '')} Team</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isDraftEditing ? (
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setIsDraftEditing(true)} 
                sx={{ 
                  borderRadius: '8px', 
                  textTransform: 'none', 
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.4)',
                  '&:hover': {
                    borderColor: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.08)'
                  }
                }}
              >
                Edit Content
              </Button>
            ) : (
              <Button 
                variant="contained" 
                size="small" 
                onClick={() => setIsDraftEditing(false)} 
                sx={{ 
                  borderRadius: '8px', 
                  textTransform: 'none', 
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  bgcolor: '#ffffff',
                  color: '#0A314D',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                Done Editing
              </Button>
            )}
            <IconButton 
              onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))}
              sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ffffff' } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Subject" fullWidth size="small" disabled={!isDraftEditing} value={draftDialog.subject} onChange={(e) => setDraftDialog(prev => ({ ...prev, subject: e.target.value }))} />
            <TextField label="To" fullWidth size="small" disabled={!isDraftEditing} value={draftDialog.to} onChange={(e) => setDraftDialog(prev => ({ ...prev, to: e.target.value }))} />
            <TextField label="Cc" fullWidth size="small" disabled={!isDraftEditing} value={draftDialog.cc} onChange={(e) => setDraftDialog(prev => ({ ...prev, cc: e.target.value }))} />
            {isDraftEditing ? (
              <TextField
                multiline
                rows={15}
                fullWidth
                value={draftDialog.body}
                onChange={(e) => setDraftDialog(prev => ({ ...prev, body: e.target.value }))}
              />
            ) : (
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: 2, minHeight: '300px', bgcolor: '#f8fafc', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {draftDialog.body}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" disabled={draftLoading} onClick={() => setDraftDialog(prev => ({ ...prev, open: false }))} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" disabled={draftLoading} onClick={handleSendDraftMail} startIcon={draftLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Send Email
          </Button>
        </DialogActions>
      </Dialog>
      
      <Portal>
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} style={{ zIndex: 2147483647 }}>
          <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '8px' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Portal>
    </Dialog>
  );
}
