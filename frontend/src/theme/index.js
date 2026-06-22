import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007a8c',       // Darker peacock teal for readable contrast in light mode
      light: 'rgba(0, 122, 140, 0.08)', // Subtle highlight background
      dark: '#005d6b',       // Darker peacock teal
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c48316',       // Richer gold from Suchali logo croissant for readability
      light: 'rgba(196, 131, 22, 0.08)',
      dark: '#96630c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',    // Clean pure white background
      paper: '#ffffff',      // Pure white for cards/paper containers
    },
    text: {
      primary: '#1e293b',    // Slate 800 (very dark grey-blue)
      secondary: '#475569',  // Slate 600 (muted grey-blue)
      disabled: '#94a3b8',   // Slate 400
    },
    divider: '#e2e8f0',      // Slate 200 (light divider line)
    success: {
      main: '#2a6964',       // Got Tea sage green adjusted for light contrast
      light: 'rgba(42, 105, 100, 0.08)',
      dark: '#1e4e4a',
    },
    warning: {
      main: '#d97706',       // Amber 600
      light: '#fef3c7',
      dark: '#b45309',
    },
    error: {
      main: '#dc2626',       // Red 600
      light: '#fee2e2',
      dark: '#b91c1c',
    },
    info: {
      main: '#007a8c',
      light: 'rgba(0, 122, 140, 0.08)',
      dark: '#005d6b',
    },
    action: {
      hover: 'rgba(0, 122, 140, 0.04)',
      selected: 'rgba(0, 122, 140, 0.08)',
    }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff',
          color: '#1e293b',
          margin: 0,
          scrollbarColor: '#cbd5e1 #f8fafc',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-track': { background: '#f8fafc' },
          '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: 4 },
          '&::-webkit-scrollbar-thumb:hover': { background: '#94a3b8' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #007a8c 0%, #009cb2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #005d6b 0%, #007a8c 100%)',
          },
        },
        outlinedPrimary: {
          borderColor: '#cbd5e1',
          color: '#007a8c',
          '&:hover': {
            borderColor: '#007a8c',
            backgroundColor: 'rgba(0, 122, 140, 0.04)',
          },
        },
        outlinedSecondary: {
          borderColor: '#cbd5e1',
          color: '#c48316',
          '&:hover': {
            borderColor: '#c48316',
            backgroundColor: 'rgba(196, 131, 22, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        InputLabelProps: { shrink: true },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94a3b8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#007a8c',
            borderWidth: '1.5px',
          },
        },
        notchedOutline: {
          top: 0,
          '& legend': { display: 'none' },
        },
      },
    },
    MuiInputLabel: {
      defaultProps: {
        shrink: true,
      },
      styleOverrides: {
        root: {
          position: 'relative',
          transform: 'none',
          marginBottom: '6px',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#475569',
          whiteSpace: 'normal',
          overflow: 'visible',
          textOverflow: 'initial',
          maxWidth: 'none',
          '&.Mui-focused': {
            color: '#007a8c',
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          whiteSpace: 'normal',
          overflow: 'visible',
          textOverflow: 'initial',
          maxWidth: 'none',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#475569',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#1e293b',
          '&:hover': {
            backgroundColor: 'rgba(0, 122, 140, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 122, 140, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(0, 122, 140, 0.12)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#f8fafc', // Light slate sidebar background to structure the page layout
          borderRight: '1px solid #e2e8f0',
          backgroundImage: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#f8fafc',
            color: '#475569',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #e2e8f0',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.875rem',
          color: '#1e293b',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 122, 140, 0.02)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& .MuiAlert-message': {
            fontWeight: '700 !important',
            color: '#000000 !important',
          },
        },
        standardSuccess: {
          backgroundColor: '#e6f4ea !important',
          color: '#000000 !important',
          border: '1px solid #a3cfbb',
          '& .MuiAlert-icon': {
            color: '#137333 !important',
          },
        },
        standardError: {
          backgroundColor: '#fce8e6 !important',
          color: '#000000 !important',
          border: '1px solid #f1aeb5',
          '& .MuiAlert-icon': {
            color: '#c5221f !important',
          },
        },
        standardWarning: {
          backgroundColor: '#fef7e0 !important',
          color: '#000000 !important',
          border: '1px solid #ffe69c',
          '& .MuiAlert-icon': {
            color: '#b06000 !important',
          },
        },
        standardInfo: {
          backgroundColor: '#e8f0fe !important',
          color: '#000000 !important',
          border: '1px solid #9ec5fe',
          '& .MuiAlert-icon': {
            color: '#1a73e8 !important',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 122, 140, 0.04)',
          },
        },
      },
    },
  },
});
