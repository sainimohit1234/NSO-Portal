import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import loginBack from '../assets/loginback.png';

const ThemeContext = createContext();

export const useThemeMode = () => useContext(ThemeContext);

const darkThemeDefaults = {
  text: '#F8FAFC',
  border: 'rgba(255, 255, 255, 0.08)',
  header: '#111827',
  background: '#0B0F19',
  paper: '#121824',
  primary: '#0A314D'
};

const lightThemeDefaults = {
  text: '#000000',
  border: 'rgba(15, 23, 42, 0.28)',
  header: '#0A314D', // Dark sky-blue header
  background: '#ffffff',
  paper: '#ffffff',
  primary: '#0A314D'
};

const systemDayThemeDefaults = {
  text: '#334155', // Slate 700
  border: 'rgba(15, 23, 42, 0.28)',
  header: '#f59e0b', // Amber 500 (Sunny daytime)
  background: '#fdfbf7', // Warm off-white
  paper: '#ffffff',
  primary: '#d97706' // Amber 600
};

const systemNightThemeDefaults = {
  text: '#e0e7ff', // Indigo 100
  border: 'rgba(255, 255, 255, 0.24)',
  header: '#172554', // Blue 950
  background: '#0f172a', // Slate 900
  paper: '#1e1b4b', // Indigo 900
  primary: '#818cf8' // Indigo 400
};

const systemRainThemeDefaults = {
  text: '#f1f5f9', // Slate 100
  border: 'rgba(255, 255, 255, 0.22)',
  header: 'rgba(15, 23, 42, 0.7)', // Slate 900 highly transparent for video
  background: 'transparent', // Transparent to see video
  paper: 'rgba(51, 65, 85, 0.65)', // Slate 700 highly transparent
  primary: '#0A314D' // Blue Tokai Navy
};

