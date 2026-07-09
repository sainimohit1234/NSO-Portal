import { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// Coffee-themed loading messages that cycle while data is fetched, so the user
// always feels progress instead of staring at a bare spinner.
const DEFAULT_MESSAGES = [
  'Warming up the espresso machine…',
  'Grinding the freshest beans…',
  'Pulling the perfect shot…',
  'Steaming the milk…',
  'Fetching your stores…',
  'Plating the details…',
  'Almost ready to serve ☕',
];

const steam = keyframes`
  0%   { transform: translateY(0) scaleX(1); opacity: 0; }
  30%  { opacity: 0.7; }
  100% { transform: translateY(-18px) scaleX(1.4); opacity: 0; }
`;

const fill = keyframes`
  0%   { transform: translateY(100%); }
  100% { transform: translateY(15%); }
`;

const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
`;

/**
 * InteractiveLoader — animated coffee cup with rotating status quotes.
 *
 * Props:
 *  - messages: string[]  optional override of the rotating lines
 *  - subtle:   boolean   compact variant (smaller, less padding)
 *  - interval: number    ms between message changes (default 1600)
 */
export default function InteractiveLoader({ messages = DEFAULT_MESSAGES, subtle = false, interval = 1600 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), interval);
    return () => clearInterval(id);
  }, [messages.length, interval]);

  const cupSize = subtle ? 44 : 64;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: subtle ? 1.25 : 2,
        py: subtle ? 2 : 5,
        px: 2,
        width: '100%',
      }}
    >
      {/* Animated coffee cup */}
      <Box sx={{ position: 'relative', animation: `${bob} 2.4s ease-in-out infinite` }}>
        {/* Steam */}
        <Box sx={{ position: 'absolute', top: -16, left: 0, right: 8, display: 'flex', justifyContent: 'center', gap: 1 }}>
          {[0, 1, 2].map((n) => (
            <Box
              key={n}
              sx={{
                width: 4,
                height: 16,
                borderRadius: 999,
                bgcolor: 'primary.main',
                opacity: 0.5,
                animation: `${steam} 2.2s ease-in-out ${n * 0.4}s infinite`,
              }}
            />
          ))}
        </Box>

        {/* Cup body */}
        <Box
          sx={{
            width: cupSize,
            height: cupSize * 0.82,
            borderRadius: '10px 10px 20px 20px',
            border: '3px solid',
            borderColor: 'primary.main',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          {/* Filling coffee */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'primary.main',
              opacity: 0.85,
              animation: `${fill} 2s ease-in-out infinite alternate`,
            }}
          />
        </Box>
        {/* Handle */}
        <Box
          sx={{
            position: 'absolute',
            right: -12,
            top: '28%',
            width: 14,
            height: 20,
            borderRadius: '0 999px 999px 0',
            border: '3px solid',
            borderLeft: 'none',
            borderColor: 'primary.main',
          }}
        />
      </Box>

      {/* Rotating quote */}
      <Typography
        variant={subtle ? 'body2' : 'body1'}
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          textAlign: 'center',
          minHeight: '1.5em',
          transition: 'opacity 0.3s ease',
        }}
      >
        {messages[index]}
      </Typography>
    </Box>
  );
}
