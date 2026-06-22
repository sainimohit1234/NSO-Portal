import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { verifyPassword, hashPassword } from '../utils/auth';
import { getSMTPConfig } from '../utils/smtp';

// Helper function to send email via nodemailer
async function sendOTPEmail(email: string, otp: string) {
  const smtpConfig = getSMTPConfig();
  const transporter = nodemailer.createTransport({
    host: smtpConfig.smtpHost,
    port: smtpConfig.smtpPort,
    secure: smtpConfig.smtpSecure,
    auth: {
      user: smtpConfig.smtpUser,
      pass: smtpConfig.smtpPass
    }
  });

  const mailOptions = {
    from: smtpConfig.smtpUser 
      ? `"NSO Portal Admin" <${smtpConfig.smtpUser}>` 
      : '"NSO Portal Admin" <admin@bluetokaicoffee.com>',
    to: email,
    subject: 'Your NSO Portal Password Reset OTP',
    text: `Your One-Time Password (OTP) for resetting your NSO Portal password is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; margin: auto;">
      <h2 style="color: #007a8c; text-align: center;">NSO Portal Password Reset</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the following One-Time Password (OTP) to make a new password:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: 800; text-align: center; color: #007a8c; letter-spacing: 4px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 13px; color: #475569;">This OTP is valid for 10 minutes. If you did not request this reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">Store Operations Portal &copy; 2026</p>
    </div>`
  };

  try {
    if (!smtpConfig.smtpHost || !smtpConfig.smtpUser || smtpConfig.smtpHost === 'smtp.ethereal.email') {
      // Fallback to dynamic test ethereal account if no SMTP configurations are set in env
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      const info = await testTransporter.sendMail(mailOptions);
      console.log('OTP Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
    } else {
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP Email sent successfully to %s: %s', email, info.messageId);
    }
  } catch (error) {
    console.error('Nodemailer failed to send email, logging OTP instead:', error);
  }
}

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'bluetokai_jwt_secret_key_2026';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Authentication middleware
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    
    // Update lastLoginAt in background if it's currently null
    if (user && typeof user !== 'string' && (user as any).id) {
      const userId = (user as any).id;
      prisma.user.findUnique({ where: { id: userId } })
        .then(dbUser => {
          if (dbUser && !dbUser.lastLoginAt) {
            prisma.user.update({
              where: { id: userId },
              data: { lastLoginAt: new Date() }
            }).catch(e => console.error('Failed to auto-update lastLoginAt in token verification:', e));
          }
        })
        .catch(e => console.error('Failed to fetch user in token verification:', e));
    }
    
    next();
  });
};

// Role authorization middleware
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login date
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        permissions: user.permissions 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /me (Retrieve currently logged-in user profile)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error fetching profile' });
  }
});

// POST /reset-password (Reset currently logged-in user's password)
router.post('/reset-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isPasswordValid = verifyPassword(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    // Hash and update to new password
    const newPasswordHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: newPasswordHash }
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error during password reset' });
  }
});

// POST /forgot-password (Request password reset OTP)
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(404).json({ error: 'Please enter a registered Bluetokai email ID.' });
    }

    // Generate a 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user in DB with OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiry: expiry
      }
    });

    // Send email asynchronously
    sendOTPEmail(user.email, otp);

    // For debugging/local testing, also print directly to stdout
    console.log(`\n[OTP DEBUG] Sent password reset OTP for ${user.email}: ${otp}\n`);

    const smtpConfig = getSMTPConfig();
    const isLocalTesting = !smtpConfig.smtpHost || !smtpConfig.smtpUser || smtpConfig.smtpHost === 'smtp.ethereal.email';

    res.json({ 
      message: isLocalTesting 
        ? `OTP generated successfully. (For testing: your OTP code is ${otp})` 
        : 'OTP sent successfully to your registered email.',
      otp: isLocalTesting ? otp : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error requesting OTP' });
  }
});

// POST /verify-otp-reset (Reset password using OTP)
router.post('/verify-otp-reset', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify OTP exists and matches
    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP code.' });
    }

    // Verify OTP expiry
    if (user.otpExpiry && new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Hash and update the password
    const newPasswordHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPasswordHash,
        otpCode: null,
        otpExpiry: null
      }
    });

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Verify OTP and reset password error:', error);
    res.status(500).json({ error: 'Internal server error resetting password' });
  }
});

export default router;
