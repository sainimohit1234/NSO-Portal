import React, { useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Dashboard from '@mui/icons-material/Dashboard';
import Store from '@mui/icons-material/Store';
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import AssignmentTurnedIn from '@mui/icons-material/AssignmentTurnedIn';
import Settings from '@mui/icons-material/Settings';
import ContactsIcon from '@mui/icons-material/Contacts';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import LayersIcon from '@mui/icons-material/Layers';
import GavelIcon from '@mui/icons-material/Gavel';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import TuneIcon from '@mui/icons-material/Tune';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import SyncIcon from '@mui/icons-material/Sync';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import Chip from '@mui/material/Chip';
import { useAuth } from '../context/AuthContext';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import suchaliLogo from '../assets/suchali_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';

const drawerWidth = 228;
const glassPanelSx = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.64) 100%)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(63, 174, 191, 0.12)',
  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.05)'
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, changePassword } = useAuth();

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenResetDialog = () => {
    setResetDialogOpen(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
  };

  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setResetError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      setResetSuccess('Password reset successfully!');
      setTimeout(() => {
        setResetDialogOpen(false);
      }, 2000);
    } catch (err) {
      setResetError(typeof err === 'string' ? err : 'Failed to reset password. Please verify your old password.');
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/', color: '#3b82f6', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE'] },
    { text: 'All Stores', icon: <Store />, path: '/stores', color: '#10b981', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE'] },
    { text: 'Expansion Pipeline', icon: <ViewWeekIcon />, path: '/expansion-pipeline', color: '#8b5cf6', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE'] },
    { text: 'New Store Creation', icon: <AddCircleOutlined />, path: '/stores/new', color: '#ec4899', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'All Upcoming Stores', icon: <CalendarTodayIcon />, path: '/upcoming-stores', color: '#f59e0b', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'NSO Approval', icon: <AssignmentTurnedIn />, path: '/approvals', color: '#06b6d4', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },

    { text: 'Swiggy / Zomato Integration', icon: <SyncIcon />, path: '/swiggy-zomato', color: '#f43f5e', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Email Directory', icon: <MailOutlineIcon />, path: '/aggregator-mail', color: '#14b8a6', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Bulk Action', icon: <LayersIcon />, path: '/bulk-action', color: '#6366f1', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'Settings', icon: <Settings />, path: '/settings', color: '#64748b', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Images and Other Docs', icon: <PhotoLibraryIcon />, path: '/images-docs', color: '#a855f7', roles: ['SUPER_ADMIN'] },
    { text: 'Store Control Center', icon: <TuneIcon />, path: '/delete-branches', color: '#ef4444', roles: ['SUPER_ADMIN'] },
    { text: 'Contact Details', icon: <ContactsIcon />, path: '/contacts', color: '#22c55e', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'User Registrations', icon: <HowToRegIcon />, path: '/user-registrations', color: '#d97706', roles: ['SUPER_ADMIN', 'ADMIN'] },
  ];

  const MODULE_KEYS = {
    'Dashboard': 'dashboard',
    'All Stores': 'all_stores',
    'Expansion Pipeline': 'expansion_pipeline',
    'NSO Approval': 'nso_approval',
    'Swiggy / Zomato Integration': 'swiggy_zomato',
    'Email Directory': 'email_directory',
    'Store Control Center': 'store_control_center',
    'User Registrations': 'user_registrations',
    'Settings': 'settings'
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles && !item.roles.includes(user?.role)) {
      return false;
    }
    const moduleKey = MODULE_KEYS[item.text];
    if (moduleKey && user?.role !== 'SUPER_ADMIN') {
      const userPermList = user?.permissions ? user.permissions.split(',').map(p => p.trim()) : [];
      const hasAnyModuleConfigured = Object.values(MODULE_KEYS).some(mKey => userPermList.includes(mKey));
      if (hasAnyModuleConfigured && !userPermList.includes(moduleKey)) {
        return false;
      }
    }
    return true;
  });
  const currentPage = useMemo(
    () => menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard',
    [location.pathname]
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...glassPanelSx }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 2, pt: 2.75, pb: 2, gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: 46, width: 46, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.72)', boxShadow: '0 6px 14px rgba(15,23,42,0.08)' }} />
          <img src={suchaliLogo} alt="Suchali's" style={{ height: 46, width: 46, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.72)', boxShadow: '0 6px 14px rgba(15,23,42,0.08)' }} />
          <img src={gotTeaLogo} alt="Got Tea" style={{ height: 46, width: 46, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.72)', boxShadow: '0 6px 14px rgba(15,23,42,0.08)' }} />
        </Box>
        <Typography variant="h5" noWrap component="div" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.94rem', letterSpacing: '0.06em' }}>
          NSO PORTAL
        </Typography>
        <Chip
          label="Store Management Console"
          size="small"
          sx={{
            height: 28,
            bgcolor: 'rgba(10, 49, 77, 0.08)',
            color: 'text.primary',
            border: '1px solid rgba(10, 49, 77, 0.15)'
          }}
        />
      </Box>
      <Divider sx={{ mb: 1.5, borderColor: 'divider' }} />
      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  alignItems: 'center',
                  borderRadius: '14px',
                  bgcolor: isActive ? alpha(item.color, 0.08) : 'transparent',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  py: 0.75,
                  px: 1.15,
                  border: '1px solid',
                  borderColor: isActive ? alpha(item.color, 0.15) : 'transparent',
                  boxShadow: isActive ? `0 6px 20px ${alpha(item.color, 0.05)}` : 'none',
                  '&:hover': {
                    bgcolor: isActive ? alpha(item.color, 0.08) : 'rgba(255,255,255,0.40)',
                    color: 'text.primary',
                    '& .sidebar-icon-badge': {
                      transform: 'scale(1.15) rotate(3deg)',
                      boxShadow: `0 4px 14px ${alpha(item.color, 0.3)}`
                    }
                  },
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.25
                }}>
                  <Box 
                    className="sidebar-icon-badge"
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isActive ? item.color : alpha(item.color, 0.12),
                      color: isActive ? '#ffffff' : item.color,
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? `0 4px 12px ${alpha(item.color, 0.4)}` : 'none'
                    }}
                  >
                    {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
                  </Box>
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: isActive ? 700 : 600, 
                    fontSize: '0.8rem',
                    lineHeight: 1.25
                  }} 
                  sx={{ my: 0, '& .MuiTypography-root': { whiteSpace: 'normal' } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'transparent',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)'
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, sm: 2.5, lg: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1.25, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', display: { xs: 'none', md: 'block' }, textTransform: 'uppercase', letterSpacing: '0.16em', mb: 0.35 }}>
              BTC — New Store Management
            </Typography>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '0.9rem', md: '1rem' } }}>
              {currentPage}
            </Typography>
          </Box>
          <IconButton size="medium" sx={{ mr: 1, color: 'text.secondary', border: '1px solid rgba(63, 174, 191, 0.12)', bgcolor: 'rgba(255,255,255,0.35)' }}>
            <NotificationsActive sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="medium"
            onClick={handleMenu}
            color="inherit"
            sx={{ p: 0 }}
          >
            <Avatar sx={{ bgcolor: 'rgba(111, 205, 220, 0.24)', color: 'text.primary', width: 36, height: 36, fontWeight: 800, fontSize: '0.82rem', border: '1px solid rgba(63,174,191,0.18)', boxShadow: '0 8px 18px rgba(15,23,42,0.06)' }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{ mt: 1 }}
          >
            <Box sx={{ px: 2, py: 1.5, minWidth: 160 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>{user?.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>{user?.email}</Typography>
              <Chip label={user?.role} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 18, bgcolor: 'rgba(129, 140, 248, 0.12)', color: 'primary.main' }} />
            </Box>
            <Divider />
            <MenuItem onClick={() => { handleClose(); handleOpenResetDialog(); }} sx={{ fontWeight: 600 }}>
              Reset Password
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); logout(); }} sx={{ color: 'error.main', fontWeight: 600 }}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, 
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
          py: { xs: 1.5, md: 2 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 8.5, sm: 9 },
          position: 'relative'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1640, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetDialogOpen} 
        onClose={handleCloseResetDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '24px', p: 1.25 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Reset Password</DialogTitle>
        <form onSubmit={handleResetPassword}>
          <DialogContent>
            {resetError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{resetError}</Alert>}
            {resetSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }}>{resetSuccess}</Alert>}
            <TextField
              margin="dense"
              label="Current Password"
              type="password"
              fullWidth
              variant="outlined"
              size="small"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              sx={{ mb: 1.5 }}
              required
            />
            <TextField
              margin="dense"
              label="New Password"
              type="password"
              fullWidth
              variant="outlined"
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mb: 1.5 }}
              required
            />
            <TextField
              margin="dense"
              label="Confirm New Password"
              type="password"
              fullWidth
              variant="outlined"
              size="small"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseResetDialog} color="inherit" sx={{ fontWeight: 600 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }}>
              Reset Password
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
