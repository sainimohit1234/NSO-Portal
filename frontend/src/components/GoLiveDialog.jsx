import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, FormControlLabel, Switch, TextField, Box, Typography, Grid
} from '@mui/material';
import { DOCUMENT_CONFIG } from './DocumentManagerModal';

export default function GoLiveDialog({ open, onClose, store, onSave }) {
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
  
  const [missingDocs, setMissingDocs] = useState([]);

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
      setMissingDocs([]);
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
      setMissingDocs([]);
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
    if (!storeObj) return [];
    
    let req = [];
    DOCUMENT_CONFIG.forEach(cat => {
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          req = [...req, ...sub.docs.filter(d => d.mandatory).map(d => d.type)];
        });
      } else if (cat.docs) {
        req = [...req, ...cat.docs.filter(d => d.mandatory).map(d => d.type)];
      }
    });

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
    
    return req.filter(reqType => {
      const doc = currentDocs.find(d => d.type === reqType);
      return !(doc && (doc.url || doc.disabled));
    });
  };

  const handleInStoreToggle = (e) => {
    const isChecked = e.target.checked;
    
    if (isChecked) {
      const missing = getMissingRequiredDocs(store);
      if (missing.length > 0) {
         setMissingDocs(missing);
         return; // Prevent turning on
      }
    }
    
    setMissingDocs([]);

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
          {missingDocs.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="error" sx={{ fontWeight: 800, mb: 1 }}>
                Cannot enable In-Store. The following required documents are missing:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#dc2626', fontSize: '0.85rem' }}>
                {missingDocs.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
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
    </Dialog>
  );
}
