import React from 'react';
import { Box, Typography } from '@mui/material';

export default function ImagesDocs() {
  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 3 }}>
        Images and Other Docs
      </Typography>
      
      <Box sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper' }}>
        <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No document sections are currently configured.
        </Typography>
      </Box>
    </Box>
  );
}
