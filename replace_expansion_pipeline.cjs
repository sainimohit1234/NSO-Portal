const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

// 1. Add uploadStore state
if (!content.includes('const [uploadStore, setUploadStore]')) {
  content = content.replace(
    /const \[stores, setStores\] = useState\(\[\]\);\n\s*const \[loading, setLoading\] = useState\(true\);/,
    `const [stores, setStores] = useState([]);\n  const [loading, setLoading] = useState(true);\n\n  // Upload Modal State\n  const [uploadStore, setUploadStore] = useState(null);\n  const [selectedFiles, setSelectedFiles] = useState({ loi: null, budget: null, agreement: null });`
  );
}

// 2. Add handleFileChangeForSlot, handleSaveFileSlot, handleDeleteFileSlot
if (!content.includes('const handleFileChangeForSlot =')) {
  const insertIndex = content.indexOf('// Delete Row / Store');
  const functions = `
  // File selection slot update
  const handleFileChangeForSlot = (e, slot) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 200 * 1024; // 200kb
      if (file.size > maxSize) {
        setSnackbar({ open: true, message: 'Upload blocked: File size must not exceed 200KB.', severity: 'error' });
        e.target.value = '';
        return;
      }
      setSelectedFiles(prev => ({ ...prev, [slot]: file }));
    }
  };

  // Upload file and update store doc
  const handleSaveFileSlot = async (slot) => {
    const file = selectedFiles[slot];
    if (!file || !uploadStore) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(\`/api/stores/upload-file?type=\${slot}\`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.url;

      const updatedFields = { [\`\${slot}Url\`]: fileUrl, [\`\${slot}FileName\`]: file.name };
      if (slot === 'loi') {
        updatedFields.status = 'Agreement Signed';
      }
      
      if (uploadStore.isTemp || String(uploadStore.id).startsWith('temp_')) {
        setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
        setUploadStore(prev => ({ ...prev, ...updatedFields }));
        setSelectedFiles(prev => ({ ...prev, [slot]: null }));
        setSnackbar({ open: true, message: \`\${slot.toUpperCase()} file uploaded. Click Save on the row to save details.\`, severity: 'success' });
      } else {
        await axios.put(\`/api/stores/\${uploadStore.id}\`, updatedFields);
        setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
        setUploadStore(prev => ({ ...prev, ...updatedFields }));
        setSelectedFiles(prev => ({ ...prev, [slot]: null }));
        setSnackbar({ open: true, message: \`\${slot.toUpperCase()} file uploaded and saved.\`, severity: 'success' });
        loadData();
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to upload file.', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete uploaded file slot
  const handleDeleteFileSlot = async (slot) => {
    if (!uploadStore) return;
    const updatedFields = { [\`\${slot}Url\`]: null, [\`\${slot}FileName\`]: null };
    if (slot === 'loi') {
      updatedFields.status = 'In Pipeline';
    }
    
    if (uploadStore.isTemp || String(uploadStore.id).startsWith('temp_')) {
      setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
      setUploadStore(prev => ({ ...prev, ...updatedFields }));
      setSnackbar({ open: true, message: \`\${slot.toUpperCase()} file removed locally.\`, severity: 'success' });
      return;
    }

    try {
      setLoading(true);
      await axios.put(\`/api/stores/\${uploadStore.id}\`, updatedFields);
      setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...updatedFields } : s));
      setUploadStore(prev => ({ ...prev, ...updatedFields }));
      setSnackbar({ open: true, message: \`\${slot.toUpperCase()} file deleted.\`, severity: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to delete file.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
`;
  content = content.slice(0, insertIndex) + functions + content.slice(insertIndex);
}

// 3. Replace TableHead
const oldTableHeadRegex = /<TableCell sx={{ fontWeight: 800, width: 180 }}>Upload LOI<\/TableCell>\n\s*<TableCell sx={{ fontWeight: 800, width: 180 }}>Budget File<\/TableCell>\n\s*<TableCell sx={{ fontWeight: 800, width: 220 }}>Lease \/ Rental Agreement<\/TableCell>/g;
const newTableHead = `<TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>LEGAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>FINANCIAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>PROJECT DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 220, textAlign: 'center' }}>MISCELLANEOUS DOCUMENTS</TableCell>`;
content = content.replace(oldTableHeadRegex, newTableHead);

