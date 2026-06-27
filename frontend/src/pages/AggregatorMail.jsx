import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack, 
  Paper, Chip, CardHeader, Divider, List, ListItem, ListItemText,
  IconButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AggregatorMail() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageEmailDirectory = isSuperAdmin || user?.permissions?.split(',').includes('EMAIL_DIRECTORY');

  // Configured recipient categories loaded from backend
  const [categories, setCategories] = useState([]);

  // Auto Mail configuration state
  const [newAutoEmailInput, setNewAutoEmailInput] = useState('');
  const [newAutoCcEmailInput, setNewAutoCcEmailInput] = useState('');
  const [editingAutoCat, setEditingAutoCat] = useState(null); // 'auto_mails' or 'auto_mails_cc'
  const [editingAutoIndex, setEditingAutoIndex] = useState(null);
  const [editingAutoValue, setEditingAutoValue] = useState('');
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    fetchRecipients();
  }, []);

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
          title="Email Recipient Configuration" 
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
          Manage email recipients for system-generated and automated emails.
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>{errorMsg}</Alert>}

      {!canManageEmailDirectory && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>
          You are in view-only mode. You need the "Email Directory" sub-access permission to add, edit, or delete Mail IDs.
        </Alert>
      )}

      {renderAutoMailsCard()}

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
    </Box>
  );
}
