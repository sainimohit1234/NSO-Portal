
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Button, Stack, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Alert, Avatar, Switch, FormControlLabel,
  InputAdornment, List, ListItem, ListItemButton, ListItemText, Divider
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeListResponse } from '../utils/api';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'USER'];

const PERM_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'all_stores', label: 'All Stores' },
  { key: 'expansion_pipeline', label: 'Expansion Pipeline' },
  { key: 'all_upcoming_stores', label: 'All Upcoming Stores' },
  { key: 'nso_approval', label: 'NSO Approval' },
  { key: 'swiggy_zomato', label: 'Swiggy / Zomato Integration' },
  { key: 'email_directory', label: 'Email Directory' },
  { key: 'store_control_center', label: 'Store Control Center' },
  { key: 'user_registrations', label: 'User Registrations' },
  { key: 'settings', label: 'Settings' }
];

const MODULE_SUB_PERMS = {
  dashboard: [],
  all_stores: [
    { key: 'EDIT_CONTACTS', label: 'Edit Contacts' },
    { key: 'EDIT_STORES', label: 'Edit Store Details' },
    { key: 'APPROVER', label: 'Approver' },
    { key: 'GO_LIVE', label: 'Go-Live Access' }
  ],
  expansion_pipeline: [
    { key: 'VIEWER', label: 'Viewer' }
  ],
  all_upcoming_stores: [
    { key: 'VIEWER', label: 'Viewer' },
    { key: 'EDITOR', label: 'Editor' }
  ],
  nso_approval: [
    { key: 'APPROVER', label: 'Approver' }
  ],
  swiggy_zomato: [],
  email_directory: [
    { key: 'VIEW_ONLY', label: 'View Only' },
    { key: 'EDIT_ACCESS', label: 'Edit Access' }
  ],
  store_control_center: [],
  user_registrations: [],
  settings: [
    { key: 'CREATE_USER', label: 'Create User' }
  ]
};

const ALL_SUB_PERMS = [
  { key: 'EDIT_CONTACTS', label: 'Edit Contacts' },
  { key: 'EDIT_STORES', label: 'Edit Store Details' },
  { key: 'APPROVER', label: 'Approver' },
  { key: 'GO_LIVE', label: 'Go-Live Access' },
  { key: 'CREATE_USER', label: 'Create User' },
  { key: 'VIEWER', label: 'Viewer' },
  { key: 'VIEW_ONLY', label: 'View Only' },
  { key: 'EDIT_ACCESS', label: 'Edit Access' }
];

const ROLE_INFO = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Complete system control. Can lock stores and manage admins.',
    icon: <AdminPanelSettingsIcon />,
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.25)',
  },
  ADMIN: {
    label: 'Admin',
    description: 'Full access. Can edit all profiles. Only super admin can modify.',
    icon: <AdminPanelSettingsIcon />,
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.12)',
    border: 'rgba(129, 140, 248, 0.25)',
  },
  MANAGER: {
    label: 'Manager',
    description: 'Can edit User profiles. Store creation & approval access.',
    icon: <ManageAccountsIcon />,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.25)',
  },
  FINANCE: {
    label: 'Legal and Finance',
    description: 'Access to financial records. Can update license and rent expiries.',
    icon: <ManageAccountsIcon />,
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.25)',
  },
  USER: {
    label: 'User',
    description: 'View-only access to dashboard. Can filter & browse stores.',
    icon: <PersonIcon />,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.25)',
  },
};

