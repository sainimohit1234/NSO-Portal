import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Button, Stack, Dialog, DialogTitle, 
  DialogContent, DialogActions, List, ListItem, ListItemText, ListItemIcon,
  TextField, InputAdornment, MenuItem, Alert
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Approvals() {
  const [stores, setStores] = useState([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [attemptedStoreName, setAttemptedStoreName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [remarksError, setRemarksError] = useState(false);
  const [selectedStoreForRemarks, setSelectedStoreForRemarks] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [successMsg, setSuccessMsg] = useState(location.state?.successMessage || '');

  useEffect(() => {
    if (location.state?.successMessage) {
      // Clear location state to prevent showing on refresh
      window.history.replaceState({}, document.title);
      // Auto-hide alert after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Only Super Admins and users with APPROVER permission can change workflow status
  const canApprove = user?.role === 'SUPER_ADMIN' || user?.permissions?.includes('APPROVER');

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'LIVE':
        return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' };       // Green
      case 'NSO_APPROVED':
      case 'APPROVED':
        return { bgcolor: 'rgba(234, 179, 8, 0.12)', color: '#a16207', border: '1px solid rgba(234, 179, 8, 0.35)' };       // Yellow
      case 'COMPLIANCE_APPROVED':
      case 'PENDING_APPROVAL':
        return { bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', border: '1px solid rgba(249, 115, 22, 0.3)' };      // Orange
      case 'ON_HOLD':
        return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' };        // Red
      case 'INCOMPLETE_INFORMATION':
        return { bgcolor: 'rgba(100, 116, 139, 0.10)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };   // Grey
      default:
        return { bgcolor: 'rgba(100, 116, 139, 0.10)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };
    }
  };

  const fetchStores = () => {
    axios.get('/api/stores')
      .then(res => setStores(res.data.filter(s => ['PENDING_APPROVAL', 'NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE', 'ON_HOLD'].includes(s.status))))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleAction = async (store, actionStatus) => {
    try {
      await axios.put(`/api/stores/${store.id}/status`, { status: actionStatus });
      fetchStores(); // Refresh list
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data?.missingFields) {
        setAttemptedStoreName(store.cafeName);
        setMissingFields(error.response.data.missingFields);
        setValidationOpen(true);
      } else {
        console.error('Failed to update status', error);
      }
    }
  };

  const handleStatusDropdownChange = async (store, newStatus) => {
    if (newStatus === 'ON_HOLD') {
      setSelectedStoreForRemarks(store);
      setRemarksText(store.remarks || '');
      setRemarksError(false);
      setRemarksDialogOpen(true);
    } else {
      handleAction(store, newStatus === 'APPROVED' ? 'NSO_APPROVED' : newStatus);
    }
  };

  const handleSaveRemarks = async () => {
    if (!remarksText || String(remarksText).trim() === '') {
      setRemarksError(true);
      return;
    }
    try {
      await axios.put(`/api/stores/${selectedStoreForRemarks.id}/status`, { 
        status: 'ON_HOLD', 
        remarks: remarksText 
      });
      setRemarksDialogOpen(false);
      fetchStores();
    } catch (error) {
      console.error('Failed to place cafe on hold', error);
    }
  };

  const handleLaunchStatusChange = async (storeId, newLaunchStatus) => {
    try {
      await axios.put(`/api/stores/${storeId}`, { launchStatus: newLaunchStatus });
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, launchStatus: newLaunchStatus } : s));
    } catch (error) {
      console.error('Failed to update launch status', error);
    }
  };

  const formatFieldName = (field) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace('Mail Id', 'Mail ID')
      .replace('Gst', 'GST')
      .replace('Fssai', 'FSSAI')
      .replace('Latt', 'Latitude (Short)')
      .replace('Long', 'Longitude')
      .replace('Google Link', 'Google Map Link');
  };

  const filteredStores = stores.filter(store => {
    // Search query filter
    let searchMatch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = (store.cafeName || '').toLowerCase().includes(query);
      const codeMatch = (store.cafeCode || '').toLowerCase().includes(query);
      searchMatch = nameMatch || codeMatch;
    }
    
    // Approval filter
    let approvalMatch = true;
    if (approvalFilter !== 'ALL') {
      if (approvalFilter === 'NSO_APPROVED') {
        approvalMatch = ['NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(store.status);
      } else {
        approvalMatch = store.status === approvalFilter;
      }
    }

    return searchMatch && approvalMatch;
  });

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{
        position: 'sticky',
        top: { xs: 56, sm: 64 },
        zIndex: 10,
        bgcolor: 'background.default',
        mt: -4,
        pt: 4,
        pb: 2,
        mb: 4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            NSO Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and approve new store setups before they go live on external delivery partner engines.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            sx={{ width: 160, bgcolor: 'background.paper' }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="PENDING_APPROVAL">Approval Pending</MenuItem>
            <MenuItem value="NSO_APPROVED">Approved</MenuItem>
            <MenuItem value="ON_HOLD">On Hold</MenuItem>
          </TextField>
          <TextField
            size="small"
            placeholder="Search Cafe Name or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300, bgcolor: 'background.paper', borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
      </Box>
    </Box>

      {successMsg && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 4, 
            borderRadius: '12px',
            '& .MuiAlert-message': { fontWeight: 700 }
          }}
        >
          {successMsg}
        </Alert>
      )}

      <Card sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Cafe Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cafe Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Workflow Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>On Hold Remarks</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Approved By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    {stores.length === 0 ? "No stores pending approval. You're all caught up!" : "No stores match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const isStoreApproved = ['NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(store.status);
                  const canClickStore = canApprove && !(user?.role === 'MANAGER' && isStoreApproved);
                  
                  return (
                    <TableRow 
                      key={store.id} 
                      hover={canClickStore}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell 
                        sx={{ 
                          fontWeight: 600, 
                          color: canClickStore ? 'primary.main' : 'text.primary',
                          cursor: canClickStore ? 'pointer' : 'default',
                          textDecoration: canClickStore ? 'underline' : 'none',
                        }}
                        onClick={canClickStore ? () => navigate(`/stores/${store.id}`, { state: { from: '/approvals' } }) : undefined}
                      >
                        {store.cafeCode}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>{store.cafeName}</TableCell>
                      <TableCell>{store.city} - {store.zone}</TableCell>
                      <TableCell>
                        {['NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(store.status) || !canApprove || (store.isLocked && user?.role !== 'SUPER_ADMIN') ? (
                          <Chip
                            icon={
                              store.status === 'LIVE' || store.status === 'COMPLIANCE_APPROVED' ? (
                                <Box 
                                  sx={{ 
                                    width: 6, 
                                    height: 6, 
                                    borderRadius: '50%', 
                                    bgcolor: store.status === 'LIVE' ? '#22c55e' : '#f97316',
                                    boxShadow: `0 0 6px ${store.status === 'LIVE' ? '#22c55e' : '#f97316'}`,
                                    ml: '4px !important',
                                    mr: '-2px !important',
                                    animation: 'pulse 1.8s infinite ease-in-out',
                                    '@keyframes pulse': {
                                      '0%': {
                                        transform: 'scale(0.85)',
                                        boxShadow: `0 0 0 0 ${store.status === 'LIVE' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(249, 115, 22, 0.7)'}`
                                      },
                                      '70%': {
                                        transform: 'scale(1.15)',
                                        boxShadow: `0 0 0 5px ${store.status === 'LIVE' ? 'rgba(34, 197, 94, 0)' : 'rgba(249, 115, 22, 0)'}`
                                      },
                                      '100%': {
                                        transform: 'scale(0.85)',
                                        boxShadow: `0 0 0 0 ${store.status === 'LIVE' ? 'rgba(34, 197, 94, 0)' : 'rgba(249, 115, 22, 0)'}`
                                      }
                                    }
                                  }} 
                                />
                              ) : undefined
                            }
                            label={
                              store.status === 'NSO_APPROVED' || store.status === 'APPROVED' ? 'Awaiting Compliance'
                              : store.status === 'COMPLIANCE_APPROVED' ? 'Compliance Approved'
                              : store.status === 'INCOMPLETE_INFORMATION' ? 'Incomplete Information'
                              : store.status === 'PENDING_APPROVAL' ? 'Approval Pending'
                              : store.status === 'ON_HOLD' ? 'On Hold'
                              : store.status === 'LIVE' ? 'Live'
                              : store.status
                            }
                            size="small"
                            sx={{
                              ...getStatusChipStyle(store.status),
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              px: 0.5,
                              width: 190,
                              justifyContent: 'center'
                            }}
                          />
                        ) : (
                          <TextField
                            select
                            size="small"
                            value={store.status}
                            onChange={(e) => handleStatusDropdownChange(store, e.target.value)}
                            sx={{ minWidth: 200 }}
                          >
                            <MenuItem value="PENDING_APPROVAL">Approval Pending</MenuItem>
                            {canApprove && <MenuItem value="APPROVED">Approved</MenuItem>}
                            {canApprove && <MenuItem value="ON_HOLD">On Hold</MenuItem>}
                          </TextField>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>
                        {store.status === 'ON_HOLD' ? (store.remarks || '—') : ''}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.875rem', color: 'text.primary' }}>
                        {store.approvedBy || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Validation Dialog */}
      <Dialog 
        open={validationOpen} 
        onClose={() => setValidationOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '16px', 
            p: 1.5,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            NSO Validation Failed
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These details must be completed before <strong>{attemptedStoreName}</strong> can be approved:
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 280, overflowY: 'auto', borderRadius: '12px', bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
            <List dense>
              {missingFields.map((field, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 32, color: 'error.main' }}>
                    •
                  </ListItemIcon>
                  <ListItemText 
                    primary={formatFieldName(field)} 
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: 'error.dark' }} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setValidationOpen(false)} 
            variant="contained" 
            color="error" 
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* On Hold Remarks Dialog */}
      <Dialog 
        open={remarksDialogOpen} 
        onClose={() => setRemarksDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '16px', 
            p: 1.5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Reason for placing on hold: {selectedStoreForRemarks?.cafeName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide the reason for putting this store on hold. This is required.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Remarks *"
            variant="outlined"
            value={remarksText}
            onChange={(e) => {
              setRemarksText(e.target.value);
              if (e.target.value.trim() !== '') setRemarksError(false);
            }}
            error={remarksError}
            helperText={remarksError ? 'Remarks are mandatory when placing the cafe on hold.' : ''}
            placeholder="Enter the details of what is missing or why this store is on hold..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1.5 }}>
          <Button 
            onClick={() => setRemarksDialogOpen(false)} 
            variant="outlined"
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRemarks} 
            variant="contained" 
            color="primary" 
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Save Reason
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
