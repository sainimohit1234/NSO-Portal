import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
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

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    const user = decoded as any;
    req.user = user;

    // Check for session termination and update heartbeat (only if user.id exists)
    if (user && user.id) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          // activeSessionId null = "allow_both" mode — no enforcement
          if (user.sessionId && dbUser.activeSessionId && dbUser.activeSessionId !== user.sessionId) {
            return res.status(401).json({ error: 'SESSION_TERMINATED' });
          }

          // Update heartbeat and lastLoginAt
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastActiveAt: new Date(),
              ...(!dbUser.lastLoginAt ? { lastLoginAt: new Date() } : {})
            }
          }).catch(e => console.error('Failed to update lastActiveAt:', e));
        }
      } catch (e) {
        console.error('Session check error:', e);
      }
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

// ─── POST /login ────────────────────────────────────────────────────────────
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

    // ── Session conflict check ──
    // A session conflict is only active if activeSessionId is set AND the last active heartbeat is within the last 60 seconds
    if (user.activeSessionId && user.lastActiveAt) {
      const timeSinceLastActivity = Date.now() - new Date(user.lastActiveAt).getTime();
      if (timeSinceLastActivity < 60 * 1000) {
        // The other session is actively polling/interactive — signal conflict
        return res.status(200).json({ conflict: true });
      }
    }

    // ── No conflict or session is stale — normal login ──
    const sessionId = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(), 
        lastActiveAt: new Date(), 
        activeSessionId: sessionId 
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions, sessionId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ─── POST /login/confirm ─────────────────────────────────────────────────────
// Called after user decides how to handle a session conflict.
// action = "force_logout" | "allow_both"
router.post('/login/confirm', async (req: Request, res: Response) => {
  try {
    const { email, password, action } = req.body;
    if (!email || !password || !action) {
      return res.status(400).json({ error: 'email, password and action are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid email or password' });

    let sessionId: string | undefined;

    if (action === 'force_logout') {
      // Generate a new sessionId — old JWT's sessionId no longer matches → SESSION_TERMINATED on poll
      sessionId = crypto.randomUUID();
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(), 
          lastActiveAt: new Date(), 
          activeSessionId: sessionId 
        }
      });
    } else if (action === 'allow_both') {
      // Clear activeSessionId so no session is enforced — both browsers remain valid
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(), 
          lastActiveAt: new Date(), 
          activeSessionId: null 
        }
      });
      // sessionId intentionally omitted from JWT — middleware skips enforcement
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "force_logout" or "allow_both".' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions, ...(sessionId ? { sessionId } : {}) },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions }
    });
  } catch (error) {
    console.error('Login confirm error:', error);
    res.status(500).json({ error: 'Internal server error during login confirmation' });
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error fetching profile' });
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { activeSessionId: null }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
});

// ─── POST /reset-password ────────────────────────────────────────────────────
router.post('/reset-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPasswordValid = verifyPassword(oldPassword, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: 'Incorrect old password' });

    const newPasswordHash = hashPassword(newPassword);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: newPasswordHash } });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error during password reset' });
  }
});

// ─── POST /forgot-password ───────────────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return res.status(404).json({ error: 'Please enter a registered Bluetokai email ID.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiry: expiry } });

    sendOTPEmail(user.email, otp);
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

// ─── POST /verify-otp-reset ──────────────────────────────────────────────────
router.post('/verify-otp-reset', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP code.' });
    }
    if (user.otpExpiry && new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const newPasswordHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPasswordHash, otpCode: null, otpExpiry: null }
    });

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Verify OTP and reset password error:', error);
    res.status(500).json({ error: 'Internal server error resetting password' });
  }
});

export default router;
