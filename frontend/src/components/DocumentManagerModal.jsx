import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  IconButton, Link, Switch, TextField, Accordion, AccordionSummary, AccordionDetails,
  Backdrop, CircularProgress, Tooltip, Portal, Snackbar, Alert
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  FindReplace as FindReplaceIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';

export const DOCUMENT_CONFIG = [
  {
    name: 'Legal Documents',
    subcategories: [
      {
        name: 'Internal Documents',
        docs: [
          { type: 'Letter of Intent (LOI)', mandatory: true },
          { type: 'Due Diligence Report', mandatory: true },
          { type: 'FSSAI License', mandatory: true, requiresDates: true },
          { type: 'Shop & Establishment License', mandatory: true },
          { type: 'Health Trade License (HTL)', mandatory: true },
          { type: 'Fire Safety NOC', mandatory: true },
          { type: 'Signage Approval', mandatory: false, isToggleable: true },
          { type: 'Lease / Rental Agreement', mandatory: true, requiresDates: true }
        ]
      },
      {
        name: 'Property Owner Documents',
        docs: [
          { type: 'PAN Card', mandatory: true },
          { type: 'Aadhaar Card', mandatory: true },
          { type: 'GST Docs', mandatory: true },
          { type: 'Property Ownership Deed', mandatory: true },
          { type: 'Property Tax Receipt', mandatory: true },
          { type: 'Electricity Bill', mandatory: true },
          { type: 'Water Connection Proof', mandatory: true },
          { type: 'Occupancy Certificate (OC)', mandatory: true }
        ]
      }
    ]
  },
  {
    name: 'Financial Documents',
    docs: [
      { type: 'Budget Approval', mandatory: true },
      { type: 'Financial Projection', mandatory: true },
      { type: 'Cost Sheet', mandatory: true },
      { type: 'Capex Approval', mandatory: true },
      { type: 'Vendor Quotations', mandatory: true }
    ]
  },
  {
    name: 'Project Documents',
    docs: [
      { type: 'Project Timeline', mandatory: true },
      { type: 'Bill of Quantities (BOQ)', mandatory: true },
      { type: 'Site Progress Photos', mandatory: true },
      { type: 'Construction Checklist', mandatory: true },
      { type: 'Project Completion Certificate', mandatory: true }
    ]
  },
  {
    name: 'Miscellaneous Documents',
    isGeneric: true,
    docs: []
  }
];

