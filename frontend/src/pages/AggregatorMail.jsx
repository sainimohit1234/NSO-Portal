import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack,
  Paper, CardHeader, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Alert, Dialog, 
  DialogTitle, DialogContent, DialogActions, MenuItem, useTheme,
  Tabs, Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import PaletteIcon from '@mui/icons-material/Palette';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  'In Pipeline',
  'Agreement Signed',
  'Ready for Construction',
  'Under Construction',
  'Sent to NSO Team for Approval',
  'Approved',
  'On Hold',
  'Compliance Approved',
  'Closed',
  'Live',
  'Draft a mail for BTC | Zomato',
  'Draft a mail for BTC | Swiggy',
  'Draft a mail for SAB | Zomato',
  'Draft a mail for SAB | Swiggy',
  'Draft a mail for GT | Zomato',
  'Draft a mail for GT | Swiggy',
];

const htmlToTextMessage = (html) => {
  if (!html) return '';
  let txt = html.replace(/<br\s*\/?>/gi, '\n');
  txt = txt.replace(/<\/p>|<\/div>/gi, '\n');
  txt = txt.replace(/<[^>]*>/g, '');
  const tempDoc = new DOMParser().parseFromString(txt, 'text/html');
  return tempDoc.body.textContent || tempDoc.body.innerText || txt;
};

const parseTemplateBody = (bodyHtml) => {
  if (!bodyHtml) return { intro: '', outro: '', tableData: null };
  const parser = new DOMParser();
  const doc = parser.parseFromString(bodyHtml, 'text/html');
  const table = doc.querySelector('table');
  
  let intro = '';
  let outro = '';
  let tableData = null;

  if (table) {
    let prev = table.previousSibling;
    const intros = [];
    while (prev) {
      intros.unshift(prev.nodeType === Node.TEXT_NODE ? prev.textContent : (prev.outerHTML || prev.textContent || ''));
      prev = prev.previousSibling;
    }
    intro = htmlToTextMessage(intros.join(''));

    let next = table.nextSibling;
    const outros = [];
    while (next) {
      outros.push(next.nodeType === Node.TEXT_NODE ? next.textContent : (next.outerHTML || next.textContent || ''));
      next = next.nextSibling;
    }
    outro = htmlToTextMessage(outros.join(''));

    const headers = [];
    const theadRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (theadRow) {
      const headerCells = theadRow.querySelectorAll('th, td');
      headerCells.forEach(cell => {
        headers.push({
          text: cell.textContent?.trim() || '',
          bgColor: cell.style.backgroundColor || '',
          textColor: cell.style.color || '',
          align: cell.style.textAlign || '',
          vAlign: cell.style.verticalAlign || '',
          fontWeight: cell.style.fontWeight || '',
          fontStyle: cell.style.fontStyle || ''
        });
      });
    }

    const rows = [];
    const bodyRows = table.querySelectorAll('tbody tr').length > 0
      ? table.querySelectorAll('tbody tr')
      : Array.from(table.querySelectorAll('tr')).slice(1);

    bodyRows.forEach(tr => {
      const rowCells = [];
      tr.querySelectorAll('td').forEach(td => {
        rowCells.push({
          text: td.textContent?.trim() || '',
          bgColor: td.style.backgroundColor || '',
          textColor: td.style.color || '',
          align: td.style.textAlign || '',
          vAlign: td.style.verticalAlign || '',
          fontWeight: td.style.fontWeight || '',
          fontStyle: td.style.fontStyle || ''
        });
      });
      rows.push(rowCells);
    });

    tableData = { headers, rows };
  } else {
    intro = htmlToTextMessage(bodyHtml);
  }

  return { intro: intro.trim(), outro: outro.trim(), tableData };
};

