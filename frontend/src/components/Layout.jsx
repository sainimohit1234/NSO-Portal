import React, { useState } from 'react';
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
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import Chip from '@mui/material/Chip';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import suchaliLogo from '../assets/suchali_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';

const drawerWidth = 280;

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
      await axios.post('/api/auth/reset-password', {
        oldPassword,
        newPassword
      });
      setResetSuccess('Password reset successfully!');
      setTimeout(() => {
        setResetDialogOpen(false);
      }, 2000);
    } catch (err) {
      setResetError(err.response?.data?.error || 'Failed to reset password. Please verify your old password.');
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE'] },
    { text: 'All Stores', icon: <Store />, path: '/stores', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE'] },
    { text: 'New Store Creation', icon: <AddCircleOutlined />, path: '/stores/new', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'All Upcoming Stores', icon: <CalendarTodayIcon />, path: '/upcoming-stores', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'NSO Approval', icon: <AssignmentTurnedIn />, path: '/approvals', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'Compliance & Lease', icon: <GavelIcon />, path: '/compliance', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },
    { text: 'Email Directory', icon: <MailOutlineIcon />, path: '/aggregator-mail', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Bulk Action', icon: <LayersIcon />, path: '/bulk-action', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'Settings', icon: <Settings />, path: '/settings', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Images and Other Docs', icon: <PhotoLibraryIcon />, path: '/images-docs', roles: ['SUPER_ADMIN'] },
    { text: 'Store Control Center', icon: <TuneIcon />, path: '/delete-branches', roles: ['SUPER_ADMIN'] },
    { text: 'Contact Details', icon: <ContactsIcon />, path: '/contacts', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.roles || item.roles.includes(user?.role));

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 2, pt: 3.5, pb: 2.5, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: 64, width: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
          <img src={suchaliLogo} alt="Suchali's" style={{ height: 64, width: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
          <img src={gotTeaLogo} alt="Got Tea" style={{ height: 64, width: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
        </Box>
        <Typography variant="h5" noWrap component="div" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.35rem', letterSpacing: '0.04em' }}>
          NSO PORTAL
        </Typography>
      </Box>
      <Divider sx={{ mb: 2, borderColor: 'divider' }} />
      <List sx={{ px: 2, flexGrow: 1 }}>
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: '10px',
                  bgcolor: isActive ? 'primary.light' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  py: 1.2,
                  px: 2,
                  '&:hover': {
                    bgcolor: isActive ? 'primary.light' : 'action.hover',
                    color: isActive ? 'primary.main' : 'text.primary',
                    '& .MuiListItemIcon-root': {
                      color: isActive ? 'primary.main' : 'text.primary',
                    }
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? 'primary.main' : 'text.secondary', 
                  minWidth: 36,
                  transition: 'color 0.2s ease'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: isActive ? 700 : 600, 
                    fontSize: '0.875rem' 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 4 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="large" sx={{ mr: 1, color: 'text.secondary' }}>
            <NotificationsActive sx={{ fontSize: 22 }} />
          </IconButton>
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
            sx={{ p: 0 }}
          >
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 36, height: 36, fontWeight: 700, fontSize: '0.9rem' }}>
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
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}
      >
        <Outlet />
      </Box>

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetDialogOpen} 
        onClose={handleCloseResetDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px', p: 1 }
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
