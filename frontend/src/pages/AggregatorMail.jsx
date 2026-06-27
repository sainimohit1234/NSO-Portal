import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack, 
  Paper, Chip, CardHeader, Divider, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Alert, Dialog, 
  DialogTitle, DialogContent, DialogActions, MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AggregatorMail() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageEmailDirectory = isSuperAdmin || user?.permissions?.split(',').includes('EMAIL_DIRECTORY');

  // Mappings state
  const [mappings, setMappings] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');

  // New mapping form state
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newCc, setNewCc] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editCc, setEditCc] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchMappings = () => {
    axios.get('/api/system/email-mappings')
      .then(res => {
        setMappings(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch email mappings:', err);
        setErrorMsg('Failed to load email configurations from server.');
      });
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const saveMappingsToBackend = async (updatedList) => {
    try {
      const res = await axios.put('/api/system/email-mappings', updatedList);
      setMappings(res.data.config);
      setSuccessMsg('Configurations saved successfully.');
      setErrorMsg('');
    } catch (err) {
      console.error('Failed to save configurations:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save configurations.');
    }
  };

  const validateEmails = (emailStr) => {
    if (!emailStr.trim()) return [];
    const emails = emailStr.split(',').map(e => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address format: "${email}"`);
      }
    }
    return emails;
  };

  const handleAddMapping = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    const cat = newCategory.trim();
    const subCat = newSubCategory.trim();
    
    if (!cat || !subCat) {
      setErrorMsg('Category and Sub-Category are required fields.');
      return;
    }

    // Check duplicate combinations (case insensitive)
    const isDuplicate = mappings.some(
      m => m.category.toLowerCase() === cat.toLowerCase() && m.subCategory.toLowerCase() === subCat.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`A mapping for Category "${cat}" and Sub-Category "${subCat}" already exists.`);
      return;
    }

    try {
      const parsedTo = validateEmails(newTo);
      const parsedCc = validateEmails(newCc);

      const newRow = {
        id: `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: cat,
        subCategory: subCat,
        to: parsedTo,
        cc: parsedCc
      };

      const updated = [...mappings, newRow];
      await saveMappingsToBackend(updated);

      // Reset form
      setNewCategory('');
      setNewSubCategory('');
      setNewTo('');
      setNewCc('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStartEdit = (row) => {
    setEditingId(row.id);
    setEditCategory(row.category);
    setEditSubCategory(row.subCategory);
    setEditTo(row.to.join(', '));
    setEditCc(row.cc.join(', '));
  };

  const handleSaveEdit = async (id) => {
    setErrorMsg('');
    setSuccessMsg('');
    
    const cat = editCategory.trim();
    const subCat = editSubCategory.trim();
    
    if (!cat || !subCat) {
      setErrorMsg('Category and Sub-Category are required fields.');
      return;
    }

    // Check duplicate combinations excluding self
    const isDuplicate = mappings.some(
      m => m.id !== id && m.category.toLowerCase() === cat.toLowerCase() && m.subCategory.toLowerCase() === subCat.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`A mapping for Category "${cat}" and Sub-Category "${subCat}" already exists.`);
      return;
    }

    try {
      const parsedTo = validateEmails(editTo);
      const parsedCc = validateEmails(editCc);

      const updated = mappings.map(m => {
        if (m.id === id) {
          return {
            ...m,
            category: cat,
            subCategory: subCat,
            to: parsedTo,
            cc: parsedCc
          };
        }
        return m;
      });

      await saveMappingsToBackend(updated);
      setEditingId(null);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteMapping = async (id) => {
    const updated = mappings.filter(m => m.id !== id);
    await saveMappingsToBackend(updated);
    setConfirmDeleteId(null);
  };

  const uniqueCategories = ['All', ...new Set(mappings.map(m => m.category))];

  const filteredMappings = mappings.filter(m => {
    if (categoryFilter === 'All') return true;
    return m.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Email Directory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure Category and Sub-Category recipient mappings for automated email dispatches.
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{errorMsg}</Alert>}

      {!canManageEmailDirectory && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>
          You are in view-only mode. You need the "Email Directory" sub-access permission to add, edit, or delete recipient configurations.
        </Alert>
      )}

      <Stack spacing={4}>
        {/* Configuration Card */}
        <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', width: '100%', border: '1px solid', borderColor: 'divider' }}>
          <CardHeader 
            title="Email Recipient Configuration" 
            titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
            subheader="Manage recipient email addresses for Swiggy, Zomato, and other categories"
            action={
              <Box sx={{ display: 'flex', gap: 2, mt: 1, mr: 2 }}>
                <TextField
                  select
                  size="small"
                  label="Filter Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ width: 200 }}
                >
                  {uniqueCategories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Box>
            }
          />
          <Divider />
          <CardContent sx={{ p: 3 }}>
            
            {/* Add Mapping Form (Enabled only for users with permissions) */}
            {canManageEmailDirectory && (
              <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: '12px', bgcolor: 'action.hover' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                  Add New Email Mapping
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Category"
                      placeholder="e.g. Zomato"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Sub-Category"
                      placeholder="e.g. BTC Zomato"
                      value={newSubCategory}
                      onChange={(e) => setNewSubCategory(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="To Recipient List"
                      placeholder="e.g. abc@company.com, xyz@company.com"
                      value={newTo}
                      onChange={(e) => setNewTo(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CC Recipient List"
                      placeholder="e.g. manager@company.com"
                      value={newCc}
                      onChange={(e) => setNewCc(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddMapping}
                      sx={{ borderRadius: '8px', px: 3, fontWeight: 700 }}
                    >
                      Add Mapping
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Table View */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Sub-Category</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>To Recipient List</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>CC Recipient List</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5, align: 'center', width: 140 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary', fontWeight: 600 }}>
                        No email mappings configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMappings.map((row) => {
                      const isEditing = editingId === row.id;
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ py: 1.5 }}>
                            {isEditing ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {row.category}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            {isEditing ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editSubCategory}
                                onChange={(e) => setEditSubCategory(e.target.value)}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {row.subCategory}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            {isEditing ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editTo}
                                onChange={(e) => setEditTo(e.target.value)}
                              />
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {row.to.map((email, idx) => (
                                  <Chip key={idx} label={email} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            {isEditing ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editCc}
                                onChange={(e) => setEditCc(e.target.value)}
                              />
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {row.cc.map((email, idx) => (
                                  <Chip key={idx} label={email} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }} align="center">
                            {isEditing ? (
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton 
                                  size="small" 
                                  color="success" 
                                  onClick={() => handleSaveEdit(row.id)}
                                >
                                  <SaveIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => setEditingId(null)}
                                >
                                  <CloseIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton 
                                  size="small" 
                                  color="primary" 
                                  disabled={!canManageEmailDirectory}
                                  onClick={() => handleStartEdit(row)}
                                >
                                  <EditIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  disabled={!canManageEmailDirectory}
                                  onClick={() => setConfirmDeleteId(row.id)}
                                >
                                  <DeleteIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>

      {/* Confirmation Dialog for Mapping Deletion */}
      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this Category/Sub-Category recipient mapping?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteMapping(confirmDeleteId)} 
            variant="contained" 
            color="error" 
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
