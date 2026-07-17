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
import ContactMailIcon from '@mui/icons-material/ContactMail';
import Chip from '@mui/material/Chip';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PaletteIcon from '@mui/icons-material/Palette';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CircularProgress from '@mui/material/CircularProgress';
import axios from '../utils/api';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import suchaliLogo from '../assets/suchali_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';
import loginBack from '../assets/loginback.png';
import floralSidebarBg from '../assets/floral_sidebar_bg.png';

const drawerWidth = 260;

export default function Layout() {
  const theme = useTheme();
  const { themeMode, setThemeMode, customColors, customBgUrl, setCustomBgUrl, analyzedTheme } = useThemeMode();
  const isLight = theme.palette.mode === 'light';

  const overlayStyle = useMemo(() => {
    if (themeMode !== 'customize' || !customBgUrl) return null;
    const isDark = analyzedTheme?.isDark ?? true;
    const bgColor = isDark ? '#0a0f1d' : '#f1f5f9';
    const imgOpacity = isDark ? 0.75 : 0.65;
    const overlayBg = isDark 
      ? 'linear-gradient(180deg, rgba(10, 15, 29, 0.4) 0%, rgba(10, 15, 29, 0.82) 100%)'
      : 'linear-gradient(180deg, rgba(241, 245, 249, 0.45) 0%, rgba(241, 245, 249, 0.85) 100%)';
    return { bgColor, imgOpacity, overlayBg };
  }, [themeMode, customBgUrl, analyzedTheme]);

  const glassPanelSx = {
    background: themeMode === 'customize'
      ? isLight 
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(244, 246, 248, 0.65) 100%)'
        : 'linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(10, 15, 29, 0.72) 100%)'
      : isLight 
        ? `linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 250, 245, 0.93) 100%), url(${floralSidebarBg})`
        : 'linear-gradient(180deg, rgba(18, 24, 36, 0.82) 0%, rgba(11, 15, 25, 0.68) 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRight: isLight 
      ? '1px solid rgba(0, 0, 0, 0.08)' 
      : '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: isLight 
      ? '0 16px 34px rgba(10, 49, 77, 0.05)' 
      : '0 16px 34px rgba(0, 0, 0, 0.25)'
  };

  const [themeAnchorEl, setThemeAnchorEl] = useState(null);

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

    { text: 'Partner Integration Hub', icon: <SyncIcon />, path: '/swiggy-zomato', color: '#f43f5e', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Email Directory', icon: <MailOutlineIcon />, path: '/aggregator-mail', color: '#14b8a6', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Bulk Action', icon: <LayersIcon />, path: '/bulk-action', color: '#6366f1', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { text: 'Settings', icon: <Settings />, path: '/settings', color: '#64748b', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'Images and Other Docs', icon: <PhotoLibraryIcon />, path: '/images-docs', color: '#a855f7', roles: ['SUPER_ADMIN'] },
    { text: 'Store Contact & Email Management', icon: <ContactMailIcon />, path: '/store-contact-email', color: '#0A314D', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { text: 'Store Control Center', icon: <TuneIcon />, path: '/delete-branches', color: '#ef4444', roles: ['SUPER_ADMIN'] },
    { text: 'Contact Details', icon: <ContactsIcon />, path: '/contacts', color: '#22c55e', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] },
    { text: 'User Registrations', icon: <HowToRegIcon />, path: '/user-registrations', color: '#d97706', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { text: 'Audit Trail', icon: <NotificationsActive />, path: '/audit-trail', color: '#14b8a6', roles: ['SUPER_ADMIN', 'ADMIN'] },
  ];

  const MODULE_KEYS = {
    'Dashboard': 'dashboard',
    'All Stores': 'all_stores',
    'Expansion Pipeline': 'expansion_pipeline',
    'NSO Approval': 'nso_approval',
    'Partner Integration Hub': 'swiggy_zomato',
    'Email Directory': 'email_directory',
    'Store Contact & Email Management': 'store_contact_email',
    'Store Control Center': 'store_control_center',
    'User Registrations': 'user_registrations',
    'Audit Trail': 'audit_trail',
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
    () => menuItems.find(item => item.path === location.pathname || (item.path === '/' && location.pathname === '/dashboard'))?.text || 'Dashboard',
    [location.pathname]
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...(themeMode === 'customize' ? { background: 'transparent' } : glassPanelSx) }}>
      <Box sx={{ 
        flexShrink: 0,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        px: 2, 
        pt: 1.5, 
        pb: 1.5, 
        gap: 0.75,
        background: 'linear-gradient(135deg, #0A314D 0%, #051622 100%)',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1.5px solid rgba(0, 242, 255, 0.15)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-40%',
          right: '-30%',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 242, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-30%',
          left: '-20%',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }
      }}>
        {/* Brand Logos with premium 3D/7D glassy sphere design */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, position: 'relative', zIndex: 1 }}>
          {/* Blue Tokai Logo */}
          <Box sx={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255,255,255,0.45), 0 0 16px rgba(0, 242, 255, 0.6)',
            border: '2.5px solid #00f2ff',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.1) translateY(-2px)',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7), inset 0 2px 6px rgba(255,255,255,0.65), 0 0 24px #00f2ff',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 2,
              left: '15%',
              right: '15%',
              height: '35%',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 100%)',
              zIndex: 2,
              pointerEvents: 'none'
            }
          }}>
            <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
          </Box>

          {/* Suchali's Logo */}
          <Box sx={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255,255,255,0.45), 0 0 16px rgba(245, 158, 11, 0.6)',
            border: '2.5px solid #f59e0b',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.1) translateY(-2px)',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7), inset 0 2px 6px rgba(255,255,255,0.65), 0 0 24px #f59e0b',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 2,
              left: '15%',
              right: '15%',
              height: '35%',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 100%)',
              zIndex: 2,
              pointerEvents: 'none'
            }
          }}>
            <img src={suchaliLogo} alt="Suchali's" style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
          </Box>

          {/* Got Tea Logo */}
          <Box sx={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#e2f8fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255,255,255,0.45), 0 0 16px rgba(16, 185, 129, 0.6)',
            border: '2.5px solid #10b981',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.1) translateY(-2px)',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7), inset 0 2px 6px rgba(255,255,255,0.65), 0 0 24px #10b981',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 2,
              left: '15%',
              right: '15%',
              height: '35%',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 100%)',
              zIndex: 2,
              pointerEvents: 'none'
            }
          }}>
            <img src={gotTeaLogo} alt="Got Tea" style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
          </Box>
        </Box>

        {/* NSO PORTAL text with premium metallic visual effects */}
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 900, 
            fontSize: '1.65rem', 
            letterSpacing: '0.08em',
            color: '#ffffff',
            textShadow: '0 4px 10px rgba(0, 0, 0, 0.65), 0 0 12px rgba(0, 242, 255, 0.25)',
            position: 'relative',
            zIndex: 1,
            display: 'block',
            lineHeight: 1.3,
            py: 0.15,
            mb: 0.25
          }}
        >
          NSO PORTAL
        </Typography>

        {/* Decorative Gold & Blue Split Line */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '90%', my: 0.25, position: 'relative', zIndex: 1, mb: 0.5 }}>
          <Box sx={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, transparent, #00f2ff)' }} />
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
          <Box sx={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
        </Box>

        {/* Premium Capsule Button from mockup */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: 38,
          p: '6px 10px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, rgba(10, 25, 47, 0.95) 0%, rgba(16, 37, 66, 0.85) 100%)',
          border: '1px solid rgba(0, 242, 255, 0.35)',
          boxShadow: '0 8px 20px rgba(0, 242, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 10px 24px rgba(0, 242, 255, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
            borderColor: 'rgba(0, 242, 255, 0.55)'
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -1,
            borderRadius: '30px',
            padding: '1px',
            background: 'linear-gradient(90deg, #00f2ff, #f59e0b)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none'
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%' }}>
            <Box sx={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              bgcolor: 'rgba(0, 242, 255, 0.2)',
              border: '1px solid rgba(0, 242, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f2ff',
              flexShrink: 0
            }}>
              <StorefrontIcon sx={{ fontSize: 12 }} />
            </Box>
            <Typography 
              sx={{ 
                color: '#ffffff', 
                fontSize: '0.68rem', 
                fontWeight: 850, 
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap'
              }}
            >
              Store Management Console
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider sx={{ mb: 1.5, borderColor: 'divider' }} />
      <List sx={{ px: 1.5, flexGrow: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } }}>
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
                  color: isActive ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? '#111827' : '#cbd5e1'),
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
                    fontWeight: isActive ? 800 : 650, 
                    fontSize: '0.84rem',
                    lineHeight: 1.3,
                    letterSpacing: '0.02em',
                    color: isActive ? item.color : 'inherit',
                    textShadow: isActive ? `0 0 12px ${alpha(item.color, 0.3)}` : 'none',
                    transition: 'color 0.2s ease, text-shadow 0.2s ease'
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
      {themeMode === 'customize' && customBgUrl && overlayStyle && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            overflow: 'hidden',
            backgroundColor: overlayStyle.bgColor,
            transition: 'background-color 0.4s ease',
          }}
        >
          {/* Main Background Image with adaptive opacity */}
          <img
            src={customBgUrl}
            alt="Custom Theme"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              opacity: overlayStyle.imgOpacity,
              transition: 'opacity 0.4s ease',
            }}
          />
          {/* Readability & Contrast Visual Overlay Layer */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: overlayStyle.overlayBg,
              transition: 'background 0.4s ease',
            }}
          />
        </Box>
      )}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #0A314D 0%, #051622 100%) !important',
          backgroundColor: '#0A314D !important',
          backgroundImage: 'none !important',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12) !important',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15) !important',
          backdropFilter: 'blur(24px) !important',
          WebkitBackdropFilter: 'blur(24px) !important'
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, sm: 2.5, lg: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1.25, display: { sm: 'none' }, color: 'rgba(255, 255, 255, 0.9)' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 800, 
                display: { xs: 'none', md: 'block' }, 
                textTransform: 'uppercase', 
                letterSpacing: '0.22em', 
                mb: 0.35,
                background: 'linear-gradient(90deg, #93c5fd 0%, #e0f2fe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 1px 4px rgba(55,146,164,0.35)',
                fontSize: '0.8rem'
              }}
            >
              BTC — New Store Management
            </Typography>
            <Typography 
              variant="subtitle1" 
              noWrap 
              sx={{ 
                fontWeight: 900, 
                fontSize: { xs: '1rem', md: '1.22rem' }, 
                letterSpacing: '0.06em',
                background: 'linear-gradient(90deg, #ffffff 0%, #a5f3fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 8px rgba(0,0,0,0.2), 0 0 16px rgba(255,255,255,0.45)',
                display: 'inline-block',
                textTransform: 'uppercase',
              }}
            >
              {currentPage}
            </Typography>
          </Box>
          <IconButton size="medium" aria-label="Notifications" title="Notifications" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.85)', border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.15)', bgcolor: 'rgba(255, 255, 255, 0.05)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff' } }}>
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
            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', width: 36, height: 36, fontWeight: 800, fontSize: '0.82rem', border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 18px rgba(0, 0, 0, 0.15)' }}>
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

        <Box sx={{ width: '100%', position: 'relative', zIndex: 1 }}>
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