// 4. Update the sticky frozen columns in TableHead to have #f8fafc bgcolor
content = content.replace(
  /<TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, fontWeight: 800, width: 50 }}>S.No.<\/TableCell>/,
  `<TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, fontWeight: 800, width: 50, bgcolor: '#f8fafc', color: '#1e293b' }}>S.No.</TableCell>`
);
content = content.replace(
  /<TableCell sx={{ position: 'sticky', left: 50, zIndex: 4, fontWeight: 800, width: 200 }}>Brand<\/TableCell>/,
  `<TableCell sx={{ position: 'sticky', left: 50, zIndex: 4, fontWeight: 800, width: 200, bgcolor: '#f8fafc', color: '#1e293b' }}>Brand</TableCell>`
);
content = content.replace(
  /<TableCell sx={{ position: 'sticky', left: 250, zIndex: 4, fontWeight: 800, width: 300, borderRight: '1.5px solid', borderColor: 'divider' }}>Café Name<\/TableCell>/,
  `<TableCell sx={{ position: 'sticky', left: 250, zIndex: 4, fontWeight: 800, width: 300, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: '#f8fafc', color: '#1e293b' }}>Café Name</TableCell>`
);

content = content.replace(
  /<TableCell sx={{ fontWeight: 800, width: 150 }}>Café Code<\/TableCell>/,
  `<TableCell sx={{ position: 'sticky', left: 550, zIndex: 4, fontWeight: 800, width: 150, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: '#f8fafc', color: '#1e293b' }}>Café Code</TableCell>`
);

content = content.replace(
  /<TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', fontWeight: 800 }}>\{index \+ 1\}<\/TableCell>/,
  `<TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#f8fafc', color: '#1e293b', fontWeight: 800 }}>{index + 1}</TableCell>`
);
content = content.replace(
  /<TableCell sx={{ position: 'sticky', left: 50, bgcolor: 'background.paper', zIndex: 1 }}>/g,
  `<TableCell sx={{ position: 'sticky', left: 50, bgcolor: '#f8fafc', zIndex: 1 }}>`
);
content = content.replace(
  /<TableCell sx={{ position: 'sticky', left: 250, bgcolor: 'background.paper', zIndex: 1, fontWeight: 700, color: 'primary.main', borderRight: '1.5px solid', borderColor: 'divider' }}>/g,
  `<TableCell sx={{ position: 'sticky', left: 250, bgcolor: '#f8fafc', zIndex: 1, fontWeight: 700, color: 'primary.main', borderRight: '1.5px solid', borderColor: 'divider' }}>`
);
content = content.replace(
  /<TableCell>\n\s*<Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>\n\s*\{store.cafeCode \|\| '—'\}\n\s*<\/Typography>\n\s*<\/TableCell>/g,
  `<TableCell sx={{ position: 'sticky', left: 550, bgcolor: '#f8fafc', zIndex: 1, borderRight: '1.5px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
                          {store.cafeCode || '—'}
                        </Typography>
                      </TableCell>`
);


// 5. Replace inline document upload columns with grouped document pills in TableRow
const oldUploadCellsRegex = /\{\/\* Upload LOI Column \*\/\}\n\s*<TableCell>[\s\S]*?\{\/\* Lease \/ Rental Agreement Column \*\/\}\n\s*<TableCell>[\s\S]*?<\/TableCell>/;

const newUploadCells = `                      {/* LEGAL DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label={store.loiUrl && store.agreementUrl ? "Documents Uploaded" : "Awaiting Documents"} 
                          onClick={() => setUploadStore(store)}
                          sx={{ 
                            bgcolor: store.loiUrl && store.agreementUrl ? 'success.light' : 'warning.light', 
                            color: store.loiUrl && store.agreementUrl ? 'success.dark' : 'warning.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: store.loiUrl && store.agreementUrl ? 'success.main' : 'warning.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>
                      {/* FINANCIAL DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label={store.budgetUrl ? "Documents Uploaded" : "Awaiting Documents"} 
                          onClick={() => setUploadStore(store)}
                          sx={{ 
                            bgcolor: store.budgetUrl ? 'success.light' : 'warning.light', 
                            color: store.budgetUrl ? 'success.dark' : 'warning.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: store.budgetUrl ? 'success.main' : 'warning.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>
                      {/* PROJECT DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label="Awaiting Documents" 
                          onClick={() => setUploadStore(store)}
                          sx={{ 
                            bgcolor: 'warning.light', 
                            color: 'warning.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'warning.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>
                      {/* MISCELLANEOUS DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label="Optional" 
                          onClick={() => setUploadStore(store)}
                          sx={{ 
                            bgcolor: 'info.light', 
                            color: 'info.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'info.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>`;

content = content.replace(oldUploadCellsRegex, newUploadCells);