export default function Settings() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isManager = currentUser?.role === 'MANAGER';
  const hasCreateUserPermission = currentUser?.permissions ? currentUser.permissions.split(',').map(p => p.trim()).includes('CREATE_USER') : false;
  const canManageUsers = isSuperAdmin || currentUser?.role === 'ADMIN' || ((currentUser?.role === 'MANAGER' || currentUser?.role === 'FINANCE') && hasCreateUserPermission);

  let visibleRoles = ROLES;
  if (currentUser?.role === 'ADMIN') {
    visibleRoles = ['ADMIN', 'MANAGER', 'FINANCE', 'USER'];
  } else if (currentUser?.role === 'MANAGER') {
    if (hasCreateUserPermission) {
      visibleRoles = ['MANAGER'];
    } else {
      visibleRoles = ['MANAGER', 'FINANCE', 'USER'];
    }
  } else if (currentUser?.role === 'FINANCE') {
    visibleRoles = ['FINANCE'];
  }

  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permsDialogOpen, setPermsDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('dashboard');
  const [tempPermissions, setTempPermissions] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', oldPassword: '', phone: '', role: 'USER', permissions: '' });

  useEffect(() => {
    const visibleKeys = PERM_MODULES.filter(m => {
      if (m.key === 'swiggy_zomato') return form.role === 'SUPER_ADMIN' || form.role === 'ADMIN';
      if (m.key === 'store_control_center') return form.role === 'SUPER_ADMIN';
      if (m.key === 'user_registrations') return form.role === 'SUPER_ADMIN' || form.role === 'ADMIN';
      return true;
    }).map(m => m.key);
    if (!visibleKeys.includes(selectedModule)) {
      setSelectedModule('dashboard');
    }
  }, [form.role, selectedModule]);

  const isModuleEnabled = (moduleKey) => {
    const list = tempPermissions.split(',').map(p => p.trim()).filter(p => p);
    return list.includes(moduleKey);
  };

  const isSubPermEnabled = (moduleKey, subKey) => {
    const list = tempPermissions.split(',').map(p => p.trim()).filter(p => p);
    return list.includes(`${moduleKey}:${subKey}`);
  };

  const handleToggleModule = (moduleKey, enabled) => {
    let list = tempPermissions.split(',').map(p => p.trim()).filter(p => p);
    if (enabled) {
      if (!list.includes(moduleKey)) {
        list.push(moduleKey);
      }
    } else {
      list = list.filter(p => p !== moduleKey);
      list = list.filter(p => !p.startsWith(`${moduleKey}:`));
    }
    setTempPermissions(list.join(','));
  };

  const handleToggleSubPerm = (moduleKey, subKey, enabled) => {
    let list = tempPermissions.split(',').map(p => p.trim()).filter(p => p);
    const compositeKey = `${moduleKey}:${subKey}`;
    if (enabled) {
      if (!list.includes(compositeKey)) {
        list.push(compositeKey);
      }
      
      // Mutual exclusion logic for VIEWER
      if (subKey === 'VIEWER') {
        list = list.filter(p => !p.startsWith(`${moduleKey}:`) || p === compositeKey);
      } else {
        list = list.filter(p => p !== `${moduleKey}:VIEWER`);
      }

      // Mutual exclusion logic for Email Directory
      if (moduleKey === 'email_directory') {
        if (subKey === 'VIEW_ONLY') {
          list = list.filter(p => p !== `${moduleKey}:EDIT_ACCESS`);
        } else if (subKey === 'EDIT_ACCESS') {
          list = list.filter(p => p !== `${moduleKey}:VIEW_ONLY`);
        }
      }
    } else {
      list = list.filter(p => p !== compositeKey);
    }
    setTempPermissions(list.join(','));
  };

  const handleOpenPermsDialog = () => {
    let initialPerms = form.permissions || '';
    if (!initialPerms) {
      // Default: Dashboard, Settings with Create User sub-access, Email Directory with View Only sub-access
      const defaults = [
        'dashboard', 
        'settings', 'settings:CREATE_USER', 'CREATE_USER',
        'email_directory', 'email_directory:VIEW_ONLY', 'VIEW_ONLY'
      ];
      initialPerms = defaults.join(',');
    } else {
      // Ensure dashboard is always enabled by default if not present
      const list = initialPerms.split(',').map(p => p.trim()).filter(p => p);
      if (!list.includes('dashboard')) {
        list.push('dashboard');
      }
      // Ensure settings and settings:CREATE_USER are enabled by default for new config
      if (!list.includes('settings')) {
        list.push('settings');
        if (!list.includes('settings:CREATE_USER')) {
          list.push('settings:CREATE_USER');
        }
      }
      initialPerms = list.join(',');
    }
    setTempPermissions(initialPerms);
    setPermsDialogOpen(true);
  };

  const handleCancelPerms = () => {
    setPermsDialogOpen(false);
  };

  const handleConfirmPerms = () => {
    let list = tempPermissions.split(',').map(p => p.trim()).filter(p => p);
    const globalPermsToAdd = new Set();
    list.forEach(p => {
      if (p.includes(':')) {
        const [, subPerm] = p.split(':');
        globalPermsToAdd.add(subPerm);
      }
    });
    const managedKeys = ALL_SUB_PERMS.map(sp => sp.key);
    list = list.filter(p => !managedKeys.includes(p));
    globalPermsToAdd.forEach(gp => {
      list.push(gp);
    });
    setForm(prev => ({ ...prev, permissions: list.join(',') }));
    setPermsDialogOpen(false);
  };
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering state
  const [filters, setFilters] = useState({ name: '', email: '', phone: '', role: '' });

  // Username validation error state
  const [usernameError, setUsernameError] = useState('');

  // Email validation error state
  const [emailError, setEmailError] = useState('');

  // Phone validation error state
  const [phoneError, setPhoneError] = useState('');

  // SMTP settings state
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: ''
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [smtpError, setSmtpError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  const fetchUsers = () => {
    console.log("Settings.jsx: fetchUsers called");
    axios.get('/api/users')
      .then(res => {
        console.log("Settings.jsx: fetchUsers raw response data:", res.data);
        const normalized = normalizeListResponse(res.data, ['users', 'data', 'items']);
        console.log("Settings.jsx: fetchUsers normalized list:", normalized);
        setUsers(normalized);
      })
      .catch(err => {
        console.error("Settings.jsx: fetchUsers error:", err);
      });
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      axios.get('/api/system/smtp')
        .then(res => {
          setSmtpForm({
            smtpHost: res.data.smtpHost || '',
            smtpPort: res.data.smtpPort || 587,
            smtpSecure: res.data.smtpSecure === true,
            smtpUser: res.data.smtpUser || '',
            smtpPass: res.data.smtpPass || ''
          });
        })
        .catch(err => {
          console.error('Failed to load SMTP settings:', err);
        });
    }
  }, [isSuperAdmin]);

  const handleSaveSmtp = async () => {
    setSavingSmtp(true);
    setSmtpError('');
    setSmtpSuccess('');
    try {
      await axios.put('/api/system/smtp', smtpForm);
      setSmtpSuccess('SMTP configuration saved successfully.');
      setTimeout(() => setSmtpSuccess(''), 4000);
    } catch (err) {
      setSmtpError(err.response?.data?.error || 'Failed to save SMTP configuration.');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingConnection(true);
    setSmtpError('');
    setSmtpSuccess('');
    try {
      const res = await axios.post('/api/system/smtp/test', smtpForm);
      setSmtpSuccess(res.data.message || 'SMTP Connection Test succeeded!');
      setTimeout(() => setSmtpSuccess(''), 6000);
    } catch (err) {
      setSmtpError(err.response?.data?.error || 'SMTP Connection Test failed.');
    } finally {
      setTestingConnection(false);
    }
  };

  const openCreateDialog = () => {
    if (!isSuperAdmin && currentUser?.role !== 'ADMIN' && !hasCreateUserPermission) return;
    setEditingUser(null);
    const defaultRole = (isSuperAdmin || currentUser?.role === 'ADMIN') ? 'USER' : (currentUser?.role || 'USER');
    setForm({ name: '', email: '', password: '', oldPassword: '', phone: '', role: defaultRole, permissions: '' });
    setErrorMsg('');
    setUsernameError('');
    setEmailError('');
    setPhoneError('');
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    if (user.role === 'SUPER_ADMIN' && !isSuperAdmin) return;
    if (!isSuperAdmin && currentUser?.role !== 'ADMIN' && !(hasCreateUserPermission && user.role === currentUser?.role)) return;
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      oldPassword: user.password || '',
      phone: user.phone || '',
      role: user.role,
      permissions: user.permissions || ''
    });
    setErrorMsg('');
    setUsernameError('');
    setEmailError('');
    setPhoneError('');
    setDialogOpen(true);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, name: val }));
    if (usernameError) {
      setUsernameError('');
    }
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

  const handleUsernameBlur = () => {
    const enteredName = form.name.trim();
    if (!enteredName) {
      setUsernameError('');
      return;
    }
    const isDuplicate = users.some(user => {
      if (editingUser && user.id === editingUser.id) return false;
      return user.name.trim().toLowerCase() === enteredName.toLowerCase();
    });

    if (isDuplicate) {
      setUsernameError('User Name already exists. Please enter a unique User Name.');
    } else {
      setUsernameError('');
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
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg('Name and Email are required.');
      return;
    }

    // Email domain check
    const emailLower = form.email.trim().toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      const msg = 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.';
      setEmailError(msg);
      setErrorMsg(msg);
      return;
    }

    // Username unique check
    const enteredName = form.name.trim();
    const isDuplicate = users.some(user => {
      if (editingUser && user.id === editingUser.id) return false;
      return user.name.trim().toLowerCase() === enteredName.toLowerCase();
    });
    if (isDuplicate) {
      setUsernameError('User Name already exists. Please enter a unique User Name.');
      setErrorMsg('User Name already exists. Please enter a unique User Name.');
      return;
    }

    // Password validation for new users
    if (!editingUser && !form.password.trim()) {
      setErrorMsg('Password is required for new users.');
      return;
    }

    // Phone number validation
    const enteredPhone = form.phone.trim();
    if (enteredPhone && !/^\d{10}$/.test(enteredPhone)) {
      setPhoneError('invalid contact number');
      setErrorMsg('invalid contact number');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      permissions: form.permissions,
      ...(form.password.trim() && { password: form.password.trim() })
    };

    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, payload);
        setSuccessMsg(`${form.name} updated successfully.`);
      } else {
        await axios.post('/api/users', payload);
        setSuccessMsg(`${form.name} added successfully.`);
      }
      setDialogOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save user.');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return;
    try {
      await axios.delete(`/api/users/${user.id}`);
      setSuccessMsg(`${user.name} removed.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatLastLogin = (lastLoginAt) => {
    if (!lastLoginAt) return '—';
    const date = new Date(lastLoginAt);

    // Check if valid date
    if (isNaN(date.getTime())) return '—';

    // Format as DD-MMM-YYYY hh:mm A (e.g. 20-Jun-2026 12:05 PM)
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const getInactiveDays = (lastLoginAt) => {
    if (!lastLoginAt) return '—';
    const lastLogin = new Date(lastLoginAt);
    if (isNaN(lastLogin.getTime())) return '—';

    const today = new Date();
    // Calculate difference in time
    const diffTime = today.getTime() - lastLogin.getTime();
    // Calculate difference in calendar days
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const inactiveDays = Math.max(0, diffDays);

    return `${inactiveDays} Day${inactiveDays === 1 ? '' : 's'}`;
  };

  const getRoleChipStyle = (role) => {
    const info = ROLE_INFO[role] || ROLE_INFO.USER;
    return { bgcolor: info.bg, color: info.color, borderColor: info.border };
  };

  console.log("Settings.jsx: Render evaluation", { currentUser, usersCount: users?.length, filters });
  const filteredUsers = (users || []).filter(user => {
    if (!user) return false;
    // Hide Super Admin and Admin if user is Manager
    if (currentUser?.role === 'MANAGER' && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return false;

    const matchName = (user.name || '').toLowerCase().includes((filters.name || '').toLowerCase());
    const matchEmail = (user.email || '').toLowerCase().includes((filters.email || '').toLowerCase());
    const matchPhone = (user.phone || '').toLowerCase().includes((filters.phone || '').toLowerCase());
    const matchRole = !filters.role || user.role === filters.role;
    const isMatched = matchName && matchEmail && matchPhone && matchRole;
    return isMatched;
  });
  console.log("Settings.jsx: filteredUsers result:", filteredUsers);

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage access profiles and portal configurations.
          </Typography>
        </Box>
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

      {/* Access Role Legend Cards */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
        Access Profiles
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {visibleRoles.map(role => {
          const info = ROLE_INFO[role];
          return (
            <Card key={role} sx={{
              flex: '1 1 280px',
              minWidth: 280,
              border: `1px solid ${info.border}`,
              bgcolor: info.bg,
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ color: info.color, display: 'flex' }}>{info.icon}</Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: info.color }}>
                    {info.label}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  {info.description}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Users Table */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          User Directory
        </Typography>
        {canManageUsers && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={openCreateDialog}
            sx={{ borderRadius: '8px' }}
          >
            Add User
          </Button>
        )}
      </Box>

      {/* Filters Option Section */}
      <Card sx={{ p: 2.5, mb: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            label="User Name"
            placeholder="Search by name"
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
          <TextField
            size="small"
            label="Email ID"
            placeholder="Search by email"
            value={filters.email}
            onChange={(e) => handleFilterChange('email', e.target.value)}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
          <TextField
            size="small"
            label="Phone Number"
            placeholder="Search by phone"
            value={filters.phone}
            onChange={(e) => handleFilterChange('phone', e.target.value)}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
          <TextField
            size="small"
            select
            label="Access Profile"
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="">All Profiles</MenuItem>
            {visibleRoles.map(role => (
              <MenuItem key={role} value={role}>
                {ROLE_INFO[role]?.label || role}
              </MenuItem>
            ))}
          </TextField>
          {(filters.name || filters.email || filters.phone || filters.role) && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setFilters({ name: '', email: '', phone: '', role: '' })}
              sx={{ borderRadius: '8px', minWidth: '100px', alignSelf: { xs: 'stretch', md: 'auto' } }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Card>

      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Access Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Login Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Inactive Days Count</TableCell>
                {canManageUsers && <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageUsers ? 7 : 6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const chipStyle = getRoleChipStyle(user.role);
                  return (
                    <TableRow key={user.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{
                            width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700,
                            bgcolor: ROLE_INFO[user.role]?.bg || '#1e2235',
                            color: ROLE_INFO[user.role]?.color || '#94a3b8'
                          }}>
                            {user.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{user.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={ROLE_INFO[user.role]?.label || user.role}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            bgcolor: chipStyle.bgcolor,
                            color: chipStyle.color,
                            border: '1px solid',
                            borderColor: chipStyle.borderColor,
                            borderRadius: '6px',
                            px: 0.5
                          }}
                        />
                      </TableCell>
                      <TableCell>{formatLastLogin(user.lastLoginAt)}</TableCell>
                      <TableCell>{getInactiveDays(user.lastLoginAt)}</TableCell>
                      {canManageUsers && (
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {(isSuperAdmin || (currentUser?.role === 'ADMIN' && user.role !== 'SUPER_ADMIN') || (hasCreateUserPermission && user.role === currentUser?.role)) && (
                              <IconButton size="small" onClick={() => openEditDialog(user)} sx={{ color: 'text.secondary' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                            {((isSuperAdmin && user.id !== currentUser?.id) || (currentUser?.role === 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.id !== currentUser?.id)) && (
                              <IconButton size="small" onClick={() => handleDelete(user)} sx={{ color: 'error.main' }}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {isSuperAdmin && (
        <Card sx={{ mt: 4, mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Mail Server & App Password Settings
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure system email settings for Password Reset OTP delivery.
            </Typography>

            <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', mb: 0.5 }}>
                App Password Configuration Warning
              </Typography>
              <strong>IMPORTANT:</strong> Always configure a 16-character <strong>App Password</strong> generated from Google/Microsoft account settings. <strong>Do not</strong> use your standard email login password.
              <br /><br />
              By using a generated App Password, any subsequent password changes made to the primary email account (<code>analytics@bluetokaicoffee.com</code>) <strong>will not affect</strong> or invalidate SMTP operations. The portal will continue to dispatch OTP emails automatically.
            </Alert>

            {smtpSuccess && (
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  borderRadius: '10px',
                  '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
                }}
              >
                {smtpSuccess}
              </Alert>
            )}
            {smtpError && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: '10px',
                  '& .MuiAlert-message': { fontWeight: 700, color: '#000000' }
                }}
              >
                {smtpError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="SMTP Host"
                  value={smtpForm.smtpHost}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                  placeholder="e.g. smtp.gmail.com"
                />
                <TextField
                  label="SMTP Port"
                  type="number"
                  value={smtpForm.smtpPort}
                  onChange={(e) => {
                    const newPort = parseInt(e.target.value, 10) || '';
                    setSmtpForm(prev => ({
                      ...prev,
                      smtpPort: newPort,
                      smtpSecure: newPort === 465
                    }));
                  }}
                  placeholder="e.g. 587"
                  sx={{ minWidth: 150 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={smtpForm.smtpSecure}
                      disabled
                    />
                  }
                  label={smtpForm.smtpPort === 465 ? "Secure (SSL/TLS)" : "Secure (STARTTLS)"}
                  sx={{ alignSelf: 'center', ml: 1 }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="SMTP Username"
                  value={smtpForm.smtpUser}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                  placeholder="analytics@bluetokaicoffee.com"
                />
                <TextField
                  fullWidth
                  label="App Password"
                  type={showSmtpPass ? 'text' : 'password'}
                  value={smtpForm.smtpPass}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                  placeholder="Enter SMTP app password"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowSmtpPass(!showSmtpPass)}
                            edge="end"
                          >
                            {showSmtpPass ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleTestSmtp}
                  disabled={testingConnection || savingSmtp}
                  sx={{ borderRadius: '8px', px: 3 }}
                >
                  {testingConnection ? 'Testing Connection...' : 'Test Connection'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveSmtp}
                  disabled={testingConnection || savingSmtp}
                  sx={{ borderRadius: '8px', px: 3 }}
                >
                  {savingSmtp ? 'Saving...' : 'Save Configuration'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '16px',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          {editingUser ? 'Edit User' : 'Add New User'}
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
            <TextField
              fullWidth
              label="Full Name"
              value={form.name}
              onChange={handleNameChange}
              onBlur={handleUsernameBlur}
              error={!!usernameError}
              helperText={usernameError}
              required
            />
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
            {isSuperAdmin && editingUser ? (
              <>
                <TextField
                  fullWidth
                  label="Old Password (Hash)"
                  value={form.oldPassword}
                  disabled
                  helperText="Showing hashed password from database"
                />
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </>
            ) : (
              <TextField
                fullWidth
                label={editingUser ? "Password (Leave blank to keep unchanged)" : "Password *"}
                type="password"
                placeholder={editingUser ? "••••••••" : "Enter password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editingUser}
              />
            )}
            <TextField
              fullWidth
              label="Phone Number"
              value={form.phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              error={!!phoneError}
              helperText={phoneError}
            />
            <TextField
              fullWidth
              select
              label="Access Role"
              value={form.role}
              onChange={(e) => {
                const nextRole = e.target.value;
                setForm(prev => ({
                  ...prev,
                  role: nextRole,
                  permissions: nextRole === 'USER' ? '' : prev.permissions
                }));
              }}
            >
              {visibleRoles.map(role => (
                <MenuItem key={role} value={role}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: ROLE_INFO[role]?.color, display: 'flex', alignItems: 'center' }}>
                      {ROLE_INFO[role]?.icon && React.cloneElement(ROLE_INFO[role].icon, { fontSize: 'small' })}
                    </Box>
                    <span>{ROLE_INFO[role]?.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            {form.role !== 'USER' && (
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleOpenPermsDialog}
                  sx={{ borderRadius: '8px', fontWeight: 600 }}
                >
                  Access Permission
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ borderRadius: '8px', px: 3 }}>
            {editingUser ? 'Save Changes' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Secondary Dialog: Access Permissions */}
      <Dialog
        open={permsDialogOpen}
        onClose={handleCancelPerms}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Access Permissions</span>
          <IconButton onClick={handleCancelPerms} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', minHeight: 400 }}>
            {/* Left Column: Modules List */}
            <Box sx={{ width: '50%', borderRight: '1px solid', borderColor: 'divider', p: 2, overflow: 'auto', maxHeight: '55vh' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Modules Access
              </Typography>
              <List disablePadding>
                {(() => {
                  const visibleModules = PERM_MODULES.filter(m => {
                    if (m.key === 'swiggy_zomato') {
                      return form.role === 'SUPER_ADMIN' || form.role === 'ADMIN';
                    }
                    if (m.key === 'store_control_center') {
                      return form.role === 'SUPER_ADMIN';
                    }
                    if (m.key === 'user_registrations') {
                      return form.role === 'SUPER_ADMIN' || form.role === 'ADMIN';
                    }
                    return true;
                  });

                  return visibleModules.map((m) => {
                    const enabled = isModuleEnabled(m.key);
                    const selected = selectedModule === m.key;
                    return (
                      <ListItem
                        key={m.key}
                        disablePadding
                        secondaryAction={
                          <Switch
                            edge="end"
                            checked={enabled}
                            disabled={(isManager || currentUser?.role === 'FINANCE') && editingUser?.id === currentUser?.id}
                            onChange={(e) => handleToggleModule(m.key, e.target.checked)}
                          />
                        }
                        sx={{ mb: 1 }}
                      >
                        <ListItemButton
                          selected={selected}
                          onClick={() => setSelectedModule(m.key)}
                          sx={{
                            borderRadius: '12px',
                            py: 1,
                            pr: 8, // Give space for secondary action switch
                            '&.Mui-selected': {
                              bgcolor: 'rgba(63, 174, 191, 0.08)',
                              '&:hover': { bgcolor: 'rgba(63, 174, 191, 0.12)' }
                            }
                          }}
                        >
                          <ListItemText
                            primary={m.label}
                            primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '0.9rem' } }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  });
                })()}
              </List>
            </Box>

            {/* Right Column: Sub-access Permissions */}
            <Box sx={{ width: '50%', p: 3, display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
              {(() => {
                const currentModuleObj = PERM_MODULES.find(m => m.key === selectedModule);
                const moduleEnabled = isModuleEnabled(selectedModule);
                
                return (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Sub-Access Control
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, color: 'primary.main' }}>
                      {currentModuleObj?.label}
                    </Typography>
                    
                    {!moduleEnabled ? (
                      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3, color: 'text.secondary', textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                          Module Disabled
                        </Typography>
                        <Typography variant="caption">
                          Enable the access toggle on the left list to configure sub-permissions for this module.
                        </Typography>
                      </Box>
                    ) : (() => {
                      const currentSubPerms = MODULE_SUB_PERMS[selectedModule] || [];
                      if (currentSubPerms.length === 0) {
                        return (
                          <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3, color: 'text.secondary', textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              No sub-access settings
                            </Typography>
                            <Typography variant="caption">
                              This module does not require any additional sub-permissions.
                            </Typography>
                          </Box>
                        );
                      }
                      
                      return (
                        <Stack spacing={2}>
                          {currentSubPerms.map((sp) => {
                            const checked = isSubPermEnabled(selectedModule, sp.key);
                            
                            // Custom rules for Create User: only Super Admin and Admin (and Manager/Finance with Create User permission if editing others)
                            const isCreateUserDisabled = sp.key === 'CREATE_USER' && !isSuperAdmin && form.role !== 'ADMIN' && form.role !== 'MANAGER' && form.role !== 'FINANCE';
                            const disabledSelf = (isManager || currentUser?.role === 'FINANCE') && editingUser?.id === currentUser?.id;
                            const disabled = isCreateUserDisabled || disabledSelf;

                            return (
                              <Box 
                                key={sp.key} 
                                sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  p: 1.5,
                                  bgcolor: 'background.default',
                                  borderRadius: '10px',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  opacity: disabled ? 0.6 : 1
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                  {sp.label}
                                </Typography>
                                <Switch
                                  size="small"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(e) => handleToggleSubPerm(selectedModule, sp.key, e.target.checked)}
                                />
                              </Box>
                            );
                          })}
                        </Stack>
                      );
                    })()}
                  </>
                );
              })()}
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancelPerms} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmPerms} variant="contained" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 3 }}>
            Confirm Access
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
