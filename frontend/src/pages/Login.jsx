import { useState, useEffect } from 'react';
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
  Typography,
  Tabs,
  Tab
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
import { RecaptchaVerifier, signInWithPhoneNumber, isSignInWithEmailLink } from 'firebase/auth';

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
  const [forgotMode, setForgotMode] = useState('email');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotPhoneToken, setForgotPhoneToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
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

  const [isEmailLinkMode, setIsEmailLinkMode] = useState(false);
  const [completeEmailLinkLoading, setCompleteEmailLinkLoading] = useState(false);

  const {
    login,
    sendLoginLink,
    completeEmailLinkLogin,
    registerUserRequest,
    sendResetPassword,
    auth,
    authMessage,
    clearAuthMessage
  } = useAuth();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setIsEmailLinkMode(true);
      const storedEmail = localStorage.getItem('emailForSignIn');
      if (storedEmail) {
        setEmail(storedEmail.replace(/@bluetokaicoffee\.com$/i, ''));
      }
    }
  }, [auth]);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleCompleteEmailLinkSignInSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email initials to complete sign-in.');
      return;
    }
    setError('');
    setCompleteEmailLinkLoading(true);
    try {
      await completeEmailLinkLogin(normalizeLoginEmail(email));
    } catch (err) {
      setError(typeof err === 'string' ? err : 'The sign-in link is invalid or expired. Please request a new one.');
    } finally {
      setCompleteEmailLinkLoading(false);
    }
  };

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
      let errorMsg = 'Failed to send sign-in link.';
      if (typeof err === 'string') errorMsg = err;
      else if (err?.message) errorMsg = err.message;
      setError(errorMsg);
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

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    if (!forgotPhone.trim()) {
      setForgotError('Please enter your phone number.');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const formattedPhone = forgotPhone.startsWith('+') ? forgotPhone : `+91${forgotPhone.replace(/\D/g, '')}`;

      // Check if phone number is registered
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const checkRes = await fetch(`${baseUrl}/api/public-auth/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok || !checkData.exists) {
        throw new Error('This number is not registered in the NSO portal.');
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmation;
      setForgotOtpSent(true);
      setForgotSuccess('OTP sent to your phone.');
    } catch (err) {
      console.error(err);
      setForgotError(err.message || 'Failed to send OTP.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setForgotError('Please enter the OTP.');
      return;
    }
    
    setForgotError('');
    setForgotLoading(true);
    try {
      const result = await window.confirmationResult.confirm(forgotOtp);
      const token = await result.user.getIdToken();
      setForgotPhoneToken(token);
      setForgotSuccess('Phone number verified. Please enter your new password.');
    } catch (err) {
      console.error(err);
      setForgotError(err.message || 'Invalid OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordPhone = async (e) => {
    e.preventDefault();
    if (!forgotNewPassword.trim() || forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    
    setForgotError('');
    setForgotLoading(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const response = await fetch(`${baseUrl}/api/public-auth/reset-password-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneToken: forgotPhoneToken,
          newPassword: forgotNewPassword
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password.');
      
      // Successfully updated password
      setForgotSuccess('Password updated successfully! You can now log in.');
      setTimeout(() => {
        handleCloseForgotDialog();
      }, 2000);
      
      // Sign out the temporary phone auth user
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (err) {
      console.error(err);
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCloseForgotDialog = () => {
    setForgotDialogOpen(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess('');
    setForgotMode('email');
    setForgotPhone('');
    setForgotOtp('');
    setForgotOtpSent(false);
    setForgotPhoneToken('');
    setForgotNewPassword('');
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
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
      console.error("Registration error encountered:", err);
      let errorMsg = '';
      if (err && typeof err === 'object') {
        if (err.code === 'auth/email-already-in-use') {
          errorMsg = 'This email is already registered or has a pending request. Please check with an admin.';
        } else if (err.code === 'auth/weak-password') {
          errorMsg = 'The password is too weak. Please use a stronger password (min 6 characters).';
        } else if (err.code === 'auth/invalid-email') {
          errorMsg = 'The email address is invalid.';
        } else if (err.message) {
          errorMsg = err.message;
        } else if (err.code) {
          errorMsg = `Registration failed [${err.code}].`;
        } else {
          errorMsg = `Registration failed: ${JSON.stringify(err)}`;
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
      } else {
        errorMsg = 'Registration failed. Please try again.';
      }
      setRegisterError(errorMsg);
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
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontSize: '0.85rem', color: 'black', fontWeight: 500 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={(e) => { e.preventDefault(); if (isEmailLinkMode) { handleCompleteEmailLinkSignInSubmit(); } else { handleSubmit(e); } }}>
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

              {!isEmailLinkMode && (
                <>
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
                </>
              )}

              {isEmailLinkMode ? (
                <Button
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={completeEmailLinkLoading}
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
                  {completeEmailLinkLoading ? <CircularProgress size={24} color="inherit" /> : 'Complete Sign In'}
                </Button>
              ) : (
                <>
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
                </>
              )}

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
          {forgotError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.85rem', color: '#000', fontWeight: 500 }}>{forgotError}</Alert>}
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

          <Tabs 
            value={forgotMode} 
            onChange={(e, val) => {
              setForgotMode(val);
              setForgotError('');
              setForgotSuccess('');
            }}
            variant="fullWidth" 
            sx={{ mb: 2 }}
          >
            <Tab label="Email Reset" value="email" sx={{ fontWeight: 600 }} />
            <Tab label="SMS Reset" value="phone" sx={{ fontWeight: 600 }} />
          </Tabs>

          {forgotMode === 'email' && (
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
          )}

          {forgotMode === 'phone' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Enter your registered phone number to receive an OTP via SMS.
              </Typography>
              
              {!forgotOtpSent && !forgotPhoneToken && (
                <form onSubmit={handleSendPhoneOtp}>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="Phone Number"
                    type="tel"
                    placeholder="9999999999"
                    fullWidth
                    variant="outlined"
                    value={forgotPhone}
                    onChange={e => setForgotPhone(e.target.value)}
                    required
                    slotProps={{
                      input: {
                        sx: { borderRadius: '10px' }
                      }
                    }}
                  />
                  <div id="recaptcha-container" style={{ marginTop: '10px' }}></div>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
                    <Button onClick={handleCloseForgotDialog} color="inherit" sx={{ fontWeight: 600 }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={forgotLoading} sx={{ fontWeight: 700, borderRadius: '8px' }}>
                      {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Send OTP'}
                    </Button>
                  </Box>
                </form>
              )}

              {forgotOtpSent && !forgotPhoneToken && (
                <form onSubmit={handleVerifyPhoneOtp}>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="Enter OTP"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={forgotOtp}
                    onChange={e => setForgotOtp(e.target.value)}
                    required
                    slotProps={{
                      input: {
                        sx: { borderRadius: '10px' }
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
                    <Button onClick={() => setForgotOtpSent(false)} color="inherit" sx={{ fontWeight: 600 }}>
                      Back
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={forgotLoading} sx={{ fontWeight: 700, borderRadius: '8px' }}>
                      {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Verify OTP'}
                    </Button>
                  </Box>
                </form>
              )}

              {forgotPhoneToken && (
                <form onSubmit={handleResetPasswordPhone}>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="New Password"
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
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
                      {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Update Password'}
                    </Button>
                  </Box>
                </form>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={registerDialogOpen}
        onClose={handleCloseRegisterDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '20px', 
            p: 1.5,
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', pb: 1.5 }}>
          New User Registration
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {registerError && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: '10px', 
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#000'
              }}
            >
              {registerError}
            </Alert>
          )}
          {registerSuccess && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3, 
                borderRadius: '10px', 
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              {registerSuccess}
            </Alert>
          )}

          <form onSubmit={handleRegisterSubmit}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3.5, fontWeight: 500, lineHeight: 1.5 }}>
              Submit your details. An admin must approve your request before you can log in.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { label: 'Full Name', value: registerForm.name, onChange: (val) => handleRegisterInput('name', val), type: 'text', placeholder: '' },
                { label: 'Company Email', value: registerForm.email, onChange: (val) => handleRegisterInput('email', val), type: 'email', placeholder: 'name@bluetokaicoffee.com' },
                { label: 'Phone Number', value: registerForm.phone, onChange: (val) => handleRegisterInput('phone', val), type: 'text', placeholder: '' },
                { label: 'Password', value: registerForm.password, onChange: (val) => handleRegisterInput('password', val), type: 'password', placeholder: '' },
                { label: 'Confirm Password', value: registerForm.confirmPassword, onChange: (val) => handleRegisterInput('confirmPassword', val), type: 'password', placeholder: '' }
              ].map((field) => (
                <TextField
                  key={field.label}
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  fullWidth
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  required
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: '#64748b',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      '&.MuiInputLabel-shrink': {
                        color: '#0f172a !important',
                        fontWeight: 800
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      bgcolor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                      '& .MuiInputBase-input': {
                        color: '#0f172a',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#cbd5e1',
                        borderWidth: '1.5px'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#94a3b8'
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#0284c7',
                        borderWidth: '2px'
                      }
                    }
                  }}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 4 }}>
              <Button 
                onClick={handleCloseRegisterDialog} 
                sx={{ 
                  fontWeight: 700, 
                  color: '#64748b',
                  textTransform: 'none',
                  '&:hover': {
                    color: '#0f172a',
                    background: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={registerLoading} 
                sx={{ 
                  fontWeight: 800, 
                  borderRadius: '10px',
                  textTransform: 'none',
                  bgcolor: '#0284c7',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: '#0369a1'
                  }
                }}
              >
                {registerLoading ? <CircularProgress size={20} color="inherit" /> : 'Submit Request'}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>

    </Box>
  );
}