export const CustomThemeProvider = ({ children }) => {
  const [analyzedTheme, setAnalyzedTheme] = useState({
    isDark: true,
    avgColor: 'rgba(15, 23, 42, 0.7)',
    avgRgb: [15, 23, 42]
  });

  const [themeMode, setThemeModeState] = useState(() => {
    // Force default to 'light' for Light Theme only
    localStorage.setItem('themeMode', 'light');
    return 'light';
  });

  const [customColors, setCustomColorsState] = useState(() => {
    try {
      const saved = localStorage.getItem('customColors');
      return saved ? JSON.parse(saved) : { ...lightThemeDefaults };
    } catch {
      return { ...lightThemeDefaults };
    }
  });

  const setThemeMode = (mode) => {
    setThemeModeState('light');
    localStorage.setItem('themeMode', 'light');
  };

  const setCustomColors = (colors) => {
    setCustomColorsState(colors);
    localStorage.setItem('customColors', JSON.stringify(colors));
  };

  const [customBgUrl, setCustomBgUrlState] = useState(() => {
    return '';
  });

  useEffect(() => {
    if (!customBgUrl) {
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 10, 10);
        const imgData = ctx.getImageData(0, 0, 10, 10);
        const data = imgData.data;
        let r = 0, g = 0, b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        
        // Calculate perceived brightness using standard luminance formula
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isDark = brightness < 155; // 155 threshold allows clean light theme adaptation on bright images
        
        setAnalyzedTheme({
          isDark,
          avgColor: `rgb(${r}, ${g}, ${b})`,
          avgRgb: [r, g, b]
        });
      } catch (err) {
        console.error('Error analyzing image background:', err);
      }
    };
    img.onerror = () => {
      console.warn('Could not load custom background image to analyze. Falling back to default dark theme.');
    };
    img.src = customBgUrl;
  }, [customBgUrl]);

  const setCustomBgUrl = (url) => {
    setCustomBgUrlState(url);
    if (url) {
      localStorage.setItem('customBgUrl', url);
    } else {
      localStorage.removeItem('customBgUrl');
    }
  };

  const activeTheme = useMemo(() => {
    let text, border, headerBg, bgDefault, bgPaper, primaryMain;
    let primaryDark, primaryLight, textSecondary, paletteMode;
    if (themeMode === 'light') {
      text = lightThemeDefaults.text;
      border = lightThemeDefaults.border;
      headerBg = lightThemeDefaults.header;
      bgDefault = lightThemeDefaults.background;
      bgPaper = lightThemeDefaults.paper;
      primaryMain = lightThemeDefaults.primary;
      primaryDark = '#061d2d';
      primaryLight = '#124c73';
      textSecondary = '#475569';
      paletteMode = 'light';
    } else {
      // both 'dark' and 'customize' fall back to dark palette
      text = customColors.text || darkThemeDefaults.text;
      border = customColors.border || darkThemeDefaults.border;
      headerBg = customColors.header || darkThemeDefaults.header;
      bgDefault = themeMode === 'customize' ? 'transparent' : (customColors.background || darkThemeDefaults.background);
      bgPaper = customColors.paper || darkThemeDefaults.paper;
      primaryMain = customColors.primary || darkThemeDefaults.primary;
      
      if (themeMode === 'customize') {
        const bgIsDark = analyzedTheme.isDark;
        if (bgIsDark) {
          paletteMode = 'dark';
          text = '#F8FAFC';
          border = 'rgba(255, 255, 255, 0.24)';
          headerBg = 'rgba(15, 23, 42, 0.82)'; // Sleek transparent header for dark background
          bgPaper = 'rgba(15, 23, 42, 0.72)'; // Glassmorphic cards
          primaryMain = '#3b82f6';
        } else {
          paletteMode = 'light';
          text = '#0f172a';
          border = 'rgba(15, 23, 42, 0.32)';
          headerBg = 'rgba(255, 255, 255, 0.85)'; // Sleek transparent header for light background
          bgPaper = 'rgba(255, 255, 255, 0.78)'; // Glassmorphic light cards
          primaryMain = '#1e3a8a';
        }
      }
      primaryDark = alpha(primaryMain, 0.8);
      primaryLight = alpha(primaryMain, 0.4);
      textSecondary = alpha(text, 0.65);
      paletteMode = paletteMode || 'dark';
    }

    const isLight = paletteMode === 'light';

    const hoverShadow = '0 12px 30px rgba(0, 0, 0, 0.25)';

    const baseTheme = createTheme({
      palette: {
        mode: paletteMode,
        primary: {
          main: primaryMain,
          light: primaryLight,
          dark: primaryDark,
          contrastText: isLight ? '#ffffff' : '#0f172a'
        },
        secondary: {
          main: isLight ? '#8b6cf0' : '#c084fc',
          light: isLight ? '#efe9ff' : '#f3e8ff',
          dark: isLight ? '#6a4dd9' : '#a855f7',
          contrastText: isLight ? '#ffffff' : '#0f172a'
        },
        background: {
          default: bgDefault,
          paper: bgPaper
        },
        text: {
          primary: text,
          secondary: textSecondary,
          disabled: isLight ? '#94A3B8' : '#64748B'
        },
        divider: border,
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
          hover: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
          selected: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
          focus: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
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
      zIndex: {
        snackbar: 99999
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            ':root': {
              colorScheme: paletteMode
            },
            html: {
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            },
            body: {
              minHeight: '100vh',
              color: text,
              backgroundColor: bgDefault,
              backgroundAttachment: 'fixed',
              scrollbarColor: `${alpha(primaryMain, 0.25)} ${alpha(isLight ? '#000000' : '#ffffff', 0.15)}`,
              '&::-webkit-scrollbar': { width: 10, height: 10 },
              '&::-webkit-scrollbar-track': { background: alpha(isLight ? '#000000' : '#ffffff', 0.15) },
              '&::-webkit-scrollbar-thumb': {
                background: alpha(primaryMain, 0.2),
                borderRadius: 999
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: alpha(primaryMain, 0.4)
              }
            },
            '#root': {
              minHeight: '100vh'
            },
            '.MuiCard-root:has(.MuiTable-root), .MuiPaper-root:has(.MuiTable-root), .MuiTableContainer-root': {
              borderTopLeftRadius: '0px !important',
              borderTopRightRadius: '0px !important'
            },
            '.MuiTableHead-root .MuiTableCell-root': {
              borderRadius: '0px !important'
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
              color: isLight ? '#ffffff' : '#0f172a'
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
              border: `1px solid ${border}`,
              boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.03)' : '0 8px 30px rgba(0, 0, 0, 0.15)',
              background: bgPaper,
              backgroundImage: 'none',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              ...(themeMode === 'customize' && {
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${analyzedTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                boxShadow: analyzedTheme.isDark 
                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' 
                  : '0 8px 32px 0 rgba(31, 38, 135, 0.06)'
              }),
              '&:hover': {
                boxShadow: isLight ? '0 12px 24px rgba(10,49,77,0.05)' : '0 12px 38px rgba(0, 0, 0, 0.25)',
                ...(themeMode === 'customize' && {
                  transform: 'translateY(-2px)',
                  boxShadow: analyzedTheme.isDark 
                    ? '0 12px 40px 0 rgba(0, 0, 0, 0.45)' 
                    : '0 12px 40px 0 rgba(31, 38, 135, 0.12)'
                })
              }
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: bgPaper,
              boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.03)' : '0 4px 20px rgba(0, 0, 0, 0.15)',
              ...(themeMode === 'customize' && {
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${analyzedTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              })
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
              backgroundColor: isLight ? '#ffffff' : '#1e293b',
              minHeight: 42,
              fontSize: '0.84rem',
              fontWeight: 600,
              color: text,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: border,
                borderWidth: '1.5px'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(text, 0.3),
                borderWidth: '1.5px'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: primaryMain,
                borderWidth: '2px',
                boxShadow: `0 0 0 4px ${alpha(primaryMain, 0.15)}`
              },
              '&.Mui-disabled': {
                backgroundColor: isLight ? '#f8fafc' : '#0f172a',
                color: alpha(text, 0.4),
                WebkitTextFillColor: alpha(text, 0.4),
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(border, 0.5),
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
              color: textSecondary,
              '&.Mui-disabled': {
                color: alpha(textSecondary, 0.5)
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
              border: `1px solid ${border}`,
              background: bgPaper,
              boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
              ...(themeMode === 'customize' && {
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${analyzedTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              })
            }
          }
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              margin: '4px 8px',
              color: text,
              '&:hover': {
                backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)'
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
              color: isLight ? '#ffffff' : text,
              backgroundColor: headerBg,
              borderBottom: `1px solid ${border}`,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }
          }
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              borderRight: `1px solid ${border}`,
              backgroundColor: isLight ? '#ffffff' : headerBg,
              color: text
            }
          }
        },
        MuiTableHead: {
          styleOverrides: {
            root: {
              '& .MuiTableCell-root': {
                background: 'linear-gradient(90deg, #0A314D 0%, #084c7c 60%, #0c4a6e 100%) !important',
                color: '#ffffff !important',
                fontWeight: 900,
                textTransform: 'uppercase',
                fontSize: '0.78rem',
                letterSpacing: '0.06em',
                textAlign: 'center !important',
                borderBottom: '3px solid #00f2ff !important',
                textShadow: '0 1.5px 3px rgba(0, 0, 0, 0.7)',
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.15)'
              }
            }
          }
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: `1px solid ${border}`,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: text
            }
          }
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              transition: 'background-color 150ms ease',
              '&:hover': {
                backgroundColor: isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255, 255, 255, 0.02)'
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
              borderColor: border,
              borderWidth: '1px'
            }
          }
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 14,
              border: `1px solid ${border}`,
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
        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              color: textSecondary,
              '&:hover': {
                backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)',
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
                backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)',
                color: primaryMain,
                '& .MuiListItemIcon-root': {
                  color: primaryMain
                }
              },
              '&:hover': {
                backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255, 255, 255, 0.03)'
              }
            }
          }
        },
        MuiListItemIcon: {
          styleOverrides: {
            root: {
              minWidth: 36,
              color: textSecondary
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
              border: `1px solid ${border}`,
              background: bgPaper,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              ...(themeMode === 'customize' && {
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${analyzedTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              })
            }
          }
        }
      }
    });

    return responsiveFontSizes(baseTheme, {
      factor: 2.4
    });
  }, [themeMode, customColors, analyzedTheme]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, customColors, setCustomColors, customBgUrl, setCustomBgUrl, analyzedTheme }}>
      <ThemeProvider theme={activeTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