// 6. Add Upload Dialog at the end (before last </Box>)
const uploadDialogCode = `
      {/* Upload Documents Dialog */}
      <Dialog 
        open={!!uploadStore} 
        onClose={() => { setUploadStore(null); setPreviewUrl(null); setPreviewName(''); }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.default' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Manage Project Documents - {uploadStore?.cafeName || 'Untitled'}
        </DialogTitle>
        <DialogContent>
          {uploadStore && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Left Column: Upload Controls */}
              <Grid item xs={12} md={previewUrl ? 6 : 12}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Category: LEGAL DOCUMENTS */}
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: '#fff' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2 }}>
                      LEGAL DOCUMENTS
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Upload LOI</Typography>
                      {uploadStore.loiUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => { setPreviewUrl(uploadStore.loiUrl); setPreviewName(uploadStore.loiFileName || 'LOI Document'); }}
                            sx={{ fontWeight: 800, textDecoration: 'none' }}
                          >
                            {uploadStore.loiFileName || 'LOI Document'}
                          </Link>
                          {(!uploadStore.isLocked || canModify) && (
                            <IconButton size="small" color="error" onClick={() => handleDeleteFileSlot('loi')}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />}>
                            Select File
                            <input type="file" hidden onChange={(e) => handleFileChangeForSlot(e, 'loi')} />
                          </Button>
                          {selectedFiles.loi ? (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption">{selectedFiles.loi.name}</Typography>
                              <Button size="small" variant="contained" color="success" onClick={() => handleSaveFileSlot('loi')}>Save</Button>
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">No file selected</Typography>}
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Lease / Rental Agreement</Typography>
                      {uploadStore.agreementUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => { setPreviewUrl(uploadStore.agreementUrl); setPreviewName(uploadStore.agreementFileName || 'Agreement Document'); }}
                            sx={{ fontWeight: 800, textDecoration: 'none' }}
                          >
                            {uploadStore.agreementFileName || 'Agreement Document'}
                          </Link>
                          {(!uploadStore.isLocked || canModify) && (
                            <IconButton size="small" color="error" onClick={() => handleDeleteFileSlot('agreement')}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />}>
                            Select File
                            <input type="file" hidden onChange={(e) => handleFileChangeForSlot(e, 'agreement')} />
                          </Button>
                          {selectedFiles.agreement ? (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption">{selectedFiles.agreement.name}</Typography>
                              <Button size="small" variant="contained" color="success" onClick={() => handleSaveFileSlot('agreement')}>Save</Button>
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">No file selected</Typography>}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Category: FINANCIAL DOCUMENTS */}
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: '#fff' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2 }}>
                      FINANCIAL DOCUMENTS
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Budget File</Typography>
                      {uploadStore.budgetUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => { setPreviewUrl(uploadStore.budgetUrl); setPreviewName(uploadStore.budgetFileName || 'Budget File'); }}
                            sx={{ fontWeight: 800, textDecoration: 'none' }}
                          >
                            {uploadStore.budgetFileName || 'Budget File'}
                          </Link>
                          {(!uploadStore.isLocked || canModify) && (
                            <IconButton size="small" color="error" onClick={() => handleDeleteFileSlot('budget')}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />}>
                            Select File
                            <input type="file" hidden onChange={(e) => handleFileChangeForSlot(e, 'budget')} />
                          </Button>
                          {selectedFiles.budget ? (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption">{selectedFiles.budget.name}</Typography>
                              <Button size="small" variant="contained" color="success" onClick={() => handleSaveFileSlot('budget')}>Save</Button>
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">No file selected</Typography>}
                        </Box>
                      )}
                    </Box>
                  </Box>

                </Box>
              </Grid>

              {/* Right Column: File Viewer */}
              {previewUrl && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 2 }}>
                        File Viewer: {previewName}
                      </Typography>
                      <Button size="small" color="error" onClick={() => { setPreviewUrl(null); setPreviewName(''); }}>
                        Close Preview
                      </Button>
                    </Box>
                    <Box sx={{ flexGrow: 1, minHeight: 400 }}>
                      {getFileType(previewUrl, previewName) === 'pdf' ? (
                        <iframe src={previewUrl} width="100%" height="400px" style={{ border: 'none', backgroundColor: '#fff' }} />
                      ) : getFileType(previewUrl, previewName) === 'image' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1, bgcolor: '#fff', height: 400 }}>
                          <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }} />
                        </Box>
                      ) : (
                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#fff', height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ mb: 2 }}>No inline preview available for this file.</Typography>
                          <Button component="a" href={previewUrl} target="_blank" rel="noopener noreferrer" variant="contained">
                            Open in New Tab
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setUploadStore(null); setPreviewUrl(null); setPreviewName(''); }} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
`;

const insertDialogIndex = content.lastIndexOf('</Box>');
content = content.slice(0, insertDialogIndex) + uploadDialogCode + content.slice(insertDialogIndex);

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log('Done replacement.');
