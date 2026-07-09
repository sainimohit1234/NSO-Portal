import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

const primaryMain = '#0A314D'; // Blue Tokai Navy
const primaryDark = '#061E33';
const primaryLight = '#174A73';
const primaryDeep = '#041524';
const surfaceBorder = 'rgba(255, 255, 255, 0.08)';
const paperSurface = '#1C2438'; // Lightened slate card background
const defaultBg = '#141C2E'; // Lightened Deep Navy
const hoverShadow = '0 12px 30px rgba(0, 0, 0, 0.25)';

const baseTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: primaryMain,
      light: primaryLight,
      dark: primaryDark,
      contrastText: '#0f172a'
    },
    secondary: {
      main: '#c084fc',
      light: '#f3e8ff',
      dark: '#a855f7',
      contrastText: '#0f172a'
    },
    background: {
      default: defaultBg,
      paper: paperSurface
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      disabled: '#64748B'
    },
    divider: surfaceBorder,
    success: {
      main: '#34d399',
      light: 'rgba(52, 211, 153, 0.15)',
      dark: '#059669'
    },
    warning: {
      main: '#fbbf24',
      light: 'rgba(251, 191, 36, 0.15)',
      dark: '#d97706'
    },
    error: {
      main: '#f87171',
      light: 'rgba(248, 113, 113, 0.15)',
      dark: '#dc2626'
    },
    info: {
      main: '#60a5fa',
      light: 'rgba(96, 165, 250, 0.15)',
      dark: '#2563eb'
    },
    action: {
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
      focus: 'rgba(255, 255, 255, 0.12)'
    }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.05em', fontSize: '2.7rem', lineHeight: 1.04 },
    h2: { fontWeight: 800, letterSpacing: '-0.04em', fontSize: '2.2rem', lineHeight: 1.08 },
    h3: { fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.8rem', lineHeight: 1.12 },
    h4: { fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.55rem', lineHeight: 1.14 },
    h5: { fontWeight: 750, letterSpacing: '-0.02em', fontSize: '1.22rem', lineHeight: 1.2 },
    h6: { fontWeight: 750, letterSpacing: '-0.015em', fontSize: '0.98rem', lineHeight: 1.24 },
    subtitle1: { fontWeight: 650, fontSize: '0.95rem' },
    subtitle2: { fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.01em' },
    body1: { fontSize: '0.88rem', lineHeight: 1.55 },
    body2: { fontSize: '0.79rem', lineHeight: 1.5 },
    caption: { fontSize: '0.72rem', lineHeight: 1.45 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', fontSize: '0.84rem' }
  },
  shape: {
    borderRadius: 16
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'dark'
        },
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        },
        body: {
          minHeight: '100vh',
          color: '#F8FAFC',
          backgroundColor: defaultBg,
          backgroundAttachment: 'fixed',
          scrollbarColor: `${alpha('#0A314D', 0.25)} ${alpha('#000000', 0.15)}`,
          '&::-webkit-scrollbar': { width: 10, height: 10 },
          '&::-webkit-scrollbar-track': { background: alpha('#000000', 0.15) },
          '&::-webkit-scrollbar-thumb': {
            background: alpha('#0A314D', 0.2),
            borderRadius: 999
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: alpha('#0A314D', 0.4)
          }
        },
        '#root': {
          minHeight: '100vh'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '7px 13px',
          minHeight: 38,
          boxShadow: 'none',
          transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: hoverShadow
          }
        },
        containedPrimary: {
          background: primaryMain,
          color: '#0f172a'
        },
        outlinedPrimary: {
          borderColor: alpha(primaryMain, 0.4),
          color: primaryMain,
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: primaryMain,
            backgroundColor: alpha(primaryMain, 0.08)
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${surfaceBorder}`,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          background: paperSurface,
          backgroundImage: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 12px 38px rgba(0, 0, 0, 0.25)'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: paperSurface,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': {
            paddingBottom: 24
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1e293b',
          minHeight: 42,
          fontSize: '0.84rem',
          fontWeight: 600,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.07)',
            borderWidth: '1px'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.14)',
            borderWidth: '1px'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(primaryMain, 0.55),
            borderWidth: '1px',
            boxShadow: 'none'
          },
          '&.Mui-disabled': {
            backgroundColor: '#141C2E',
            color: 'rgba(248, 250, 252, 0.4)',
            WebkitTextFillColor: 'rgba(248, 250, 252, 0.4)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.04)',
              borderWidth: '1px'
            }
          }
        },
        notchedOutline: {
          top: 0,
          '& legend': { display: 'none' }
        },
        input: {
          paddingTop: 11,
          paddingBottom: 11
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        InputLabelProps: { shrink: true }
      }
    },
    MuiInputLabel: {
      defaultProps: {
        shrink: true
      },
      styleOverrides: {
        root: {
          position: 'relative',
          transform: 'none',
          marginBottom: 6,
          fontWeight: 700,
          fontSize: '0.8rem',
          color: '#94a3b8',
          '&.Mui-disabled': {
            color: 'rgba(148, 163, 184, 0.5)'
          },
          '&.Mui-focused': {
            color: primaryMain
          }
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${surfaceBorder}`,
          background: paperSurface,
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          color: '#F8FAFC',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          },
          '&.Mui-selected': {
            backgroundColor: alpha(primaryMain, 0.15),
            color: primaryMain,
            fontWeight: 700
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          color: '#F8FAFC',
          backgroundColor: '#1A2438',
          borderBottom: `1px solid ${surfaceBorder}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${surfaceBorder}`,
          backgroundColor: '#1A2438',
          color: '#F8FAFC'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#243347',
            color: '#94a3b8',
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            borderBottom: `2px solid ${alpha(primaryMain, 0.3)}`
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid rgba(255, 255, 255, 0.06)`,
          paddingTop: 12,
          paddingBottom: 12,
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#F8FAFC'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 150ms ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          height: 30,
          fontSize: '0.75rem',
          '& .MuiChip-label': {
            paddingLeft: 12,
            paddingRight: 12
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: surfaceBorder,
          borderWidth: '1px'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${surfaceBorder}`,
          '& .MuiAlert-message': {
            fontWeight: 600
          }
        },
        standardSuccess: {
          backgroundColor: 'rgba(52, 211, 153, 0.12)',
          color: '#34d399',
          border: '1px solid rgba(52, 211, 153, 0.25)'
        },
        standardError: {
          backgroundColor: 'rgba(248, 113, 113, 0.12)',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.25)'
        },
        standardWarning: {
          backgroundColor: 'rgba(251, 191, 36, 0.12)',
          color: '#fbbf24',
          border: '1px solid rgba(251, 191, 36, 0.25)'
        },
        standardInfo: {
          backgroundColor: 'rgba(96, 165, 250, 0.12)',
          color: '#60a5fa',
          border: '1px solid rgba(96, 165, 250, 0.25)'
        }
      }
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          zIndex: 13000
        },
        anchorOriginTopRight: {
          marginTop: '68px'
        },
        anchorOriginTopCenter: {
          marginTop: '68px'
        },
        anchorOriginTopLeft: {
          marginTop: '68px'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          color: '#94a3b8',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: primaryMain
          }
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 68
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: primaryMain,
            '& .MuiListItemIcon-root': {
              color: primaryMain
            }
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)'
          }
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: '#94a3b8'
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 2,
          marginRight: 2,
          fontSize: '0.72rem'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${surfaceBorder}`,
          background: paperSurface,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }
      }
    }
  }
});

export const theme = responsiveFontSizes(baseTheme, {
  factor: 2.4
});
