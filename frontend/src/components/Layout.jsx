import React, { useMemo, useState, useEffect } from 'react';
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
  useTheme,
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
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import TuneIcon from '@mui/icons-material/Tune';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import SyncIcon from '@mui/icons-material/Sync';
import Chip from '@mui/material/Chip';
import PaletteIcon from '@mui/icons-material/Palette';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import suchaliLogo from '../assets/suchali_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';

const drawerWidth = 260;

export default function Layout() {
  const theme = useTheme();
  const { themeMode, setThemeMode, customColors, customBgUrl, setCustomBgUrl } = useThemeMode();
  const isLight = theme.palette.mode === 'light';

  const glassPanelSx = {
    background: isLight 
      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(244, 246, 248, 0.88) 100%)'
      : themeMode === 'custom'
        ? `linear-gradient(180deg, ${alpha(customColors?.header || '#111827', 0.85)} 0%, ${alpha(customColors?.background || '#0B0F19', 0.75)} 100%)`
        : 'linear-gradient(180deg, rgba(18, 24, 36, 0.82) 0%, rgba(11, 15, 25, 0.68) 100%)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    borderRight: isLight 
      ? '1px solid rgba(0, 0, 0, 0.08)' 
      : '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: isLight 
      ? '0 16px 34px rgba(10, 49, 77, 0.05)' 
      : '0 16px 34px rgba(0, 0, 0, 0.25)'
  };

  const [themeAnchorEl, setThemeAnchorEl] = useState(null);
  const [themeBgDialogOpen, setThemeBgDialogOpen] = useState(false);

  // Custom theme color editor local state
  const [customBg, setCustomBg] = useState(customColors?.background || '#0B0F19');
  const [customHeader, setCustomHeader] = useState(customColors?.header || '#111827');
  const [customText, setCustomText] = useState(customColors?.text || '#F8FAFC');
  const [customBorder, setCustomBorder] = useState(customColors?.border || '#1e293b');
  const [customPrimary, setCustomPrimary] = useState(customColors?.primary || '#0A314D');

  // Sync state when customColors changes
  useEffect(() => {
    if (customColors) {
      setCustomBg(customColors.background || '#0B0F19');
      setCustomHeader(customColors.header || '#111827');
      setCustomText(customColors.text || '#F8FAFC');
      setCustomBorder(customColors.border || '#1e293b');
      setCustomPrimary(customColors.primary || '#0A314D');
    }
  }, [customColors]);

  const handleThemeClick = (event) => {
    setThemeAnchorEl(event.currentTarget);
  };

  const handleThemeClose = () => {
    setThemeAnchorEl(null);
  };

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...(themeMode === 'customize' ? { background: 'transparent' } : glassPanelSx) }}>
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
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`
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
                  bgcolor: isActive ? alpha(item.color, 0.12) : 'transparent',
                  color: isActive ? 'text.primary' : (isLight ? '#1e293b' : '#cbd5e1'),
                  py: 0.75,
                  px: 1.15,
                  border: '1px solid',
                  borderColor: isActive ? alpha(item.color, 0.25) : 'transparent',
                  boxShadow: isActive ? `0 6px 20px ${alpha(item.color, 0.05)}` : 'none',
                  '&:hover': {
                    bgcolor: isActive ? alpha(item.color, 0.16) : isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
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
      {themeMode === 'customize' && customBgUrl && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            overflow: 'hidden',
            backgroundColor: '#050a10',
            opacity: 0.95,
          }}
        >
          <img
            src={customBgUrl}
            alt="Custom Theme"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
          />
        </Box>
      )}
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
          <IconButton
            size="medium"
            onClick={handleThemeClick}
            sx={{ mr: 1, color: 'text.secondary', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
            title="Theme options"
            aria-label="Theme options"
          >
            <PaletteIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="medium" aria-label="Notifications" title="Notifications" sx={{ mr: 1, color: 'text.secondary', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
            <NotificationsActive sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="medium"
            onClick={handleMenu}
            color="inherit"
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl)}
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
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: 'none',
              background: themeMode === 'customize' ? 'rgba(15, 23, 42, 0.4)' : undefined,
              backdropFilter: themeMode === 'customize' ? 'blur(16px)' : undefined,
              WebkitBackdropFilter: themeMode === 'customize' ? 'blur(16px)' : undefined
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: '1px solid', 
              borderColor: 'divider',
              background: themeMode === 'customize' ? 'transparent' : undefined,
              backdropFilter: themeMode === 'customize' ? 'blur(10px)' : undefined,
              WebkitBackdropFilter: themeMode === 'customize' ? 'blur(10px)' : undefined
            },
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
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Decorative Blur Blobs */}
        <Box sx={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${isLight ? 'rgba(99, 102, 241, 0.015)' : 'rgba(99, 102, 241, 0.08)'} 0%, rgba(99, 102, 241, 0) 70%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <Box sx={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${isLight ? 'rgba(139, 92, 246, 0.01)' : 'rgba(139, 92, 246, 0.06)'} 0%, rgba(139, 92, 246, 0) 70%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <Box sx={{ width: '100%', maxWidth: 1640, mx: 'auto', position: 'relative', zIndex: 1 }}>
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

      {/* Theme Menu Dropdown */}
      <Menu
        anchorEl={themeAnchorEl}
        open={Boolean(themeAnchorEl)}
        onClose={handleThemeClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <MenuItem 
          onClick={() => { setThemeMode('dark'); handleThemeClose(); }} 
          selected={themeMode === 'dark'} 
          sx={{ fontWeight: 600, minWidth: 165 }}
        >
          Dark Theme
        </MenuItem>
        <MenuItem 
          onClick={() => { setThemeMode('light'); handleThemeClose(); }} 
          selected={themeMode === 'light'} 
          sx={{ fontWeight: 600 }}
        >
          Light Theme
        </MenuItem>
        <MenuItem 
          onClick={() => { setThemeBgDialogOpen(true); handleThemeClose(); }} 
          selected={themeMode === 'customize'} 
          sx={{ fontWeight: 600 }}
        >
          Customize Theme
        </MenuItem>
      </Menu>

      {/* Theme Background Selection Dialog */}
      <Dialog 
        open={themeBgDialogOpen} 
        onClose={() => setThemeBgDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '24px', p: 2, background: 'background.paper' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', fontSize: '1.5rem', pb: 1 }}>
          Customize Your Theme
        </DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Select a background image to personalize your dashboard.
        </Typography>
        <DialogContent sx={{ overflowY: 'visible', pb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
            {['/assets/themes/theme1.jpg', '/assets/themes/theme2.jpg', '/assets/themes/theme3.jpg', '/assets/themes/theme4.jpg', '/assets/themes/theme5.jpg'].map((url, idx) => (
              <Box 
                key={idx}
                onClick={() => {
                  setThemeMode('customize');
                  setCustomBgUrl(url);
                  setThemeBgDialogOpen(false);
                }}
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: customBgUrl === url && themeMode === 'customize' ? '4px solid #0A314D' : '2px solid transparent',
                  boxShadow: customBgUrl === url && themeMode === 'customize' ? '0 0 20px rgba(10, 49, 77, 0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <img src={url} alt={`Theme ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button onClick={() => setThemeBgDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
