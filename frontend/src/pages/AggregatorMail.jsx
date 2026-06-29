import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack, 
  Paper, Chip, CardHeader, Divider, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Alert, Dialog, 
  DialogTitle, DialogContent, DialogActions, MenuItem, useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  'In Pipeline',
  'Agreement Signed',
  'Ready for Construction',
  'Under Development',
  'Sent to NSO Team for Approval',
  'Approved',
  'On Hold',
  'Compliance Approved',
  'Closed',
  'Live'
];

export default function AggregatorMail() {
  const { user } = useAuth();
  const theme = useTheme();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageEmailDirectory = isSuperAdmin || user?.permissions?.split(',').includes('EMAIL_DIRECTORY');

  // Mappings state
  const [mappings, setMappings] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [mappingType, setMappingType] = useState('general');

  // Expandable tree state
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubCategories, setExpandedSubCategories] = useState({});

  // Email template state
  const [templates, setTemplates] = useState({});
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);

  // New mapping form state
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newCc, setNewCc] = useState('');

  // Editing dialog state
  const [editingRow, setEditingRow] = useState(null);
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

  const fetchTemplates = () => {
    axios.get('/api/system/email-templates')
      .then(res => {
        setTemplates(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch email templates:', err);
      });
  };

  useEffect(() => {
    fetchMappings();
    fetchTemplates();
  }, []);

  // Update template inputs when selected sub-category or saved templates change
  useEffect(() => {
    if (!selectedSubCategory) {
      setTemplateSubject('');
      setTemplateBody('');
      return;
    }
    const temp = templates[selectedSubCategory] || {
      subject: `${selectedSubCategory} | New Store Onboarding`,
      body: `Hi Team,\n\nThis is regarding our new cafe onboarding for ${selectedSubCategory}.\n\nPlease find the details below and initiate the onboarding process.\n\nBest regards,\nOperations Team`
    };
    setTemplateSubject(temp.subject);
    setTemplateBody(temp.body);
  }, [selectedSubCategory, templates]);

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

  const handleSaveTemplate = async () => {
    if (!selectedSubCategory) return;
    setErrorMsg('');
    setSuccessMsg('');

    const updatedTemplates = {
      ...templates,
      [selectedSubCategory]: {
        subject: templateSubject,
        body: templateBody
      }
    };

    try {
      const res = await axios.put('/api/system/email-templates', updatedTemplates);
      setTemplates(res.data.config);
      setIsTemplateEditing(false);
      setSuccessMsg('Email template saved successfully.');
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save email template.');
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
      if (parsedTo.length === 0) {
        setErrorMsg('At least one email ID is mandatory in the To Recipient List.');
        return;
      }
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
      if (mappingType === 'status') {
        setNewCategory('Status Changes');
      } else {
        setNewCategory('');
      }
      setNewSubCategory('');
      setNewTo('');
      setNewCc('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStartEdit = (row) => {
    setEditingRow(row);
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
      if (parsedTo.length === 0) {
        setErrorMsg('At least one email ID is mandatory in the To Recipient List.');
        return;
      }
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
      setEditingRow(null);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteMapping = async (id) => {
    const updated = mappings.filter(m => m.id !== id);
    await saveMappingsToBackend(updated);
    setConfirmDeleteId(null);
  };

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const toggleSubCategory = (subCatId) => {
    setExpandedSubCategories(prev => ({
      ...prev,
      [subCatId]: !prev[subCatId]
    }));
  };

  const uniqueCategories = ['All', ...new Set(mappings.map(m => m.category))];

  const filteredMappings = mappings.filter(m => {
    if (categoryFilter === 'All') return true;
    return m.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  // Sort mappings so categories are grouped together for row spanning
  const sortedMappings = [...filteredMappings].sort((a, b) => {
    const catComp = a.category.localeCompare(b.category);
    if (catComp !== 0) return catComp;
    return a.subCategory.localeCompare(b.subCategory);
  });

  // Group mappings by category
  const categoriesList = [];
  const categoryMap = {};

  sortedMappings.forEach(m => {
    if (!categoryMap[m.category]) {
      categoryMap[m.category] = [];
      categoriesList.push(m.category);
    }
    categoryMap[m.category].push(m);
  });

  // Find To and CC lists for the selected subcategory template
  const matchingMapping = mappings.find(m => m.subCategory === selectedSubCategory) || { to: [], cc: [] };
  const autoToEmails = matchingMapping.to.join(', ');
  const autoCcEmails = matchingMapping.cc.join(', ');

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Email Directory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure Category, Sub-Category recipient mappings, and customize automated email templates.
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{errorMsg}</Alert>}

      {!canManageEmailDirectory && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>
          You are in view-only mode. You need the "Email Directory" sub-access permission to add, edit, or delete recipient and template configurations.
        </Alert>
      )}

      {/* Grid container to split screen side-by-side */}
      <Grid container spacing={4}>
        {/* Left Side: Recipient Mappings (width 50%) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
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
                    sx={{ width: 160 }}
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
                <Paper variant="outlined" sx={{ p: 2.5, mb: 4, borderRadius: '12px', bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                    Add New Email Mapping
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Mapping Type"
                        value={mappingType}
                        onChange={(e) => {
                          const type = e.target.value;
                          setMappingType(type);
                          if (type === 'status') {
                            setNewCategory('Status Changes');
                          } else {
                            setNewCategory('');
                          }
                          setNewSubCategory('');
                        }}
                      >
                        <MenuItem value="general">General (Category / Sub-Category)</MenuItem>
                        <MenuItem value="status">Status Triggered Notification</MenuItem>
                      </TextField>
                    </Grid>

                    {mappingType === 'general' ? (
                      <>
                        <Grid size={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Category"
                            placeholder="e.g. Zomato"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Sub-Category"
                            placeholder="e.g. BTC Zomato"
                            value={newSubCategory}
                            onChange={(e) => setNewSubCategory(e.target.value)}
                          />
                        </Grid>
                      </>
                    ) : (
                      <Grid size={12}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Select Status"
                          value={newSubCategory}
                          onChange={(e) => setNewSubCategory(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>— Select Status —</em>
                          </MenuItem>
                          {STATUS_OPTIONS.map(status => {
                            const isAlreadyMapped = mappings.some(
                              m => m.category === 'Status Changes' && m.subCategory.toLowerCase() === status.toLowerCase()
                            );
                            return (
                              <MenuItem key={status} value={status} disabled={isAlreadyMapped}>
                                {status} {isAlreadyMapped ? '(Already Mapped)' : ''}
                              </MenuItem>
                            );
                          })}
                        </TextField>
                      </Grid>
                    )}
                    <Grid size={12}>
                      <TextField
                        required
                        fullWidth
                        size="small"
                        label="To Recipient List *"
                        placeholder="e.g. abc@company.com, xyz@company.com"
                        value={newTo}
                        onChange={(e) => setNewTo(e.target.value)}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="CC Recipient List"
                        placeholder="e.g. manager@company.com"
                        value={newCc}
                        onChange={(e) => setNewCc(e.target.value)}
                      />
                    </Grid>
                    <Grid size={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
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
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                <Table size="medium" sx={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#00363a' : '#006064' }}>
                      <TableCell sx={{ fontWeight: 800, py: 2, color: '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? '#004d40' : '#004d40'}`, width: '15%' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 2, color: '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? '#004d40' : '#004d40'}`, width: '20%' }}>Sub-Category</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 2, color: '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? '#004d40' : '#004d40'}`, width: '30%' }}>To</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 2, color: '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? '#004d40' : '#004d40'}`, width: '25%' }}>CC</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 2, color: '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? '#004d40' : '#004d40'}`, width: '10%', textAlign: 'center' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoriesList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                          No email mappings configured.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoriesList.map((catName) => {
                        const catRows = categoryMap[catName];
                        const isCatExpanded = !!expandedCategories[catName];

                        const catLower = catName.toLowerCase();
                        
                        // Theme-friendly background colors
                        const catBg = catLower === 'zomato' 
                          ? (theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD')
                          : catLower === 'swiggy'
                            ? (theme.palette.mode === 'dark' ? 'rgba(255, 235, 59, 0.15)' : '#FFF9C4')
                            : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F5F5F5');

                        const recBg = catLower === 'swiggy'
                          ? (theme.palette.mode === 'dark' ? 'rgba(0, 188, 212, 0.1)' : '#E0F7FA')
                          : (theme.palette.mode === 'dark' ? 'transparent' : '#FFFFFF');

                        const cellBorder = `1px solid ${theme.palette.divider}`;

                        if (!isCatExpanded) {
                          return (
                            <TableRow key={`cat_summary_${catName}`}>
                              <TableCell 
                                align="left"
                                onClick={() => toggleCategory(catName)}
                                sx={{ 
                                  fontWeight: 800, 
                                  bgcolor: catBg, 
                                  color: 'text.primary',
                                  cursor: 'pointer',
                                  border: cellBorder,
                                  py: 1.5,
                                  userSelect: 'none',
                                  '&:hover': { opacity: 0.8 }
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                  ▶ {catName}
                                </Typography>
                              </TableCell>
                              <TableCell 
                                onClick={() => toggleCategory(catName)}
                                sx={{ 
                                  bgcolor: catBg, 
                                  border: cellBorder, 
                                  color: 'text.secondary', 
                                  fontStyle: 'italic', 
                                  fontSize: '0.8rem', 
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  '&:hover': { opacity: 0.8 } 
                                }}
                              >
                                {catRows.length} sub-categories
                              </TableCell>
                              <TableCell sx={{ bgcolor: recBg, border: cellBorder }} />
                              <TableCell sx={{ bgcolor: recBg, border: cellBorder }} />
                              <TableCell sx={{ border: cellBorder }} />
                            </TableRow>
                          );
                        }

                        return catRows.map((row, idx) => {
                          const isSubExpanded = !!expandedSubCategories[row.id];
                          const isFirst = idx === 0;

                          return (
                            <TableRow key={row.id}>
                              {isFirst && (
                                <TableCell 
                                  rowSpan={catRows.length} 
                                  align="left"
                                  onClick={() => toggleCategory(catName)}
                                  sx={{ 
                                    fontWeight: 800, 
                                    bgcolor: catBg, 
                                    color: 'text.primary',
                                    verticalAlign: 'middle',
                                    border: cellBorder,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    '&:hover': { opacity: 0.8 }
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    ▼ {catName}
                                  </Typography>
                                </TableCell>
                              )}
                              <TableCell 
                                onClick={() => toggleSubCategory(row.id)}
                                sx={{ 
                                  bgcolor: catBg, 
                                  border: cellBorder,
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  '&:hover': { opacity: 0.8 }
                                }}
                              >
                                {isSubExpanded ? '▼ ' : '▶ '} {row.subCategory}
                              </TableCell>
                              <TableCell sx={{ bgcolor: recBg, border: cellBorder, py: 1.5 }}>
                                {isSubExpanded ? (
                                  <Stack spacing={0.5}>
                                    {row.to.map((email, idx) => (
                                      <Typography 
                                        key={idx} 
                                        variant="body2" 
                                        sx={{ 
                                          fontSize: '0.725rem', 
                                          color: 'text.primary',
                                          wordBreak: 'break-all',
                                          lineHeight: 1.2
                                        }}
                                      >
                                        {email}
                                      </Typography>
                                    ))}
                                  </Stack>
                                ) : (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ fontStyle: 'italic', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => toggleSubCategory(row.id)}
                                  >
                                    Click to view
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ bgcolor: recBg, border: cellBorder, py: 1.5 }}>
                                {isSubExpanded ? (
                                  <Stack spacing={0.5}>
                                    {row.cc.map((email, idx) => (
                                      <Typography 
                                        key={idx} 
                                        variant="body2" 
                                        sx={{ 
                                          fontSize: '0.725rem', 
                                          color: 'text.primary',
                                          wordBreak: 'break-all',
                                          lineHeight: 1.2
                                        }}
                                      >
                                        {email}
                                      </Typography>
                                    ))}
                                  </Stack>
                                ) : (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ fontStyle: 'italic', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => toggleSubCategory(row.id)}
                                  >
                                    Click to view
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ border: cellBorder }} align="center">
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <IconButton 
                                    size="small" 
                                    color="primary" 
                                    disabled={!canManageEmailDirectory}
                                    onClick={() => handleStartEdit(row)}
                                  >
                                    <EditIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    color="error" 
                                    disabled={!canManageEmailDirectory}
                                    onClick={() => setConfirmDeleteId(row.id)}
                                  >
                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Email Template Configuration (width 50%) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardHeader
              title="Email Template Configuration"
              titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
              subheader="Configure custom subject and body templates per sub-category"
            />
            <Divider />
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Sub-Category"
                  value={selectedSubCategory}
                  onChange={(e) => {
                    setSelectedSubCategory(e.target.value);
                    setIsTemplateEditing(false);
                  }}
                  helperText="Select a sub-category to load its recipient list and email template"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {mappings.map(m => (
                    <MenuItem key={m.id} value={m.subCategory}>
                      {m.subCategory}
                    </MenuItem>
                  ))}
                </TextField>

                {selectedSubCategory ? (
                  <>
                    <TextField
                      fullWidth
                      disabled
                      size="small"
                      label="To Recipient(s) (Auto-filled)"
                      value={autoToEmails || 'No recipients configured'}
                    />

                    <TextField
                      fullWidth
                      disabled
                      size="small"
                      label="CC Recipient(s) (Auto-filled)"
                      value={autoCcEmails || 'No CC recipients configured'}
                    />

                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Template Customization
                        </Typography>
                        {canManageEmailDirectory && (
                          <IconButton 
                            size="small" 
                            color={isTemplateEditing ? 'error' : 'primary'}
                            onClick={() => {
                              if (isTemplateEditing) {
                                // Discard/Reset template
                                const temp = templates[selectedSubCategory] || { subject: '', body: '' };
                                setTemplateSubject(temp.subject);
                                setTemplateBody(temp.body);
                              }
                              setIsTemplateEditing(!isTemplateEditing);
                            }}
                          >
                            {isTemplateEditing ? <CloseIcon /> : <EditIcon />}
                          </IconButton>
                        )}
                      </Box>

                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Subject"
                          value={templateSubject}
                          onChange={(e) => setTemplateSubject(e.target.value)}
                          disabled={!isTemplateEditing}
                        />

                        <TextField
                          fullWidth
                          multiline
                          rows={10}
                          size="small"
                          label="Email Body"
                          value={templateBody}
                          onChange={(e) => setTemplateBody(e.target.value)}
                          disabled={!isTemplateEditing}
                        />
                      </Stack>

                      {isTemplateEditing && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveTemplate}
                            sx={{ borderRadius: '8px', px: 3, fontWeight: 700 }}
                          >
                            Save Template
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, border: '1px dashed', borderColor: 'divider', borderRadius: '12px' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Please select a Sub-Category from the dropdown to load and edit its template.
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={editingRow !== null}
        onClose={() => setEditingRow(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Email Mapping</DialogTitle>
        <DialogContent>
           <Stack spacing={2.5} sx={{ mt: 1.5 }}>
            {editingRow?.category === 'Status Changes' ? (
              <TextField
                select
                fullWidth
                label="Select Status"
                value={editSubCategory}
                onChange={(e) => setEditSubCategory(e.target.value)}
              >
                {STATUS_OPTIONS.map(status => {
                  const isAlreadyMapped = mappings.some(
                    m => m.id !== editingRow.id && m.category === 'Status Changes' && m.subCategory.toLowerCase() === status.toLowerCase()
                  );
                  return (
                    <MenuItem key={status} value={status} disabled={isAlreadyMapped}>
                      {status} {isAlreadyMapped ? '(Already Mapped)' : ''}
                    </MenuItem>
                  );
                })}
              </TextField>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Sub-Category"
                  value={editSubCategory}
                  onChange={(e) => setEditSubCategory(e.target.value)}
                />
              </>
            )}
            <TextField
              required
              fullWidth
              multiline
              rows={3}
              label="To Recipient List * (comma-separated)"
              placeholder="e.g. abc@company.com, xyz@company.com"
              value={editTo}
              onChange={(e) => setEditTo(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="CC Recipient List (comma-separated)"
              placeholder="e.g. manager@company.com"
              value={editCc}
              onChange={(e) => setEditCc(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingRow(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSaveEdit(editingRow.id)} 
            variant="contained" 
            color="primary" 
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

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
