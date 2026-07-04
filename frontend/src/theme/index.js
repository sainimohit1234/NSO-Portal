import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

const primaryMain = '#0A314D'; // Blue Tokai Navy
const primaryDark = '#061E33';
const primaryLight = '#174A73';
const primaryDeep = '#041524';
const surfaceBorder = alpha('#000000', 0.08);
const paperSurface = '#FFFFFF';
const defaultBg = '#F4F6F8';
const lightShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
const hoverShadow = '0 8px 24px rgba(10, 49, 77, 0.1)';

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: primaryLight,
      dark: primaryDark,
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#8b6cf0',
      light: '#efe9ff',
      dark: '#6a4dd9',
      contrastText: '#ffffff'
    },
    background: {
      default: defaultBg,
      paper: paperSurface
    },
    text: {
      primary: '#1E293B',
      secondary: '#475569',
      disabled: '#94A3B8'
    },
    divider: surfaceBorder,
    success: {
      main: '#10B981',
      light: '#D1FAE5',
      dark: '#059669'
    },
    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
      dark: '#D97706'
    },
    error: {
      main: '#EF4444',
      light: '#FEE2E2',
      dark: '#DC2626'
    },
    info: {
      main: '#3B82F6',
      light: '#DBEAFE',
      dark: '#2563EB'
    },
    action: {
      hover: alpha(primaryMain, 0.04),
      selected: alpha(primaryMain, 0.08),
      focus: alpha(primaryMain, 0.12)
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
          colorScheme: 'light'
        },
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        },
        body: {
          minHeight: '100vh',
          color: '#1E293B',
          backgroundColor: defaultBg,
          backgroundAttachment: 'fixed',
          scrollbarColor: `${alpha('#0A314D', 0.25)} ${alpha('#000000', 0.05)}`,
          '&::-webkit-scrollbar': { width: 10, height: 10 },
          '&::-webkit-scrollbar-track': { background: alpha('#000000', 0.05) },
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
          color: '#FFFFFF'
        },
        outlinedPrimary: {
          borderColor: alpha(primaryMain, 0.4),
          color: primaryMain,
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: primaryMain,
            backgroundColor: alpha(primaryMain, 0.04)
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${surfaceBorder}`,
          boxShadow: lightShadow,
          background: paperSurface,
          backgroundImage: 'none'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: paperSurface,
          boxShadow: lightShadow
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
          backgroundColor: '#FFFFFF',
          minHeight: 42,
          fontSize: '0.84rem',
          fontWeight: 600,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha('#1E293B', 0.2),
            borderWidth: '1.5px'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha('#1E293B', 0.4),
            borderWidth: '1.5px'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: primaryMain,
            borderWidth: '2px',
            boxShadow: `0 0 0 4px ${alpha(primaryMain, 0.15)}`
          },
          '&.Mui-disabled': {
            backgroundColor: '#F8FAFC',
            color: alpha('#1E293B', 0.5),
            WebkitTextFillColor: alpha('#1E293B', 0.5),
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha('#1E293B', 0.1),
              borderWidth: '1.5px'
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
          color: '#475569',
          '&.Mui-disabled': {
            color: alpha('#475569', 0.5)
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
          boxShadow: '0 12px 36px rgba(0,0,0,0.08)'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          color: '#1E293B',
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.06)
          },
          '&.Mui-selected': {
            backgroundColor: alpha(primaryMain, 0.1),
            color: primaryMain,
            fontWeight: 700
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          color: '#1E293B',
          backgroundColor: '#FFFFFF',
          borderBottom: `1px solid ${surfaceBorder}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${surfaceBorder}`,
          backgroundColor: '#FFFFFF',
          color: '#1E293B'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#F8FAFC',
            color: '#475569',
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            borderBottom: `2px solid ${alpha(primaryMain, 0.2)}`
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${surfaceBorder}`,
          paddingTop: 14,
          paddingBottom: 14,
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#1E293B'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.02)
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
          backgroundColor: '#F0FDF4',
          color: '#166534',
          border: '1px solid #BBF7D0'
        },
        standardError: {
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
          border: '1px solid #FECACA'
        },
        standardWarning: {
          backgroundColor: '#FFFBEB',
          color: '#92400E',
          border: '1px solid #FDE68A'
        },
        standardInfo: {
          backgroundColor: '#EFF6FF',
          color: '#1E40AF',
          border: '1px solid #BFDBFE'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          color: '#64748B',
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.06),
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
            backgroundColor: alpha(primaryMain, 0.08),
            color: primaryMain,
            '& .MuiListItemIcon-root': {
              color: primaryMain
            }
          },
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.04)
          }
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: '#64748B'
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
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }
      }
    }
  }
});

export const theme = responsiveFontSizes(baseTheme, {
  factor: 2.4
});
