import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';

const AuthContext = createContext(null);
const EMAIL_LINK_STORAGE_KEY = 'nso_portal_email_link';
const DEFAULT_ADMIN_EMAIL = 'admin@bluetokaicoffee.com';
const AUTH_DEBUG_PREFIX = '[NSO Auth]';

function normalizeUserEmail(email = '') {
  return email.trim().toLowerCase();
}

function logAuthDebug(message, details) {
  if (details !== undefined) {
    console.log(`${AUTH_DEBUG_PREFIX} ${message}`, details);
    return;
  }

  console.log(`${AUTH_DEBUG_PREFIX} ${message}`);
}

function logAuthError(message, error, details) {
  console.error(`${AUTH_DEBUG_PREFIX} ${message}`, {
    code: error?.code || null,
    message: error?.message || String(error),
    ...details
  });
}

function buildDefaultProfile(firebaseUser) {
  const email = normalizeUserEmail(firebaseUser.email || '');
  const nameFromEmail = email.split('@')[0]?.replace(/[._-]/g, ' ') || 'User';
  const formattedName = nameFromEmail
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    id: firebaseUser.uid,
    email,
    name: formattedName || 'User',
    role: email === DEFAULT_ADMIN_EMAIL ? 'SUPER_ADMIN' : 'USER',
    permissions: '',
    approved: email === DEFAULT_ADMIN_EMAIL,
    registrationStatus: email === DEFAULT_ADMIN_EMAIL ? 'APPROVED' : 'PENDING',
    phone: ''
  };
}

