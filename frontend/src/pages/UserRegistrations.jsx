import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TableContainer,
  Paper,
  Typography
} from '@mui/material';
import FullScreenLoader from '../components/FullScreenLoader';
import { collection, getDocs, query, updateDoc, where, doc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

export default function UserRegistrations() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const loadPendingUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const requestQuery = query(collection(firestore, 'users'), where('approved', '==', false));
      const snapshot = await getDocs(requestQuery);
      const users = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));
      setPendingUsers(users);
    } catch (loadError) {
      console.error('Failed to load registration requests:', loadError);
      setError('Failed to load pending user registration requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const handleStatusUpdate = async (userId, registrationStatus) => {
    setActionLoadingId(userId);
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        approved: registrationStatus === 'APPROVED',
        registrationStatus
      });
      await loadPendingUsers();
    } catch (updateError) {
      console.error('Failed to update registration request:', updateError);
      setError('Failed to update the registration request.');
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em', fontWeight: 800 }}>
            Access Control
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            User Registration Requests
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 620 }}>
            Review new user requests, verify identity details, and approve access only after administrative validation.
          </Typography>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <FullScreenLoader messages={[
          'Warming up the espresso machine…',
          'Grinding the freshest beans…',
          'Fetching user requests…',
          'Plating the details…',
          'Almost ready to serve ☕',
        ]} />
      ) : pendingUsers.length === 0 ? (
        <Card sx={{ borderRadius: '24px' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700 }}>No pending requests.</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              All submitted registrations have already been reviewed.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {pendingUsers.map(user => (
            <Card key={user.id} sx={{ borderRadius: '24px' }}>
              <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{user.name || 'Unnamed User'}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{user.email}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Phone: {user.phone || '—'}</Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={user.registrationStatus || 'PENDING'} color="warning" sx={{ fontWeight: 700 }} />
                    <Chip size="small" label="Awaiting review" sx={{ bgcolor: 'rgba(111,205,220,0.14)', color: 'text.primary' }} />
                  </Box>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={actionLoadingId === user.id}
                    onClick={() => handleStatusUpdate(user.id, 'REJECTED')}
                    sx={{ fontWeight: 700, borderRadius: '10px' }}
                  >
                    {actionLoadingId === user.id ? <CircularProgress size={18} color="inherit" /> : 'Reject'}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={actionLoadingId === user.id}
                    onClick={() => handleStatusUpdate(user.id, 'APPROVED')}
                    sx={{ fontWeight: 700, borderRadius: '10px' }}
                  >
                    {actionLoadingId === user.id ? <CircularProgress size={18} color="inherit" /> : 'Approve'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
