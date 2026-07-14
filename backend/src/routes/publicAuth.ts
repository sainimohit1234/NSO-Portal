import { Router } from 'express';
import { firebaseAdmin } from '../lib/firebase-admin';

const router = Router();
const db = firebaseAdmin.firestore();

// POST /api/public-auth/check-phone
router.post('/check-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Missing phone number.' });
    }

    const userQuery = await db.collection('users').where('phone', '==', phone).get();
    
    if (userQuery.empty) {
      // Try again without the country code, just in case
      let fallbackPhone = phone;
      if (phone.startsWith('+91')) {
        fallbackPhone = phone.substring(3);
      } else if (phone.startsWith('+')) {
        fallbackPhone = phone.replace(/^\+\d+/, '');
      }
      
      const fallbackQuery = await db.collection('users').where('phone', '==', fallbackPhone).get();
      if (fallbackQuery.empty) {
        return res.json({ exists: false });
      }
    }
    
    return res.json({ exists: true });
  } catch (error: any) {
    console.error('Error checking phone:', error);
    return res.status(500).json({ error: 'Failed to verify phone number.' });
  }
});

// POST /api/public-auth/reset-password-phone
router.post('/reset-password-phone', async (req, res) => {
  try {
    const { phoneToken, newPassword } = req.body;

    if (!phoneToken || !newPassword) {
      return res.status(400).json({ error: 'Missing phone token or new password.' });
    }

    // Verify the phone token (ID token from Firebase Client SDK)
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(phoneToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Provided token does not contain a verified phone number.' });
    }

    // Find the user in Firestore who has this phone number
    const userQuery = await db.collection('users').where('phone', '==', phoneNumber).get();
    
    let targetUserId = '';
    
    if (userQuery.empty) {
      // Try again without the country code, in case it was saved differently
      let fallbackPhone = phoneNumber;
      if (phoneNumber.startsWith('+91')) {
        fallbackPhone = phoneNumber.substring(3);
      } else if (phoneNumber.startsWith('+')) {
        // Just naive strip for any other country code if not +91
        // Usually India is +91, but let's just strip standard prefixes if needed
        fallbackPhone = phoneNumber.replace(/^\+\d+/, '');
      }
      
      const fallbackQuery = await db.collection('users').where('phone', '==', fallbackPhone).get();
      if (fallbackQuery.empty) {
        return res.status(404).json({ error: 'No user account found linked to this phone number.' });
      }
      targetUserId = fallbackQuery.docs[0].id;
    } else {
      targetUserId = userQuery.docs[0].id;
    }

    // Update the main user account password
    await firebaseAdmin.auth().updateUser(targetUserId, {
      password: newPassword
    });

    // Delete the temporary phone auth user record from Firebase Auth so it doesn't leave garbage
    if (decodedToken.uid !== targetUserId) {
      await firebaseAdmin.auth().deleteUser(decodedToken.uid).catch(() => {});
    }

    return res.json({ success: true, message: 'Password has been successfully updated.' });

  } catch (error: any) {
    console.error('Error resetting password via phone:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset password.' });
  }
});

import nodemailer from 'nodemailer';
import { getSMTPConfig } from '../utils/smtp';

// POST /api/public-auth/send-login-link
router.post('/send-login-link', async (req, res) => {
  try {
    const { email, continueUrl } = req.body;

    if (!email || !continueUrl) {
      return res.status(400).json({ error: 'Missing email or continueUrl.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Helper for audit trail
    const logAttempt = async (status: string, failureReason: string = '') => {
      try {
        await db.collection('login_audit_trail').add({
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          status,
          failureReason,
          method: 'OTP Link'
        });
      } catch (err) {
        console.error('Failed to write audit trail:', err);
      }
    };

    // 1. Check Rate Limits (Max 5 requests per 120 minutes)
    const rateLimitRef = db.collection('otp_rate_limits').doc(normalizedEmail);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const twoHoursAgo = now - 120 * 60 * 1000;
    
    let requests: number[] = [];
    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      requests = data?.requests || [];
      requests = requests.filter((timestamp: number) => timestamp > twoHoursAgo);
    }
    
    if (requests.length >= 5) {
      await logAttempt('Rate Limited', 'Exceeded 5 requests in 120 minutes');
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // 2. Validate User
    const userQuery = await db.collection('users').where('email', '==', normalizedEmail).get();
    if (userQuery.empty) {
      await logAttempt('Unregistered User', 'User not found in the database');
      return res.status(404).json({ error: 'This email address is not registered in the NSO Portal. Please contact your administrator for access.' });
    }

    const dbUser = userQuery.docs[0].data();
    if (dbUser.approved !== true && normalizedEmail !== 'admin@bluetokaicoffee.com') {
      await logAttempt('Inactive User', 'Account is pending approval or disabled');
      return res.status(403).json({ error: 'Your account is currently inactive. Please contact the NSO Administrator.' });
    }

    // Update rate limit count
    requests.push(now);
    await rateLimitRef.set({ requests }, { merge: true });

    // Generate the sign-in link securely via Firebase Admin SDK
    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: true
    };
    
    const signInLink = await firebaseAdmin.auth().generateSignInWithEmailLink(normalizedEmail, actionCodeSettings);

    // Get SMTP configuration from the database/environment
    const config = await getSMTPConfig();
    
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });

    // Send the email using the analytics address as requested
    const mailOptions = {
      from: '"NSO Portal" <analytics@bluetokaicoffee.com>',
      to: normalizedEmail,
      subject: 'Sign in to NSO Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #0284c7; margin-bottom: 20px;">NSO Portal Login</h2>
          <p>Hello,</p>
          <p>We received a request to sign in to your NSO Portal account.</p>
          <p>Please click the button below to complete your sign-in process. This link will expire soon.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signInLink}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Sign In to NSO Portal
            </a>
          </div>
          
          <p style="font-size: 13px; color: #666; margin-top: 30px;">
            If you did not request this email, you can safely ignore it.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <span style="word-break: break-all;">${signInLink}</span>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    await logAttempt('Success', '');

    return res.json({ success: true, message: 'A secure login link has been sent to your registered email address.' });
  } catch (error: any) {
    console.error('Error sending login link via SMTP:', error);
    try {
      const email = req.body.email ? req.body.email.trim().toLowerCase() : 'unknown';
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      await db.collection('login_audit_trail').add({
        email,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent,
        status: 'Failed',
        failureReason: error.message || 'SMTP or Internal Error',
        method: 'OTP Link'
      });
    } catch (e) {}
    
    return res.status(500).json({ error: error.message || 'Failed to send login link.' });
  }
});

// POST /api/public-auth/send-password-reset-email
router.post('/send-password-reset-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email.' });
    }

    // Generate the password reset link securely via Firebase Admin SDK
    const resetLink = await firebaseAdmin.auth().generatePasswordResetLink(email);

    // Get SMTP configuration
    const config = await getSMTPConfig();
    
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });

    const mailOptions = {
      from: '"NSO Portal" <analytics@bluetokaicoffee.com>',
      to: email,
      subject: 'Reset your NSO Portal Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #0284c7; margin-bottom: 20px;">NSO Portal Password Reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your NSO Portal account.</p>
          <p>Please click the button below to set a new password. This link will expire soon.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 13px; color: #666; margin-top: 30px;">
            If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <span style="word-break: break-all;">${resetLink}</span>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: 'Password reset link sent successfully.' });
  } catch (error: any) {
    console.error('Error sending password reset link via SMTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send password reset link.' });
  }
});

export default router;
