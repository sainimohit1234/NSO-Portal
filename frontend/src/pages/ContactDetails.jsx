import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Stack, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Alert, Chip, Grid
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const DESIGNATIONS = ['Café Manager', 'Area Manager', 'City Head'];

export default function ContactDetails() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ name: '', designation: 'Café Manager', email: '', phone: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    name: '',
    designation: '',
    email: '',
    phone: ''
  });

  const fetchContacts = () => {
    axios.get('/api/contacts')
      .then(res => {
        setContacts(res.data);
        setFilteredContacts(res.data);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchContacts(); }, []);

  useEffect(() => {
    let result = contacts;
    if (filters.name) result = result.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()));
    if (filters.designation) result = result.filter(c => c.designation === filters.designation);
    if (filters.email) result = result.filter(c => c.email.toLowerCase().includes(filters.email.toLowerCase()));
    if (filters.phone) result = result.filter(c => c.phone && c.phone.includes(filters.phone));
    setFilteredContacts(result);
  }, [filters, contacts]);

  const openCreateDialog = () => {
    setEditingContact(null);
    setForm({ name: '', designation: 'Café Manager', email: '', phone: '' });
    setErrorMsg('');
    setEmailError('');
    setPhoneError('');
    setDialogOpen(true);
  };

  const openEditDialog = (contact) => {
    setEditingContact(contact);
    setForm({ name: contact.name, designation: contact.designation, email: contact.email, phone: contact.phone || '' });
    setErrorMsg('');
    setEmailError('');
    setPhoneError('');
    setDialogOpen(true);
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, email: val }));
    if (emailError) {
      setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    const enteredEmail = form.email.trim();
    if (!enteredEmail) {
      setEmailError('');
      return;
    }
    const emailLower = enteredEmail.toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      setEmailError('Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.');
    } else {
      setEmailError('');
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, phone: val }));
    if (phoneError) {
      setPhoneError('');
    }
  };

  const handlePhoneBlur = () => {
    const enteredPhone = form.phone.trim();
    if (!enteredPhone) {
      setPhoneError('');
      return;
    }
    if (!/^\d{10}$/.test(enteredPhone)) {
      setPhoneError('invalid contact number');
    } else {
      setPhoneError('');
    }
  };

  const handleSave = async () => {
    setErrorMsg('');
    if (!form.name.trim() || !form.email.trim() || !form.designation) {
      setErrorMsg('Name, Designation, and Email are required.');
      return;
    }

    // Email domain validation
    const emailLower = form.email.trim().toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      const msg = 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.';
      setEmailError(msg);
      setErrorMsg(msg);
      return;
    }

    // Contact number uniqueness check
    const enteredPhone = form.phone.trim();
    if (enteredPhone) {
      if (!/^\d{10}$/.test(enteredPhone)) {
        setPhoneError('invalid contact number');
        setErrorMsg('invalid contact number');
        return;
      }
      const isDuplicatePhone = contacts.some(c => {
        if (editingContact && c.id === editingContact.id) return false;
        return c.phone && c.phone.trim() === enteredPhone;
      });
      if (isDuplicatePhone) {
        setErrorMsg('Contact number already exists. Please enter a unique contact number.');
        return;
      }
    }

    try {
      if (editingContact) {
        await axios.put(`/api/contacts/${editingContact.id}`, form);
        setSuccessMsg(`${form.name} updated successfully.`);
      } else {
        await axios.post('/api/contacts', form);
        setSuccessMsg(`${form.name} added successfully.`);
      }
      setDialogOpen(false);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save contact.');
    }
  };

  const handleDelete = async (contact) => {
    if (!window.confirm(`Are you sure you want to delete ${contact.name}?`)) return;
    try {
      await axios.delete(`/api/contacts/${contact.id}`);
      setSuccessMsg(`${contact.name} removed.`);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Contact Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Master list for Area Managers, City Heads, and Café Managers.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={openCreateDialog}
          sx={{ borderRadius: '8px' }}
        >
          Add Contact
        </Button>
      </Box>

      {successMsg && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3, 
            borderRadius: '12px',
            '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
          }}
        >
          {successMsg}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>Filter Contacts</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Name" name="name" value={filters.name} onChange={handleFilterChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" select label="Designation" name="designation" value={filters.designation} onChange={handleFilterChange}>
                <MenuItem value="">All</MenuItem>
                {DESIGNATIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Email" name="email" value={filters.email} onChange={handleFilterChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Phone" name="phone" value={filters.phone} onChange={handleFilterChange} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No contacts found. Add a contact or adjust filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{contact.name}</TableCell>
                    <TableCell>
                      <Chip label={contact.designation} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#0284c7', borderRadius: '6px' }} />
                    </TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || '—'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => openEditDialog(contact)} sx={{ color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        {isSuperAdmin && (
                          <IconButton size="small" onClick={() => handleDelete(contact)} sx={{ color: 'error.main' }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.paper', borderRadius: '16px' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          {editingContact ? 'Edit Contact' : 'Add New Contact'}
          <IconButton onClick={() => setDialogOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {errorMsg && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                borderRadius: '10px',
                '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
              }}
            >
              {errorMsg}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField fullWidth label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField fullWidth select label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required>
              {DESIGNATIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField 
              fullWidth 
              label="Email Address" 
              type="email" 
              value={form.email} 
              onChange={handleEmailChange} 
              onBlur={handleEmailBlur}
              error={!!emailError}
              helperText={emailError}
              required 
            />
            <TextField 
              fullWidth 
              label="Contact Number" 
              value={form.phone} 
              onChange={handlePhoneChange} 
              onBlur={handlePhoneBlur}
              error={!!phoneError}
              helperText={phoneError}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} sx={{ borderRadius: '8px' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ borderRadius: '8px', px: 3 }}>
            {editingContact ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
