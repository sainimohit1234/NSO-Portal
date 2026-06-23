import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

const primaryMain = '#6fcddc';
const primaryDark = '#3faebf';
const primaryLight = '#dff6fa';
const primaryDeep = '#123846';
const surfaceBorder = alpha(primaryDark, 0.16);
const glassSurface = alpha('#ffffff', 0.68);
const glassSurfaceStrong = alpha('#ffffff', 0.82);
const frostedShadow = '0 16px 40px rgba(17, 24, 39, 0.07)';

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: primaryLight,
      dark: primaryDark,
      contrastText: '#08313c'
    },
    secondary: {
      main: '#8b6cf0',
      light: '#efe9ff',
      dark: '#6a4dd9',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f4f8f9',
      paper: glassSurface
    },
    text: {
      primary: '#16313a',
      secondary: '#4c6b75',
      disabled: '#89a5ad'
    },
    divider: alpha('#8fbac5', 0.28),
    success: {
      main: '#1ca37c',
      light: '#def8f0',
      dark: '#14785c'
    },
    warning: {
      main: '#d99a28',
      light: '#fff4d7',
      dark: '#a56d08'
    },
    error: {
      main: '#dd5c63',
      light: '#ffe4e6',
      dark: '#ab2d39'
    },
    info: {
      main: '#4597e6',
      light: '#e1f0ff',
      dark: '#236eb6'
    },
    action: {
      hover: alpha(primaryMain, 0.10),
      selected: alpha(primaryMain, 0.16),
      focus: alpha(primaryMain, 0.18)
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
          color: '#16313a',
          backgroundColor: '#f4f8f9',
          backgroundImage: `
            radial-gradient(circle at 12% 18%, rgba(111, 205, 220, 0.18), transparent 22%),
            radial-gradient(circle at 86% 14%, rgba(139, 108, 240, 0.08), transparent 18%),
            radial-gradient(circle at 80% 82%, rgba(111, 205, 220, 0.12), transparent 18%),
            linear-gradient(180deg, #fbfdfd 0%, #f4f9fa 48%, #edf5f7 100%)
          `,
          backgroundAttachment: 'fixed',
          scrollbarColor: `${alpha(primaryDark, 0.45)} ${alpha('#ffffff', 0.65)}`,
          '&::-webkit-scrollbar': { width: 10, height: 10 },
          '&::-webkit-scrollbar-track': { background: alpha('#ffffff', 0.55) },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(primaryDark, 0.34),
            borderRadius: 999
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: alpha(primaryDark, 0.48)
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
          backdropFilter: 'blur(14px)',
          transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 10px 22px rgba(111, 205, 220, 0.18)'
          }
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${primaryMain} 0%, ${primaryDark} 100%)`,
          color: '#08313c'
        },
        outlinedPrimary: {
          borderColor: alpha(primaryDark, 0.25),
          color: primaryDeep,
          backgroundColor: alpha('#ffffff', 0.38),
          '&:hover': {
            borderColor: alpha(primaryDark, 0.45),
            backgroundColor: alpha(primaryMain, 0.12)
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${surfaceBorder}`,
          boxShadow: frostedShadow,
          background: `linear-gradient(180deg, ${glassSurfaceStrong} 0%, ${glassSurface} 100%)`,
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          backgroundImage: 'none'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: glassSurfaceStrong,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 20,
          '&:last-child': {
            paddingBottom: 20
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha('#ffffff', 0.58),
          backdropFilter: 'blur(10px)',
          minHeight: 42,
          fontSize: '0.84rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(primaryDark, 0.18)
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(primaryDark, 0.34)
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: primaryDark,
            borderWidth: 1.5,
            boxShadow: `0 0 0 4px ${alpha(primaryMain, 0.18)}`
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
          fontSize: '0.78rem',
          color: '#4c6b75',
          '&.Mui-focused': {
            color: primaryDeep
          }
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${surfaceBorder}`,
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.90)} 0%, ${alpha('#ffffff', 0.78)} 100%)`,
          boxShadow: frostedShadow
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.12)
          },
          '&.Mui-selected': {
            backgroundColor: alpha(primaryMain, 0.18)
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          color: primaryDeep,
          borderBottom: `1px solid ${surfaceBorder}`,
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.76)} 0%, ${alpha('#ffffff', 0.54)} 100%)`,
          boxShadow: '0 10px 32px rgba(111, 205, 220, 0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${surfaceBorder}`,
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.70)} 0%, ${alpha('#f5fcfe', 0.64)} 100%)`,
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: alpha(primaryMain, 0.10),
            color: primaryDeep,
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: '0.72rem',
            letterSpacing: '0.06em'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(primaryDark, 0.10)}`,
          paddingTop: 11,
          paddingBottom: 11,
          fontSize: '0.8rem'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.05)
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
            paddingLeft: 10,
            paddingRight: 10
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: alpha(primaryDark, 0.12)
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${surfaceBorder}`,
          backdropFilter: 'blur(14px)',
          '& .MuiAlert-message': {
            fontWeight: 700
          }
        },
        standardSuccess: {
          backgroundColor: alpha('#def8f0', 0.84),
          color: '#104b3a'
        },
        standardError: {
          backgroundColor: alpha('#ffe4e6', 0.88),
          color: '#7b2230'
        },
        standardWarning: {
          backgroundColor: alpha('#fff4d7', 0.90),
          color: '#7a5207'
        },
        standardInfo: {
          backgroundColor: alpha('#e7f7fb', 0.88),
          color: primaryDeep
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.12)
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
          borderRadius: 14
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 34
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
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.90)} 0%, ${alpha('#f7fdff', 0.76)} 100%)`,
          boxShadow: frostedShadow
        }
      }
    }
  }
});

export const theme = responsiveFontSizes(baseTheme, {
  factor: 2.4
});
