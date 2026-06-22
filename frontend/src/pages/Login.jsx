import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Typography, TextField, Button, Card, CardContent, 
  Alert, CircularProgress, InputAdornment, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import axios from 'axios';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../context/AuthContext';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import suchaliLogo from '../assets/suchali_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState('');

  const handleOpenForgotDialog = () => {
    setForgotDialogOpen(true);
    setForgotEmail('');
    setOtpSent(false);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
  };

  const handleCloseForgotDialog = () => {
    setForgotDialogOpen(false);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    const forgotEmailLower = forgotEmail.trim().toLowerCase();
    if (!forgotEmailLower.endsWith('@bluetokaicoffee.com') && !forgotEmailLower.endsWith('@gottea.in')) {
      setForgotError('Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading('otp');

    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email: forgotEmail.trim()
      });
      setForgotSuccess(response.data?.message || 'OTP sent successfully!');
      setOtpSent(true);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send OTP. Please check if your email is registered.');
    } finally {
      setForgotLoading('');
    }
  };

  const handleResetPasswordWithOTP = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword || !confirmPassword) {
      setForgotError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading('reset');

    try {
      const response = await axios.post('/api/auth/verify-otp-reset', {
        email: forgotEmail.trim(),
        otp: otpCode.trim(),
        newPassword
      });
      setForgotSuccess(response.data?.message || 'Password reset successful!');
      setTimeout(() => {
        setForgotDialogOpen(false);
      }, 2500);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password. Please check your OTP.');
    } finally {
      setForgotLoading('');
    }
  };
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect to redirectPath or default to dashboard /
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    // Email domain validation on client side
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      setError('Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(0, 122, 140, 0.06) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(229, 169, 59, 0.04) 0%, transparent 40%)',
      px: 2
    }}>
      <Card sx={{
        maxWidth: 450,
        width: '100%',
        bgcolor: 'background.paper',
        borderRadius: '24px',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 20px 45px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        transition: 'transform 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)'
        }
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              mb: 3,
              p: 1,
              borderRadius: '20px',
              bgcolor: 'rgba(0, 173, 198, 0.05)',
              border: '1px solid rgba(0, 173, 198, 0.1)'
            }}>
              <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover' }} />
              <img src={suchaliLogo} alt="Suchali's" style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover' }} />
              <img src={gotTeaLogo} alt="Got Tea" style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: '0.02em' }}>
              NSO Portal Login
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Enter your credentials to manage new store operations
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontSize: '0.85rem' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="Bluetokai Email Address"
                type="email"
                placeholder="name@bluetokaicoffee.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ color: 'text.secondary' }}>
                        <EmailIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '12px' }
                  }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ color: 'text.secondary' }}>
                        <LockIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '12px' }
                  }
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
                <Button 
                  onClick={handleOpenForgotDialog} 
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} 
                  color="primary"
                >
                  Forgot Password?
                </Button>
              </Box>

              <Button
                variant="contained"
                size="large"
                type="submit"
                disabled={loading}
                sx={{
                  py: 1.8,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 8px 20px rgba(0, 173, 198, 0.3)'
                  }
                }}
                fullWidth
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 320 }}>
              Only email addresses with the domain <strong>@bluetokaicoffee.com</strong> or <strong>@gottea.in</strong> are allowed. Seed account default: <em>Bluetokai@123</em>.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={forgotDialogOpen} 
        onClose={handleCloseForgotDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Forgot Password</DialogTitle>
        <DialogContent>
          {forgotError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.85rem' }}>{forgotError}</Alert>}
          {forgotSuccess && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 2, 
                borderRadius: '8px', 
                fontSize: '0.85rem',
                color: '#000000',
                fontWeight: 700,
                '& .MuiAlert-message': {
                  color: '#000000',
                  fontWeight: 700
                }
              }}
            >
              {forgotSuccess}
            </Alert>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOTP}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Enter your registered Bluetokai email address. We will send you a 6-digit verification OTP to reset your password.
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                placeholder="name@bluetokaicoffee.com"
                fullWidth
                variant="outlined"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                slotProps={{
                  input: {
                    sx: { borderRadius: '10px' }
                  }
                }}
              />
              <DialogActions sx={{ px: 0, pb: 0, mt: 2 }}>
                <Button onClick={handleCloseForgotDialog} color="inherit" sx={{ fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={forgotLoading === 'otp'}
                  sx={{ fontWeight: 700, borderRadius: '8px' }}
                >
                  {forgotLoading === 'otp' ? <CircularProgress size={20} color="inherit" /> : 'Send OTP'}
                </Button>
              </DialogActions>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordWithOTP}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Please enter the 6-digit OTP sent to <strong>{forgotEmail}</strong> and enter your new password.
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Enter OTP"
                type="text"
                placeholder="123456"
                fullWidth
                variant="outlined"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    sx: { borderRadius: '10px' }
                  }
                }}
              />
              <TextField
                margin="dense"
                label="New Password"
                type="password"
                placeholder="••••••••"
                fullWidth
                variant="outlined"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    sx: { borderRadius: '10px' }
                  }
                }}
              />
              <TextField
                margin="dense"
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                fullWidth
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                slotProps={{
                  input: {
                    sx: { borderRadius: '10px' }
                  }
                }}
              />
              <DialogActions sx={{ px: 0, pb: 0, mt: 3 }}>
                <Button onClick={() => setOtpSent(false)} color="inherit" sx={{ fontWeight: 600 }}>
                  Back
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={forgotLoading === 'reset'}
                  sx={{ fontWeight: 700, borderRadius: '8px' }}
                >
                  {forgotLoading === 'reset' ? <CircularProgress size={20} color="inherit" /> : 'Reset Password'}
                </Button>
              </DialogActions>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
