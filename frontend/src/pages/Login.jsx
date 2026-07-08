import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useAuth } from '../context/AuthContext';
import blueTokaiLogo from '../assets/blue_tokai_logo.png';
import suchaliLogo from '../assets/suchali_logo.png';
import gotTeaLogo from '../assets/got_tea_logo.png';
import loginBackground from '../assets/loginback.png';

const LOGIN_EMAIL_DOMAIN = '@bluetokaicoffee.com';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLinkLoading, setEmailLinkLoading] = useState(false);

  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const {
    login,
    sendLoginLink,
    registerUserRequest,
    sendResetPassword,
    authMessage,
    clearAuthMessage
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const normalizeLoginEmail = value => {
    const localPart = value.trim().toLowerCase().replace(/@bluetokaicoffee\.com$/i, '');
    return `${localPart}${LOGIN_EMAIL_DOMAIN}`;
  };

  const handleOpenForgotDialog = () => {
    setForgotDialogOpen(true);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess('');
  };

  const handleCloseForgotDialog = () => {
    setForgotDialogOpen(false);
  };

  const handleOpenRegisterDialog = () => {
    setRegisterDialogOpen(true);
    setRegisterForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    });
    setRegisterError('');
    setRegisterSuccess('');
  };

  const handleCloseRegisterDialog = () => {
    setRegisterDialogOpen(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(normalizeLoginEmail(email), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLinkLogin = async () => {
    if (!email.trim()) {
      setError('Enter your email initials before requesting the OTP link.');
      return;
    }

    setError('');
    setEmailLinkLoading(true);
    console.log('[NSO Login] OTP link request started.', {
      localPart: email.trim().toLowerCase(),
      email: normalizeLoginEmail(email)
    });

    try {
      await sendLoginLink(normalizeLoginEmail(email));
      setError('');
      console.log('[NSO Login] OTP link request finished successfully.', {
        email: normalizeLoginEmail(email)
      });
    } catch (err) {
      console.error('[NSO Login] OTP link request failed.', err);
      setError(typeof err === 'string' ? err : 'Failed to send sign-in link.');
    } finally {
      setEmailLinkLoading(false);
    }
  };

  const handleSendResetEmail = async e => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    const forgotEmailLower = forgotEmail.trim().toLowerCase();
    if (!forgotEmailLower.endsWith('@bluetokaicoffee.com') && !forgotEmailLower.endsWith('@gottea.in')) {
      setForgotError('Use your approved company email address (@bluetokaicoffee.com or @gottea.in).');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      await sendResetPassword(forgotEmail.trim());
      setForgotSuccess('Password reset email sent. Check your inbox.');
    } catch (err) {
      setForgotError(typeof err === 'string' ? err : 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegisterInput = (field, value) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegisterSubmit = async e => {
    e.preventDefault();
    const { name, email: registrationEmail, phone, password: registrationPassword, confirmPassword } = registerForm;

    if (!name.trim() || !registrationEmail.trim() || !phone.trim() || !registrationPassword || !confirmPassword) {
      setRegisterError('Please fill in all registration fields.');
      return;
    }

    const normalizedEmail = registrationEmail.trim().toLowerCase();
    const validDomain = normalizedEmail.endsWith('@bluetokaicoffee.com') || normalizedEmail.endsWith('@gottea.in');
    if (!validDomain) {
      setRegisterError('Use your approved company email address (@bluetokaicoffee.com or @gottea.in).');
      return;
    }

    if (registrationPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters long.');
      return;
    }

    if (registrationPassword !== confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);

    try {
      await registerUserRequest({
        name,
        email: normalizedEmail,
        phone,
        password: registrationPassword
      });
      setRegisterSuccess('Registration request submitted. Wait for admin approval before logging in.');
      setTimeout(() => {
        setRegisterDialogOpen(false);
      }, 1500);
    } catch (err) {
      setRegisterError(typeof err === 'string' ? err : 'Registration failed. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: `linear-gradient(rgba(242, 252, 254, 0.78), rgba(242, 252, 254, 0.68)), url(${loginBackground})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        px: 2,
        flexDirection: 'column',
        gap: 2
      }}
    >
      {authMessage && (
        <Alert
          severity="info"
          onClose={clearAuthMessage}
          sx={{
            maxWidth: 450,
            width: '100%',
            borderRadius: '18px',
            fontWeight: 600,
            fontSize: '0.88rem'
          }}
        >
          {authMessage}
        </Alert>
      )}

      <Card
        sx={{
          maxWidth: 450,
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: '28px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.10)',
          overflow: 'hidden',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)'
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 5 }, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(111,205,220,0.06) 100%)',
              pointerEvents: 'none'
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                mb: 3,
                p: 1.2,
                borderRadius: '999px',
                bgcolor: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(63, 174, 191, 0.12)',
                boxShadow: '0 10px 25px rgba(111,205,220,0.12)',
                position: 'relative',
                zIndex: 1
              }}
            >
              <img src={blueTokaiLogo} alt="Blue Tokai" style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 18px rgba(15,23,42,0.12)' }} />
              <img src={suchaliLogo} alt="Suchali's" style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 18px rgba(15,23,42,0.12)' }} />
              <img src={gotTeaLogo} alt="Got Tea" style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 18px rgba(15,23,42,0.12)' }} />
            </Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em', fontWeight: 800, mb: 1, position: 'relative', zIndex: 1 }}>
              Welcome Back
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>
              NSO Portal Login
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 300, position: 'relative', zIndex: 1 }}>
              Sign in with password or request an email OTP link
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
                label="Email Address"
                type="text"
                placeholder="your.initials"
                value={email}
                onChange={e => setEmail(e.target.value.replace(/@bluetokaicoffee\.com$/i, ''))}
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ color: 'text.secondary' }}>
                        <EmailIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end" sx={{ color: 'text.secondary', fontSize: '0.92rem' }}>
                        {LOGIN_EMAIL_DOMAIN}
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
                onChange={e => setPassword(e.target.value)}
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
                <Button onClick={handleOpenForgotDialog} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} color="primary">
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
                  borderRadius: '16px',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 16px 32px rgba(111, 205, 220, 0.28)'
                  }
                }}
                fullWidth
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In With Password'}
              </Button>

              <Button
                variant="outlined"
                size="large"
                type="button"
                disabled={emailLinkLoading}
                onClick={handleEmailLinkLogin}
                startIcon={emailLinkLoading ? <CircularProgress size={18} color="inherit" /> : <MarkEmailReadIcon />}
                sx={{
                  py: 1.5,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255,255,255,0.36)'
                }}
                fullWidth
              >
                {emailLinkLoading ? 'Sending Link...' : 'Login With OTP Link'}
              </Button>

              <Button
                variant="text"
                type="button"
                onClick={handleOpenRegisterDialog}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  alignSelf: 'center'
                }}
              >
                New User? Register for Approval
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={forgotDialogOpen}
        onClose={handleCloseForgotDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Reset Password</DialogTitle>
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

          <form onSubmit={handleSendResetEmail}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              A password reset email will be sent to your registered company address.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              fullWidth
              variant="outlined"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              required
              slotProps={{
                input: {
                  sx: { borderRadius: '10px' }
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
              <Button onClick={handleCloseForgotDialog} color="inherit" sx={{ fontWeight: 600 }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={forgotLoading} sx={{ fontWeight: 700, borderRadius: '8px' }}>
                {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Email'}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={registerDialogOpen}
        onClose={handleCloseRegisterDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>New User Registration</DialogTitle>
        <DialogContent>
          {registerError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.85rem' }}>{registerError}</Alert>}
          {registerSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.85rem' }}>{registerSuccess}</Alert>}

          <form onSubmit={handleRegisterSubmit}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Submit your details. An admin must approve your request before you can log in.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Full Name"
                fullWidth
                value={registerForm.name}
                onChange={e => handleRegisterInput('name', e.target.value)}
                required
              />
              <TextField
                label="Company Email"
                type="email"
                fullWidth
                placeholder="name@bluetokaicoffee.com"
                value={registerForm.email}
                onChange={e => handleRegisterInput('email', e.target.value)}
                required
              />
              <TextField
                label="Phone Number"
                fullWidth
                value={registerForm.phone}
                onChange={e => handleRegisterInput('phone', e.target.value)}
                required
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={registerForm.password}
                onChange={e => handleRegisterInput('password', e.target.value)}
                required
              />
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                value={registerForm.confirmPassword}
                onChange={e => handleRegisterInput('confirmPassword', e.target.value)}
                required
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
              <Button onClick={handleCloseRegisterDialog} color="inherit" sx={{ fontWeight: 600 }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={registerLoading} sx={{ fontWeight: 700, borderRadius: '8px' }}>
                {registerLoading ? <CircularProgress size={20} color="inherit" /> : 'Submit Request'}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
