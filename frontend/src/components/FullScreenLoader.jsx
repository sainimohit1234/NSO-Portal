import React from 'react';
import { Backdrop, Box } from '@mui/material';
import InteractiveLoader from './InteractiveLoader';

export default function FullScreenLoader({ open = true, messages, subtle = false, interval = 1600, blocking = false }) {
  if (!open) return null;

  if (blocking) {
    return (
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => Math.max(theme.zIndex.drawer, theme.zIndex.modal, theme.zIndex.snackbar) + 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(255, 255, 255, 0.7)' 
        }}
        open={open}
      >
        <InteractiveLoader messages={messages} subtle={subtle} interval={interval} />
      </Backdrop>
    );
  }

  // Non-blocking: just a centered overlay that doesn't capture clicks
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.drawer - 1, // Below the drawer so sidebar is clickable/unblurred
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none', // Allow clicking through
      }}
    >
      <Box sx={{ pointerEvents: 'auto' }}>
        <InteractiveLoader messages={messages} subtle={subtle} interval={interval} />
      </Box>
    </Box>
  );
}