async function getOrCreateUserProfile(firebaseUser) {
  const profileRef = doc(firestore, 'users', firebaseUser.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    const profile = {
      id: firebaseUser.uid,
      ...profileSnap.data()
    };
    const shouldAutoApproveAdmin = profile.email === DEFAULT_ADMIN_EMAIL || profile.role === 'SUPER_ADMIN';

    if (profile.approved === undefined && shouldAutoApproveAdmin) {
      await updateDoc(profileRef, {
        approved: true,
        registrationStatus: 'APPROVED'
      });
      return {
        ...profile,
        approved: true,
        registrationStatus: 'APPROVED'
      };
    }

    return profile;
  }

  const defaultProfile = buildDefaultProfile(firebaseUser);
  await setDoc(profileRef, defaultProfile, { merge: true });
  return defaultProfile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const completeEmailLinkSignIn = async () => {
      const currentUrl = window.location.href;
      const isEmailLink = isSignInWithEmailLink(auth, currentUrl);

      logAuthDebug('Checking email-link sign-in state.', {
        url: currentUrl,
        isEmailLink
      });

      if (!isEmailLink) {
        return;
      }

      const storedEmail = localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
      logAuthDebug('Found stored email context for email-link sign-in.', {
        hasStoredEmail: Boolean(storedEmail),
        storedEmail
      });

      if (!storedEmail) {
        setAuthMessage('Your sign-in link is ready, but the email context is missing. Request a new login link and try again.');
        return;
      }

      try {
        await signInWithEmailLink(auth, storedEmail, currentUrl);
        logAuthDebug('Email-link sign-in completed.', { storedEmail });
        localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
        setAuthMessage('Email sign-in completed successfully.');
        window.history.replaceState({}, document.title, `${window.location.origin}/`);
      } catch (error) {
        logAuthError('Email-link sign-in failed.', error, {
          storedEmail,
          url: currentUrl
        });
        setAuthMessage('The sign-in link is invalid or expired. Request a new login link.');
      }
    };

    completeEmailLinkSignIn();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      logAuthDebug('Auth state changed.', {
        signedIn: Boolean(firebaseUser),
        email: firebaseUser?.email || null,
        uid: firebaseUser?.uid || null
      });

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getOrCreateUserProfile(firebaseUser);
        if (!profile.approved) {
          logAuthDebug('Blocking sign-in because approval is pending or rejected.', {
            email: profile.email,
            registrationStatus: profile.registrationStatus
          });
          setAuthMessage(
            profile.registrationStatus === 'REJECTED'
              ? 'Your registration request was rejected. Please contact the administrator.'
              : 'Your registration is pending admin approval. You can log in after approval.'
          );
          await signOut(auth);
          setUser(null);
          return;
        }
        logAuthDebug('User profile loaded successfully.', {
          email: profile.email,
          role: profile.role,
          approved: profile.approved
        });
        setUser(profile);
      } catch (error) {
        logAuthError('Failed to load user profile.', error, {
          email: firebaseUser?.email || null,
          uid: firebaseUser?.uid || null
        });
        setAuthMessage('Authentication succeeded, but your user profile could not be loaded.');
        setUser({
          id: firebaseUser.uid,
          email: normalizeUserEmail(firebaseUser.email || ''),
          name: firebaseUser.displayName || 'User',
          role: 'USER',
          permissions: ''
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setAuthMessage('');
      const normalizedEmail = normalizeUserEmail(email);
      logAuthDebug('Attempting password login.', { email: normalizedEmail });
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const profile = await getOrCreateUserProfile(credential.user);
      if (!profile.approved) {
        await signOut(auth);
        throw profile.registrationStatus === 'REJECTED'
          ? 'Your registration was rejected. Please contact the administrator.'
          : 'Your registration is pending admin approval.';
      }
      logAuthDebug('Password login succeeded.', {
        email: profile.email,
        role: profile.role
      });
      setUser(profile);
      return profile;
    } catch (error) {
      logAuthError('Password login failed.', error, {
        email: normalizeUserEmail(email)
      });
      if (typeof error === 'string') {
        throw error;
      }
      throw 'Invalid email or password.';
    }
  };

  const sendLoginLink = async (email) => {
    const normalizedEmail = normalizeUserEmail(email);
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true
    };

    logAuthDebug('Requesting email-link sign-in.', {
      email: normalizedEmail,
      actionCodeSettings
    });

    try {
      await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);
      localStorage.setItem(EMAIL_LINK_STORAGE_KEY, normalizedEmail);
      logAuthDebug('Email-link sign-in request accepted.', {
        email: normalizedEmail
      });
      setAuthMessage(`Sign-in link sent to ${normalizedEmail}. Check inbox, spam, and promotions.`);
    } catch (error) {
      logAuthError('Email-link sign-in request failed.', error, {
        email: normalizedEmail,
        actionCodeSettings
      });
      throw error;
    }
  };

  const registerUserRequest = async ({ name, email, phone, password }) => {
    const normalizedEmail = normalizeUserEmail(email);
    logAuthDebug('Creating registration request.', {
      email: normalizedEmail,
      phone
    });
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

    await setDoc(
      doc(firestore, 'users', credential.user.uid),
      {
        id: credential.user.uid,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        role: 'USER',
        permissions: '',
        approved: false,
        registrationStatus: 'PENDING',
        requestedAt: serverTimestamp()
      },
      { merge: true }
    );

    await signOut(auth);
    logAuthDebug('Registration request created successfully.', {
      email: normalizedEmail,
      uid: credential.user.uid
    });
    setAuthMessage('Registration request submitted. Wait for admin approval before logging in.');
  };

  const sendResetPassword = async email => {
    const normalizedEmail = normalizeUserEmail(email);
    logAuthDebug('Sending password reset email.', {
      email: normalizedEmail
    });
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      logAuthDebug('Password reset email request accepted.', {
        email: normalizedEmail
      });
    } catch (error) {
      logAuthError('Password reset email request failed.', error, {
        email: normalizedEmail
      });
      throw error;
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (!auth.currentUser?.email) {
      throw 'No authenticated user found.';
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000; // 24 hours

    const lastActivityStr = localStorage.getItem('nso_portal_last_activity');
    const lastUid = localStorage.getItem('nso_portal_last_activity_uid');
    
    if (lastActivityStr && lastUid === user.id) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        logAuthDebug('Closing user session: Inactivity exceeded 24 hours.');
        logout();
        return;
      }
    } else {
      localStorage.setItem('nso_portal_last_activity', Date.now().toString());
      localStorage.setItem('nso_portal_last_activity_uid', user.id);
    }

    const activityEvents = ['mousedown', 'click', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => {
      localStorage.setItem('nso_portal_last_activity', Date.now().toString());
      localStorage.setItem('nso_portal_last_activity_uid', user.id);
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const storedActivity = localStorage.getItem('nso_portal_last_activity');
      const storedUid = localStorage.getItem('nso_portal_last_activity_uid');
      if (storedActivity && storedUid === user.id) {
        const lastActivity = parseInt(storedActivity, 10);
        if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
          logAuthDebug('Automatically logging out due to 24-hour inactivity limit.');
          logout();
        }
      }
    }, 10000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInterval);
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        sendLoginLink,
        registerUserRequest,
        sendResetPassword,
        changePassword,
        authMessage,
        clearAuthMessage: () => setAuthMessage(''),
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