export default function DocumentManagerModal({ open, store, onClose, onSave, setSnackbar, canModify, activeCategory }) {
  const [documents, setDocuments] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [gstNo, setGstNo] = useState(store?.gstNo || '');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [miscInput, setMiscInput] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [addMoreInputs, setAddMoreInputs] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      setIsEditMode(false);
      setHasUnsavedChanges(false);
    }
  }, [open]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Fetch text/CSV content for preview
  useEffect(() => {
    const type = previewDoc ? getFileType(previewDoc.url, previewDoc.fileName) : null;
    if (previewDoc && type === 'text') {
      setPreviewText('Loading preview...');
      axios.get(previewDoc.url, { responseType: 'text' })
        .then(res => setPreviewText(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)))
        .catch(err => setPreviewText('Failed to load text preview.'));
    } else if (previewDoc && type === 'csv') {
      setPreviewData(null);
      axios.get(previewDoc.url, { responseType: 'text' })
        .then(res => {
          Papa.parse(res.data, {
            complete: (results) => setPreviewData(results.data),
            skipEmptyLines: true
          });
        })
        .catch(err => console.error(err));
    } else {
      setPreviewText(null);
      setPreviewData(null);
    }
  }, [previewDoc]);

  // Helper to extract a flat array of all required document types from config
  const getRequiredTypes = () => {
    let req = [];
    DOCUMENT_CONFIG.forEach(cat => {
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          req = [...req, ...sub.docs.map(d => ({ ...d, category: cat.name }))];
        });
      } else if (cat.docs) {
        req = [...req, ...cat.docs.map(d => ({ ...d, category: cat.name }))];
      }
    });
    return req;
  };

  useEffect(() => {
    if (store) {
      // Migrate old flat fields if they exist and documents array is empty/missing
      let currentDocs = Array.isArray(store.documents) ? [...store.documents] : [];
      
      const migrateField = (urlField, nameField, docType) => {
        if (store[urlField] && !currentDocs.find(d => d.type === docType)) {
          currentDocs.push({
            id: Date.now() + Math.random(),
            type: docType,
            url: store[urlField],
            fileName: store[nameField] || 'Document',
            metadata: {}
          });
        }
      };

      migrateField('loiUrl', 'loiFileName', 'Letter of Intent (LOI)');
      migrateField('budgetUrl', 'budgetFileName', 'Budget Approval');
      migrateField('agreementUrl', 'agreementFileName', 'Lease / Rental Agreement');
      migrateField('fssaiUrl', 'fssaiFileName', 'FSSAI License');

      setDocuments(currentDocs);
    } else {
      setDocuments([]);
      setPreviewDoc(null);
    }
  }, [store]);

  const handleFileUpload = async (file, docType, metadata = {}, category = 'Miscellaneous Documents', isMisc = false, isExtra = false, subcategory = null, extraName = '') => {
    if (!file) return;
    const maxSize = 500 * 1024; // 500kb
    if (file.size > maxSize) {
      setSnackbar({ open: true, message: 'Upload blocked: File size must not exceed 500KB.', severity: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoadingMessage(`Uploading ${isMisc || isExtra ? 'document' : docType}...`);
      setLoading(true);
      setUploadProgress(0);
      // Determine file type slot to reuse existing upload endpoint
      let typeParam = 'doc';
      if (docType === 'Letter of Intent (LOI)') typeParam = 'loi';
      if (docType === 'Budget Approval') typeParam = 'budget';
      if (docType === 'Lease / Rental Agreement') typeParam = 'agreement';

      const res = await axios.post(`/api/stores/upload-file?type=${typeParam}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      const fileUrl = res.data.url;

      const newDoc = {
        id: Date.now() + Math.random(),
        category,
        subcategory,
        type: isExtra ? extraName : (isMisc ? miscInput || 'Misc Document' : docType),
        url: fileUrl,
        fileName: file.name,
        uploadedBy: user?.email || 'Unknown',
        uploadedAt: new Date().toISOString(),
        metadata: {
           isSignageEnabled: docType === 'Signage Approval' ? true : undefined,
           ...metadata
        },
        isMisc,
        isExtra
      };

      setDocuments(prev => {
        // Remove old document of same type if it exists (unless it's misc or extra and we are adding a new one)
        const filtered = (isMisc || isExtra) ? prev : prev.filter(d => d.type !== docType);
        return [...filtered, newDoc];
      });
      setHasUnsavedChanges(true);
      setPreviewDoc(newDoc);
      setSnackbar({ open: true, message: `${docType} uploaded successfully.`, severity: 'success' });
      if (isMisc) setMiscInput('');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to upload document.', severity: 'error' });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDelete = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    setHasUnsavedChanges(true);
    if (previewDoc?.id === id) setPreviewDoc(null);
  };

  const handleUpdateMetadata = (id, field, value) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, metadata: { ...d.metadata, [field]: value } };
      }
      return d;
    }));
    
    setPreviewDoc(prev => {
      if (prev && prev.id === id) {
        return { ...prev, metadata: { ...prev.metadata, [field]: value } };
      }
      return prev;
    });

    setHasUnsavedChanges(true);
  };

  // Add dummy document for disabled Signage Approval so it counts as completed
  const handleToggleSignage = (enabled) => {
    if (!enabled) {
      // Remove any existing uploaded signage approval
      setDocuments(prev => prev.filter(d => d.type !== 'Signage Approval').concat([{
        id: 'signage_disabled',
        type: 'Signage Approval',
        disabled: true,
        metadata: { isSignageEnabled: false }
      }]));
    } else {
      setDocuments(prev => prev.filter(d => d.type !== 'Signage Approval'));
    }
    setHasUnsavedChanges(true);
  };

  // Compute Summary
  const reqTypes = getRequiredTypes();
  const activeReqTypes = reqTypes.filter(rt => rt.category === activeCategory);
  
  let totalCount = 0;
  let uploadedCount = 0;

  if (activeCategory === 'Miscellaneous Documents') {
    const miscDocs = documents.filter(d => d.isMisc);
    totalCount = miscDocs.length;
    uploadedCount = miscDocs.length;
  } else {
    totalCount = activeReqTypes.length;

    activeReqTypes.forEach(rt => {
      const doc = documents.find(d => d.type === rt.type);
      let isUploaded = false;
      if (rt.type === 'Signage Approval' && doc?.disabled) {
         isUploaded = true;
      } else if (doc && doc.url) {
         isUploaded = true;
      }
      
      if (isUploaded) {
        uploadedCount++;
      }
    });
  }

  const overallStatus = uploadedCount === totalCount ? 'Completed' : 'Pending';

  const handleSaveAll = async () => {
    if (!store) return;
    
    // VALIDATION: Require FSSAI Number and Dates if FSSAI doc is uploaded
    const fssaiDoc = documents.find(d => d.type === 'FSSAI License');
    if (fssaiDoc && fssaiDoc.url) {
      if (!fssaiDoc.metadata || !fssaiDoc.metadata.fssaiNumber || fssaiDoc.metadata.fssaiNumber.trim() === '') {
        setSnackbar({ open: true, message: 'Please update the FSSAI Number before saving.', severity: 'error' });
        return;
      }
      if (!fssaiDoc.metadata || !fssaiDoc.metadata.fssaiIssuedOn || !fssaiDoc.metadata.fssaiValidUntil) {
        setSnackbar({ open: true, message: 'Please update the FSSAI Issued On and Valid Until dates before saving.', severity: 'error' });
        return;
      }
    }

    try {
      setLoadingMessage('Saving all changes...');
      setLoading(true);
      // Remove dummy signage disabled doc before saving to DB, just keep track via a flat boolean or within the documents array
      // Actually keeping the dummy object is fine, it just doesn't have a URL.
      const payload = { documents };
      
      // Include gstNo if it was updated
      if (gstNo !== store?.gstNo) {
        payload.gstNo = gstNo;
      }
      
      // Update backwards compatible fields just in case
      const loiDoc = documents.find(d => d.type === 'Letter of Intent (LOI)');
      const budgetDoc = documents.find(d => d.type === 'Budget Approval');
      const agreementDoc = documents.find(d => d.type === 'Lease / Rental Agreement');
      
      if (loiDoc) { 
        payload.loiUrl = loiDoc.url; 
        payload.loiFileName = loiDoc.fileName; 
        if (store.status === 'In Pipeline' || store.status === 'Agreement Signed') {
          const hasCode = !!(store.cafeCode && store.cafeCode.trim());
          if (hasCode) {
            payload.status = 'Ready for Construction';
          } else {
            payload.status = 'Agreement Signed';
          }
        }
      }
      else { payload.loiUrl = null; payload.loiFileName = null; }

      if (budgetDoc) { payload.budgetUrl = budgetDoc.url; payload.budgetFileName = budgetDoc.fileName; }
      else { payload.budgetUrl = null; payload.budgetFileName = null; }

      if (agreementDoc) { payload.agreementUrl = agreementDoc.url; payload.agreementFileName = agreementDoc.fileName; }
      else { payload.agreementUrl = null; payload.agreementFileName = null; }

      if (store.isTemp || String(store.id).startsWith('temp_')) {
         onSave(payload);
         setSnackbar({ open: true, message: 'Documents saved locally.', severity: 'success' });
      } else {
          await axios.put(`/api/stores/${store.id}`, payload);
         onSave(payload);
         setSnackbar({ open: true, message: 'Documents saved successfully.', severity: 'success' });
      }
      setHasUnsavedChanges(false);
      setIsEditMode(false);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save documents.', severity: 'error' });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const renderLeftPanel = () => {
    const activeConfigs = DOCUMENT_CONFIG.filter(cat => activeCategory ? cat.name === activeCategory : true);
    
    return (
      <Table size="small" stickyHeader sx={{ minWidth: 600 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, width: '20%' }}>CATEGORY</TableCell>
            <TableCell sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, width: '25%' }}>SUB-CATEGORY</TableCell>
            <TableCell sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, width: '55%' }}>UPLOAD DOCUMENT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activeConfigs.map(cat => {
            if (cat.isGeneric) {
               const miscDocs = documents.filter(d => d.isMisc);
               return (
                 <React.Fragment key={cat.name}>
                    {miscDocs.map((d, idx) => (
                      <TableRow key={d.id} hover onClick={() => setPreviewDoc(d)} sx={{ cursor: 'pointer', bgcolor: previewDoc?.id === d.id ? 'action.selected' : '#f8fafc' }}>
                         {idx === 0 && <TableCell rowSpan={Math.max(1, miscDocs.length + 1)} sx={{ fontWeight: 800, verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>{cat.name}</TableCell>}
                         <TableCell>{d.type}</TableCell>
                         <TableCell>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                               <Box>
                                 <Typography variant="body2" color="primary" sx={{ mb: 0.5, fontWeight: 600 }}>Document Name: {d.fileName}</Typography>
                                 <Typography variant="caption" color="text.secondary" component="div">Uploaded By: {d.uploadedBy || 'Unknown'}</Typography>
                                 <Typography variant="caption" color="text.secondary" component="div">Timestamp: {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : 'N/A'}</Typography>
                                 <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                                   <Chip label="Uploaded" color="success" size="small" />
                                   {canModify && isEditMode && (
                                     <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}>Remove</Button>
                                   )}
                                 </Box>
                               </Box>
                            </Box>
                         </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                       {miscDocs.length === 0 && <TableCell sx={{ fontWeight: 800, verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>{cat.name}</TableCell>}
                       <TableCell colSpan={2}>
                          {canModify && isEditMode && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField size="small" label="Document Title" value={miscInput} onChange={e => setMiscInput(e.target.value)} fullWidth />
                              <Button variant="contained" component="label" disabled={!miscInput || loading}>
                                Upload
                                <input type="file" hidden onChange={(e) => handleFileUpload(e.target.files[0], 'Misc', {}, cat.name, true)} />
                              </Button>
                            </Box>
                          )}
                       </TableCell>
                    </TableRow>
                 </React.Fragment>
               );
            }

            let items = [];
            if (cat.subcategories) {
               cat.subcategories.forEach(sub => {
                  items.push({ isSubHeader: true, name: sub.name });
                  sub.docs.forEach(d => items.push(d));
                  
                  const extraDocs = documents.filter(d => d.isExtra && d.category === cat.name && d.subcategory === sub.name);
                  extraDocs.forEach(d => items.push({ ...d, isExtraDoc: true }));

                  if (!canModify) {
                     items.push({ isAddMore: true, subcategory: sub.name });
                  }
               });
            } else {
               items = [...cat.docs];
               const extraDocs = documents.filter(d => d.isExtra && d.category === cat.name && !d.subcategory);
               extraDocs.forEach(d => items.push({ ...d, isExtraDoc: true }));

               if (!canModify) {
                  items.push({ isAddMore: true });
               }
            }

            return items.map((item, idx) => {
               if (item.isSubHeader) {
                  return (
                    <TableRow key={`sub-${item.name}`} sx={{ bgcolor: 'action.hover' }}>
                       {idx === 0 && <TableCell rowSpan={items.length} sx={{ fontWeight: 800, verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>{cat.name}</TableCell>}
                       <TableCell colSpan={2} sx={{ fontWeight: 700, color: '#0369a1' }}>{item.name}</TableCell>
                    </TableRow>
                  );
               }

               if (item.isAddMore) {
                  const inputKey = `${cat.name}-${item.subcategory || 'root'}`;
                  return (
                    <TableRow key={`add-more-${inputKey}`} sx={{ bgcolor: 'background.default' }}>
                       {idx === 0 && <TableCell rowSpan={items.length} sx={{ fontWeight: 800, verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>{cat.name}</TableCell>}
                       <TableCell colSpan={2}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField 
                               size="small" 
                               label="New Document Title" 
                               value={addMoreInputs[inputKey] || ''} 
                               onChange={e => setAddMoreInputs(prev => ({ ...prev, [inputKey]: e.target.value }))} 
                               fullWidth 
                            />
                            <Button 
                               variant="contained" 
                               component="label" 
                               disabled={!addMoreInputs[inputKey] || loading}
                               sx={{ whiteSpace: 'nowrap' }}
                            >
                              Add more Docs
                              <input 
                                 type="file" 
                                 hidden 
                                 onChange={(e) => {
                                    const title = addMoreInputs[inputKey];
                                    handleFileUpload(e.target.files[0], 'Extra', {}, cat.name, false, true, item.subcategory, title);
                                    setAddMoreInputs(prev => ({ ...prev, [inputKey]: '' }));
                                 }} 
                              />
                            </Button>
                          </Box>
                       </TableCell>
                    </TableRow>
                  );
               }

               if (item.isExtraDoc) {
                  const doc = item;
                  return (
                     <TableRow key={doc.id} hover onClick={() => setPreviewDoc(doc)} sx={{ cursor: 'pointer', bgcolor: previewDoc?.id === doc.id ? 'action.selected' : '#f8fafc' }}>
                        {idx === 0 && <TableCell rowSpan={items.length} sx={{ fontWeight: 800, verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>{cat.name}</TableCell>}
                        <TableCell>
                           <Typography variant="body2" sx={{ fontWeight: 700 }}>{doc.type}</Typography>
                           <Chip label="Additional" size="small" sx={{ mt: 1, bgcolor: 'secondary.main', color: 'secondary.contrastText' }} />
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                               <Box>
                                 <Typography variant="body2" color="primary" sx={{ mb: 0.5, fontWeight: 600 }}>Document Name: {doc.fileName}</Typography>
                                 <Typography variant="caption" color="text.secondary" component="div">Uploaded By: {doc.uploadedBy || 'Unknown'}</Typography>
                                 <Typography variant="caption" color="text.secondary" component="div">Timestamp: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A'}</Typography>
                                 <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                                   <Chip label="Uploaded" color="success" size="small" />
                                   {isEditMode && canModify && (
                                     <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>Remove</Button>
                                   )}
                                 </Box>
                               </Box>
                            </Box>
                        </TableCell>
                     </TableRow>
                  );
               }

               const rt = item;
               const doc = documents.find(d => d.type === rt.type);
               const isUploaded = !!doc?.url;
               const isDisabled = doc?.disabled;

               return (
                 <TableRow key={rt.type} hover onClick={() => isUploaded && setPreviewDoc(doc)} sx={{ cursor: isUploaded ? 'pointer' : 'default', bgcolor: previewDoc?.id === doc?.id ? '#e0f7fa' : '#f8fafc' }}>
                    {idx === 0 && <TableCell rowSpan={items.length} sx={{ fontWeight: 800, verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>{cat.name}</TableCell>}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{rt.type} {rt.mandatory && <Typography component="span" color="error">*</Typography>}</Typography>
                      {rt.isToggleable && (
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                           <Typography variant="caption">Enabled</Typography>
                           <Switch size="small" checked={!isDisabled} onChange={(e) => handleToggleSignage(e.target.checked)} disabled={!canModify || !isEditMode} />
                         </Box>
                      )}
                    </TableCell>
                    <TableCell>
                       {isDisabled ? (
                           <Chip label="Not Required" size="small" sx={{ bgcolor: 'grey.300' }} />
                       ) : isUploaded ? (
                           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                 <Typography variant="body2" color="primary" sx={{ mb: 0.5, fontWeight: 600 }}>Document Name: {doc.fileName}</Typography>
                                 <Typography variant="caption" color="text.secondary" component="div">Uploaded By: {doc.uploadedBy || 'Unknown'}</Typography>
                                 <Typography variant="caption" color="text.secondary" component="div">Timestamp: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A'}</Typography>
                                 
                                 <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                   <Chip label="Uploaded" color="success" sx={{ bgcolor: '#10b981', color: 'primary.contrastText' }} size="small" />
                                   {canModify && isEditMode && (
                                     <Button variant="text" color="error" size="small" sx={{ textTransform: 'none' }} onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>Remove</Button>
                                   )}
                                   {rt.requiresDates && (!doc.metadata?.issuedOn || !doc.metadata?.validUntil) && (
                                     <Typography variant="caption" color="error" sx={{ ml: 1 }}>Missing Dates</Typography>
                                   )}
                                 </Box>
                              </Box>
                           </Box>
                       ) : (
                           <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                             {canModify && isEditMode && (
                               <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', color: '#0ea5e9', borderColor: '#0ea5e9' }} disabled={loading}>
                                 Upload Document
                                 <input type="file" hidden onChange={(e) => handleFileUpload(e.target.files[0], rt.type, {}, cat.name)} />
                               </Button>
                             )}
                             <Chip label="Awaiting Documents" color="error" variant="outlined" size="small" sx={{ color: '#ef4444', borderColor: '#ef4444', bgcolor: '#fef2f2' }} />
                           </Box>
                       )}
                    </TableCell>
                 </TableRow>
               );
            });
          })}
        </TableBody>
      </Table>
    );
  };

  const getFileType = (url, name) => {
    if (!url) return '';
    const ext = name?.split('.').pop().toLowerCase();
    if (ext === 'pdf' || url.includes('.pdf')) return 'pdf';
    if (['jpg','jpeg','png','gif','bmp','webp'].includes(ext) || url.match(/\.(jpeg|jpg|gif|png|bmp|webp)$/i)) return 'image';
    if (['xls','xlsx','doc','docx','ppt','pptx'].includes(ext)) return 'office';
    if (ext === 'csv') return 'csv';
    if (ext === 'txt') return 'text';
    return 'other';
  };

  return (
    <>
    <Dialog open={open} onClose={handleAttemptClose} maxWidth="xl" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: '16px', height: '95vh !important', minHeight: '95vh !important', maxHeight: '95vh !important', display: 'flex', flexDirection: 'column' } }}>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 1, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>{activeCategory || 'Document Management'} - {store?.cafeName || 'Untitled'}</Box>
        {canModify && !isEditMode && (
          <Tooltip title="Enter Edit Mode">
            <IconButton onClick={() => setIsEditMode(true)} color="primary" sx={{ bgcolor: 'action.hover' }}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* Summary Bar */}
        <Box sx={{ p: 1.5, px: 2, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>DOCUMENTS COMPLETED</Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">{uploadedCount} / {totalCount}</Typography>
          </Box>
        </Box>

          <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
            
            {/* Left Panel */}
            <Box sx={{ width: { xs: '100%', md: '50%' }, borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto', p: 1.5 }}>
            
            {renderLeftPanel()}

            </Box>
          
          {/* Right Panel - Previewer */}
          <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1.5, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
             {previewDoc ? (
               <>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                   <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                     <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>{previewDoc.type}</Typography>
                     {getRequiredTypes().find(rt => rt.type === previewDoc.type)?.requiresDates && (
                       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                         {previewDoc.type === 'FSSAI License' && (
                           <TextField
                             label="FSSAI Number" size="small"
                             value={previewDoc.metadata?.fssaiNumber || ''}
                             onChange={(e) => handleUpdateMetadata(previewDoc.id, 'fssaiNumber', e.target.value)}
                             disabled={!canModify || !isEditMode}
                             sx={{ width: 316 }}
                           />
                         )}
                         {previewDoc.type === 'GST Docs' && (
                           <TextField
                             label="GST Number" size="small"
                             value={gstNo}
                             onChange={(e) => {
                               setGstNo(e.target.value);
                               setHasUnsavedChanges(true);
                             }}
                             disabled={!canModify || !isEditMode}
                             sx={{ width: 316 }}
                           />
                         )}
                         <Box sx={{ display: 'flex', gap: 2 }}>
                           <TextField 
                             label="Issued On" type="date" size="small" InputLabelProps={{ shrink: true }}
                             value={previewDoc.metadata?.issuedOn || ''}
                             onChange={(e) => handleUpdateMetadata(previewDoc.id, 'issuedOn', e.target.value)}
                             disabled={!canModify || !isEditMode}
                             sx={{ width: 150 }}
                           />
                           <TextField 
                             label="Valid Until" type="date" size="small" InputLabelProps={{ shrink: true }}
                             value={previewDoc.metadata?.validUntil || ''}
                             onChange={(e) => handleUpdateMetadata(previewDoc.id, 'validUntil', e.target.value)}
                             disabled={!canModify || !isEditMode}
                             sx={{ width: 150 }}
                           />
                         </Box>
                       </Box>
                     )}
                   </Box>
                   <Box sx={{ display: 'flex', gap: 1 }}>
                     <Button size="small" variant="outlined" startIcon={<DownloadIcon />} component="a" href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                       Download
                     </Button>
                     {canModify && isEditMode && (
                       <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => handleDelete(previewDoc.id)}>
                         Remove
                       </Button>
                     )}
                   </Box>
                 </Box>
                 <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {getFileType(previewDoc.url, previewDoc.fileName) === 'pdf' ? (
                      <iframe src={previewDoc.url} width="100%" height="100%" style={{ border: 'none' }} title="preview" />
                    ) : getFileType(previewDoc.url, previewDoc.fileName) === 'image' ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
                        <img src={previewDoc.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </Box>
                    ) : getFileType(previewDoc.url, previewDoc.fileName) === 'office' ? (
                      <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDoc.url.startsWith('http') ? previewDoc.url : window.location.origin + previewDoc.url)}`} width="100%" height="100%" style={{ border: 'none' }} title="preview" />
                    ) : getFileType(previewDoc.url, previewDoc.fileName) === 'csv' ? (
                      <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.paper' }}>
                        {previewData ? (
                          <Table size="small" stickyHeader sx={{ minWidth: 650, '& td, & th': { border: '1px solid', borderColor: 'divider', p: 1 } }}>
                            <TableBody>
                              {previewData.map((row, i) => (
                                <TableRow key={i} hover={i !== 0} sx={i === 0 ? { bgcolor: 'grey.100', position: 'sticky', top: 0, zIndex: 1 } : {}}>
                                  {row.map((cell, j) => (
                                    <TableCell key={j} sx={{ whiteSpace: 'nowrap', fontWeight: i === 0 ? 700 : 400 }}>
                                      {cell}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
                             <CircularProgress />
                          </Box>
                        )}
                      </Box>
                    ) : getFileType(previewDoc.url, previewDoc.fileName) === 'text' ? (
                      <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: 'background.paper', color: 'text.primary', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                         <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{previewText}</pre>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
                         <Typography>No inline preview available.</Typography>
                         <Button sx={{ mt: 2 }} variant="contained" component="a" href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                           Open File
                         </Button>
                      </Box>
                    )}
                 </Box>
               </>
             ) : (
               <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                 <Typography>Select an uploaded document to preview.</Typography>
               </Box>
             )}
          </Box>
        </Box>

      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={handleAttemptClose} variant="outlined" color="inherit">{isEditMode || hasUnsavedChanges ? 'Cancel' : 'Close'}</Button>
        {(isEditMode || hasUnsavedChanges) && (
          <Button onClick={handleSaveAll} variant="contained" disabled={loading}>Save All Changes</Button>
        )}
      </DialogActions>
    </Dialog>
    
    <Portal>
      <Backdrop sx={{ color: 'primary.contrastText', zIndex: (theme) => theme.zIndex.modal + 9999, display: 'flex', flexDirection: 'column', gap: 2 }} open={loading}>
        <CircularProgress variant={uploadProgress > 0 && loadingMessage.includes('Uploading') ? "determinate" : "indeterminate"} value={uploadProgress} color="inherit" size={60} />
        <Typography variant="h6">
          {loadingMessage || 'Processing Document...'} 
          {uploadProgress > 0 && loadingMessage.includes('Uploading') ? ` ${uploadProgress}%` : ''}
        </Typography>
      </Backdrop>
    </Portal>

    <Dialog open={showConfirmClose} onClose={() => setShowConfirmClose(false)} PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider' }}>Unsaved Document Warning</DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography>You have unsaved uploaded documents. Do you want to save your changes before leaving?</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={() => setShowConfirmClose(false)} color="inherit" variant="outlined">Cancel</Button>
        <Button onClick={() => { setShowConfirmClose(false); setHasUnsavedChanges(false); onClose(); }} color="error">No, Discard</Button>
        <Button onClick={async () => { setShowConfirmClose(false); await handleSaveAll(); }} color="success" variant="contained">Yes, Save</Button>
      </DialogActions>
    </Dialog>
    
    <Snackbar 
      open={snackbar.open} 
      autoHideDuration={6000} 
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity || 'info'} sx={{ width: '100%', fontWeight: 600 }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
    </>
  );
}
