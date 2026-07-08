import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';

export default function GlobalErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    // If it's a dynamic import error (chunk load error), we can try to auto-reload once.
    if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      const hasReloaded = sessionStorage.getItem('chunkLoadErrorReloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('chunkLoadErrorReloaded', 'true');
        window.location.reload();
      } else {
        // If it still fails after a reload, clear the flag and show the error UI
        sessionStorage.removeItem('chunkLoadErrorReloaded');
      }
    }
  }, [error]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3, textAlign: 'center' }}>
      <Typography variant="h4" color="error" gutterBottom sx={{ fontWeight: 800 }}>
        Oops! Something went wrong.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        {error?.message || "An unexpected application error occurred. We couldn't load the requested page."}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
        <Button variant="outlined" color="primary" onClick={() => {
          window.location.href = '/';
        }}>
          Go to Dashboard
        </Button>
      </Box>
    </Box>
  );
}