const compileVisualToHtml = (intro, outro, table) => {
  const formattedIntro = (intro || '').replace(/\n/g, '<br />');
  const formattedOutro = (outro || '').replace(/\n/g, '<br />');
  
  let html = formattedIntro;
  if (table) {
    html += '<table style="width: 100%; max-width: 900px; border-collapse: collapse; margin: 15px 0; text-align: left;">';
    html += '<thead><tr style="background-color: #f8fafc;">';
    table.headers.forEach(h => {
      const bgStyle = h.bgColor ? ` background-color: ${h.bgColor};` : '';
      const colorStyle = h.textColor ? ` color: ${h.textColor};` : '';
      const alignStyle = h.align ? ` text-align: ${h.align};` : '';
      const vAlignStyle = h.vAlign ? ` vertical-align: ${h.vAlign};` : '';
      const fwStyle = h.fontWeight ? ` font-weight: ${h.fontWeight};` : ' font-weight: bold;';
      const fsStyle = h.fontStyle ? ` font-style: ${h.fontStyle};` : '';
      html += `<th style="border: 2px solid #000; padding: 8px;${alignStyle}${vAlignStyle}${fwStyle}${fsStyle}${bgStyle}${colorStyle}">${h.text}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    table.rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        const bgStyle = cell.bgColor ? ` background-color: ${cell.bgColor};` : '';
        const colorStyle = cell.textColor ? ` color: ${cell.textColor};` : '';
        const alignStyle = cell.align ? ` text-align: ${cell.align};` : '';
        const vAlignStyle = cell.vAlign ? ` vertical-align: ${cell.vAlign};` : '';
        const fwStyle = cell.fontWeight ? ` font-weight: ${cell.fontWeight};` : '';
        const fsStyle = cell.fontStyle ? ` font-style: ${cell.fontStyle};` : '';
        html += `<td style="border: 2px solid #000; padding: 8px;${alignStyle}${vAlignStyle}${fwStyle}${fsStyle}${bgStyle}${colorStyle}">${cell.text}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
  }
  html += formattedOutro;
  return html;
};

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

  // Visual Editor states
  const [editorTab, setEditorTab] = useState('visual');
  const [introText, setIntroText] = useState('');
  const [outroText, setOutroText] = useState('');
  const [tableData, setTableData] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [formatDialogType, setFormatDialogType] = useState(null); // 'text' | 'bg'
  const [selectionDragState, setSelectionDragState] = useState(null);

  const addRow = () => {
    if (!tableData) return;
    const newRow = Array(tableData.headers.length).fill(null).map(() => ({ text: '', bgColor: '', textColor: '', align: '', vAlign: '', fontWeight: '', fontStyle: '' }));
    const updated = {
      ...tableData,
      rows: [...tableData.rows, newRow]
    };
    setTableData(updated);
    setTemplateBody(compileVisualToHtml(introText, outroText, updated));
  };

  const deleteRow = (rowIndex) => {
    if (!tableData) return;
    const updatedRows = tableData.rows.filter((_, idx) => idx !== rowIndex);
    const updated = { ...tableData, rows: updatedRows };
    setTableData(updated);
    setTemplateBody(compileVisualToHtml(introText, outroText, updated));
  };

  const addColumn = () => {
    if (!tableData) return;
    const updatedHeaders = [...tableData.headers, { text: `Header ${tableData.headers.length + 1}`, bgColor: '', textColor: '', align: '', vAlign: '', fontWeight: '', fontStyle: '' }];
    const updatedRows = tableData.rows.map(row => [...row, { text: '', bgColor: '', textColor: '', align: '', vAlign: '', fontWeight: '', fontStyle: '' }]);
    const updated = { headers: updatedHeaders, rows: updatedRows };
    setTableData(updated);
    setTemplateBody(compileVisualToHtml(introText, outroText, updated));
  };

  const deleteColumn = (colIndex) => {
    if (!tableData) return;
    const updatedHeaders = tableData.headers.filter((_, idx) => idx !== colIndex);
    const updatedRows = tableData.rows.map(row => row.filter((_, idx) => idx !== colIndex));
    const updated = { headers: updatedHeaders, rows: updatedRows };
    setTableData(updated);
    setTemplateBody(compileVisualToHtml(introText, outroText, updated));
  };

  const updateCellText = (type, rIdx, cIdx, val) => {
    if (!tableData) return;
    let updated;
    if (type === 'header') {
      const headers = [...tableData.headers];
      headers[cIdx] = { ...headers[cIdx], text: val };
      updated = { ...tableData, headers };
    } else {
      const rows = [...tableData.rows];
      rows[rIdx] = [...rows[rIdx]];
      rows[rIdx][cIdx] = { ...rows[rIdx][cIdx], text: val };
      updated = { ...tableData, rows };
    }
    setTableData(updated);
    setTemplateBody(compileVisualToHtml(introText, outroText, updated));
  };

  const applyFormattingToSelection = (property, value) => {
    if (!tableData || selectedCells.length === 0) return;
    let updatedHeaders = [...tableData.headers];
    let updatedRows = tableData.rows.map(r => [...r]);

    selectedCells.forEach(sel => {
      if (sel.type === 'header') {
        updatedHeaders[sel.colIndex] = { ...updatedHeaders[sel.colIndex], [property]: value };
      } else {
        updatedRows[sel.rowIndex][sel.colIndex] = { ...updatedRows[sel.rowIndex][sel.colIndex], [property]: value };
      }
    });

    const updated = { headers: updatedHeaders, rows: updatedRows };
    setTableData(updated);
    setTemplateBody(compileVisualToHtml(introText, outroText, updated));
  };

  const handleCellClick = (type, rowIndex, colIndex, event) => {
    const isShiftOrCtrl = event.shiftKey || event.ctrlKey || event.metaKey;
    const cellId = `${type}-${rowIndex}-${colIndex}`;
    const exists = selectedCells.find(c => c.type === type && c.rowIndex === rowIndex && c.colIndex === colIndex);

    if (isShiftOrCtrl) {
      if (exists) {
        setSelectedCells(selectedCells.filter(c => !(c.type === type && c.rowIndex === rowIndex && c.colIndex === colIndex)));
      } else {
        setSelectedCells([...selectedCells, { type, rowIndex, colIndex }]);
      }
    } else {
      setSelectedCells([{ type, rowIndex, colIndex }]);
    }
  };

  const isCellSelected = (type, rowIndex, colIndex) => {
    return selectedCells.some(c => c.type === type && c.rowIndex === rowIndex && c.colIndex === colIndex);
  };

  const updateIntroText = (val) => {
    setIntroText(val);
    setTemplateBody(compileVisualToHtml(val, outroText, tableData));
  };

  const updateOutroText = (val) => {
    setOutroText(val);
    setTemplateBody(compileVisualToHtml(introText, val, tableData));
  };

  const bodyRef = React.useRef(null);


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
      setIntroText('');
      setOutroText('');
      setTableData(null);
      return;
    }
    const temp = templates[selectedSubCategory] || {
      subject: `${selectedSubCategory} | New Store Onboarding`,
      body: `Hi Team,\n\nThis is regarding our new cafe onboarding for ${selectedSubCategory}.\n\nPlease find the details below and initiate the onboarding process.\n\nBest regards,\nOperations Team`
    };
    setTemplateSubject(temp.subject);
    setTemplateBody(temp.body);

    const { intro, outro, tableData: parsedTable } = parseTemplateBody(temp.body);
    setIntroText(intro);
    setOutroText(outro);
    setTableData(parsedTable);
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
                              } else {
                                const { intro, outro, tableData: parsedTable } = parseTemplateBody(templateBody);
                                setIntroText(intro);
                                setOutroText(outro);
                                setTableData(parsedTable);
                                setEditorTab('visual');
                              }
                              setIsTemplateEditing(!isTemplateEditing);
                            }}
                          >
                            {isTemplateEditing ? <CloseIcon /> : <EditIcon />}
                          </IconButton>
                        )}
                      </Box>

                      <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Subject"
                          value={templateSubject}
                          onChange={(e) => setTemplateSubject(e.target.value)}
                          disabled={!isTemplateEditing}
                        />

                        {isTemplateEditing && (
                          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                            <Tabs
                              value={editorTab}
                              onChange={(_, newValue) => {
                                if (newValue === 'visual') {
                                  // Sync code back to visual states
                                  const { intro, outro, tableData: parsedTable } = parseTemplateBody(templateBody);
                                  setIntroText(intro);
                                  setOutroText(outro);
                                  setTableData(parsedTable);
                                }
                                setEditorTab(newValue);
                              }}
                              aria-label="editor mode tabs"
                            >
                              <Tab label="Visual Spreadsheet Editor" value="visual" sx={{ textTransform: 'none', fontWeight: 600 }} />
                              <Tab label="HTML Source Code" value="html" sx={{ textTransform: 'none', fontWeight: 600 }} />
                            </Tabs>
                          </Box>
                        )}

                        {!isTemplateEditing ? (
                          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: '#ffffff', minHeight: '250px', overflow: 'auto' }}>
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                                Email Template Preview (Live Render)
                              </Typography>
                            </Box>
                            <Box sx={{ p: 3 }}>
                              <div 
                                dangerouslySetInnerHTML={{ __html: templateBody || '' }} 
                                style={{
                                  fontSize: '0.875rem',
                                  color: '#334155',
                                  lineHeight: '1.6'
                                }}
                              />
                            </Box>
                          </Box>
                        ) : editorTab === 'visual' ? (
                          <Stack spacing={2}>
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              size="small"
                              label="Intro Body Paragraph(s)"
                              placeholder="Write intro email content here..."
                              value={introText}
                              onChange={(e) => updateIntroText(e.target.value)}
                            />

                            {/* Spreadsheet Visual Table Grid */}
                            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                  Email Table Grid Builder
                                </Typography>
                                {!tableData ? (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                      const defaultTable = {
                                        headers: [
                                          { text: 'Header 1', bgColor: '#f8fafc', textColor: '#334155' },
                                          { text: 'Header 2', bgColor: '#f8fafc', textColor: '#334155' }
                                        ],
                                        rows: [
                                          [
                                            { text: 'Row 1 Col 1', bgColor: '', textColor: '' },
                                            { text: 'Row 1 Col 2', bgColor: '', textColor: '' }
                                          ]
                                        ]
                                      };
                                      setTableData(defaultTable);
                                      setTemplateBody(compileVisualToHtml(introText, outroText, defaultTable));
                                    }}
                                    sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 700 }}
                                  >
                                    Add Table to Email
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setTableData(null);
                                      setTemplateBody(compileVisualToHtml(introText, outroText, null));
                                    }}
                                    sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600 }}
                                  >
                                    Remove Table
                                  </Button>
                                )}
                              </Stack>

                              {tableData && (
                                <Box sx={{ width: '100%', overflowX: 'auto', mb: 1 }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                                    <thead>
                                      <tr>
                                        {tableData.headers.map((h, cIdx) => {
                                          const isSel = isCellSelected('header', 0, cIdx);
                                          return (
                                            <th
                                              key={cIdx}
                                              onClick={(e) => handleCellClick('header', 0, cIdx, e)}
                                              style={{
                                                border: '2px solid #000',
                                                padding: '6px',
                                                backgroundColor: h.bgColor || '#f8fafc',
                                                color: h.textColor || '#334155',
                                                minWidth: '120px',
                                                textAlign: h.align || 'left',
                                                verticalAlign: h.vAlign || 'middle',
                                                fontWeight: h.fontWeight || 'bold',
                                                fontStyle: h.fontStyle || 'normal',
                                                boxShadow: isSel ? 'inset 0 0 0 2px #3b82f6' : 'none',
                                                outline: 'none',
                                                cursor: 'pointer'
                                              }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                  <input
                                                    value={h.text}
                                                    onChange={(e) => updateCellText('header', 0, cIdx, e.target.value)}
                                                    style={{
                                                      border: 'none',
                                                      background: 'transparent',
                                                      width: '100%',
                                                      fontWeight: 'inherit',
                                                      fontStyle: 'inherit',
                                                      textAlign: 'inherit',
                                                      fontSize: '0.825rem',
                                                      color: 'inherit',
                                                      outline: 'none',
                                                      cursor: 'text'
                                                    }}
                                                  />
                                                  <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => { e.stopPropagation(); deleteColumn(cIdx); }}
                                                    sx={{ p: 0.25 }}
                                                  >
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                  </IconButton>
                                                </Box>
                                              </th>
                                            );
                                          })}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tableData.rows.map((row, rIdx) => (
                                          <tr key={rIdx}>
                                            {row.map((cell, cIdx) => {
                                              const isSel = isCellSelected('body', rIdx, cIdx);
                                              return (
                                                <td
                                                  key={cIdx}
                                                  onClick={(e) => handleCellClick('body', rIdx, cIdx, e)}
                                                  style={{
                                                    border: '2px solid #000',
                                                    padding: '6px',
                                                    backgroundColor: cell.bgColor || '#ffffff',
                                                    color: cell.textColor || '#333333',
                                                    textAlign: cell.align || 'left',
                                                    verticalAlign: cell.vAlign || 'middle',
                                                    fontWeight: cell.fontWeight || 'normal',
                                                    fontStyle: cell.fontStyle || 'normal',
                                                    boxShadow: isSel ? 'inset 0 0 0 2px #3b82f6' : 'none',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <input
                                                      value={cell.text}
                                                      onChange={(e) => updateCellText('body', rIdx, cIdx, e.target.value)}
                                                      style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        width: '100%',
                                                        fontSize: '0.825rem',
                                                        fontWeight: 'inherit',
                                                        fontStyle: 'inherit',
                                                        textAlign: 'inherit',
                                                        color: 'inherit',
                                                        outline: 'none',
                                                        cursor: 'text'
                                                      }}
                                                    />
                                                  </Box>
                                                </td>
                                              );
                                            })}
                                          <td style={{ border: 'none', width: '30px', padding: '2px' }}>
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => deleteRow(rIdx)}
                                            >
                                              <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>

                                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addRow} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                      Add Row
                                    </Button>
                                    <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addColumn} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                      Add Column
                                    </Button>
                                  </Stack>
                                </Box>
                              )}
                            </Box>

                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              size="small"
                              label="Outro Body Paragraph(s)"
                              placeholder="Write outro/signature email content here..."
                              value={outroText}
                              onChange={(e) => updateOutroText(e.target.value)}
                            />
                          </Stack>
                        ) : (
                          <TextField
                            ref={bodyRef}
                            fullWidth
                            multiline
                            rows={15}
                            size="small"
                            label="Email Body (HTML/Text)"
                            value={templateBody}
                            onChange={(e) => setTemplateBody(e.target.value)}
                            disabled={!isTemplateEditing}
                            slotProps={{
                              input: {
                                style: { fontFamily: 'monospace', fontSize: '0.875rem' }
                              }
                            }}
                          />
                        )}
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

                    {/* Cell Styling Dialog */}
                    <Dialog open={formatDialogType !== null} onClose={() => setFormatDialogType(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
                      <DialogTitle sx={{ fontWeight: 800 }}>{formatDialogType === 'bg' ? 'Cell Background Color' : 'Text Color'}</DialogTitle>
                      <DialogContent dividers>
                        <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
                          {[
                            { name: 'Default', value: '' },
                            // Reds
                            { name: 'Light Pink', value: '#fce7f3' },
                            { name: 'Light Red', value: '#fee2e2' },
                            { name: 'Red', value: '#fca5a5' },
                            { name: 'Deep Red', value: '#f87171' },
                            // Oranges
                            { name: 'Light Orange', value: '#ffedd5' },
                            { name: 'Orange', value: '#fed7aa' },
                            { name: 'Amber', value: '#fde68a' },
                            // Yellows
                            { name: 'Light Yellow', value: '#fef9c3' },
                            { name: 'Yellow', value: '#fef08a' },
                            { name: 'Light Amber', value: '#fef3c7' },
                            // Greens
                            { name: 'Mint', value: '#d1fae5' },
                            { name: 'Light Green', value: '#dcfce7' },
                            { name: 'Green', value: '#bbf7d0' },
                            { name: 'Teal', value: '#ccfbf1' },
                            { name: 'Emerald', value: '#a7f3d0' },
                            // Blues
                            { name: 'Sky', value: '#e0f2fe' },
                            { name: 'Light Blue', value: '#dbeafe' },
                            { name: 'Blue', value: '#bfdbfe' },
                            { name: 'Indigo', value: '#e0e7ff' },
                            { name: 'Violet', value: '#ede9fe' },
                            { name: 'Purple', value: '#f3e8ff' },
                            // Grays
                            { name: 'Light Gray', value: '#f1f5f9' },
                            { name: 'Gray', value: '#e2e8f0' },
                            { name: 'Dark Gray', value: '#cbd5e1' },
                            // Darks
                            { name: 'Dark Blue', value: '#1e3a5f' },
                            { name: 'Dark Green', value: '#14532d' },
                            { name: 'Black', value: '#0f172a' },
                            { name: 'White', value: '#ffffff' },
                          ].map(color => (
                            <Box
                              key={color.name}
                              onClick={() => {
                                applyFormattingToSelection(formatDialogType === 'bg' ? 'bgColor' : 'textColor', color.value);
                              }}
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: color.value || (formatDialogType === 'bg' ? '#ffffff' : '#334155'),
                                border: '2px solid white',
                                boxShadow: '0 0 0 1.5px #94a3b8',
                                cursor: 'pointer',
                                '&:hover': { transform: 'scale(1.2)', transition: 'transform 0.15s', boxShadow: '0 0 0 2px #2563eb' }
                              }}
                              title={color.name}
                            />
                          ))}
                        </Stack>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Custom:</Typography>
                          <input
                            type="color"
                            style={{ width: 32, height: 32, border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                            onChange={(e) => {
                              applyFormattingToSelection(formatDialogType === 'bg' ? 'bgColor' : 'textColor', e.target.value);
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">Pick any colour</Typography>
                        </Box>
                      </DialogContent>
                      <DialogActions sx={{ p: 1.5 }}>
                        <Button variant="contained" onClick={() => setFormatDialogType(null)} sx={{ borderRadius: '8px', textTransform: 'none' }}>
                          Done
                        </Button>
                      </DialogActions>
                    </Dialog>
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
