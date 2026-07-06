import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const ThemeContext = createContext();

export const useThemeMode = () => useContext(ThemeContext);

const darkThemeDefaults = {
  text: '#F8FAFC',
  border: 'rgba(255, 255, 255, 0.08)',
  header: '#111827',
  background: '#0B0F19',
  paper: '#121824',
  primary: '#38bdf8'
};

const lightThemeDefaults = {
  text: '#000000',
  border: 'rgba(0, 0, 0, 0.12)',
  header: '#0A314D', // Dark sky-blue header
  background: '#ffffff',
  paper: '#ffffff',
  primary: '#0A314D'
};

const systemDayThemeDefaults = {
  text: '#334155', // Slate 700
  border: 'rgba(0, 0, 0, 0.12)',
  header: '#f59e0b', // Amber 500 (Sunny daytime)
  background: '#fdfbf7', // Warm off-white
  paper: '#ffffff',
  primary: '#d97706' // Amber 600
};

const systemNightThemeDefaults = {
  text: '#e0e7ff', // Indigo 100
  border: 'rgba(255, 255, 255, 0.1)',
  header: '#172554', // Blue 950
  background: '#0f172a', // Slate 900
  paper: '#1e1b4b', // Indigo 900
  primary: '#818cf8' // Indigo 400
};

export const CustomThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem('themeMode') || 'dark';
  });

  const [customColors, setCustomColorsState] = useState(() => {
    try {
      const saved = localStorage.getItem('customColors');
      return saved ? JSON.parse(saved) : { ...darkThemeDefaults };
    } catch {
      return { ...darkThemeDefaults };
    }
  });

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    localStorage.setItem('themeMode', mode);
  };

  const setCustomColors = (colors) => {
    setCustomColorsState(colors);
    localStorage.setItem('customColors', JSON.stringify(colors));
  };

  const [systemThemeValue, setSystemThemeValue] = useState(() => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  });

  useEffect(() => {
    if (themeMode !== 'system') return;
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      setSystemThemeValue((hour >= 6 && hour < 18) ? 'light' : 'dark');
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [themeMode]);

  const activeTheme = useMemo(() => {
    let text, border, headerBg, bgDefault, bgPaper, primaryMain;
    let primaryDark = '#0284c7';
    let primaryLight = '#7dd3fc';
    let textSecondary = '#94A3B8';
    let paletteMode = 'dark';

    if (themeMode === 'system') {
      const isDaytime = systemThemeValue === 'light';
      const defaults = isDaytime ? systemDayThemeDefaults : systemNightThemeDefaults;
      
      text = defaults.text;
      border = defaults.border;
      headerBg = defaults.header;
      bgDefault = defaults.background;
      bgPaper = defaults.paper;
      primaryMain = defaults.primary;
      
      primaryDark = isDaytime ? '#b45309' : '#4f46e5';
      primaryLight = isDaytime ? '#fcd34d' : '#c7d2fe';
      textSecondary = isDaytime ? '#64748b' : '#a5b4fc';
      paletteMode = isDaytime ? 'light' : 'dark';
    } else if (themeMode === 'light') {
      text = lightThemeDefaults.text;
      border = lightThemeDefaults.border;
      headerBg = lightThemeDefaults.header;
      bgDefault = lightThemeDefaults.background;
      bgPaper = lightThemeDefaults.paper;
      primaryMain = lightThemeDefaults.primary;
      primaryDark = '#061E33';
      primaryLight = '#174A73';
      textSecondary = '#475569';
      paletteMode = 'light';
    } else if (themeMode === 'custom') {
      text = customColors.text || darkThemeDefaults.text;
      border = customColors.border || darkThemeDefaults.border;
      headerBg = customColors.header || darkThemeDefaults.header;
      bgDefault = customColors.background || darkThemeDefaults.background;
      bgPaper = customColors.background || darkThemeDefaults.paper; 
      primaryMain = customColors.primary || darkThemeDefaults.primary;
      primaryDark = alpha(primaryMain, 0.8);
      primaryLight = alpha(primaryMain, 0.4);
      textSecondary = alpha(text, 0.65);
      paletteMode = 'dark';
    } else {
      // Default Dark Theme
      text = darkThemeDefaults.text;
      border = darkThemeDefaults.border;
      headerBg = darkThemeDefaults.header;
      bgDefault = darkThemeDefaults.background;
      bgPaper = darkThemeDefaults.paper;
      primaryMain = darkThemeDefaults.primary;
      paletteMode = 'dark';
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
              '&:hover': {
                boxShadow: isLight ? '0 12px 24px rgba(10,49,77,0.05)' : '0 12px 38px rgba(0, 0, 0, 0.25)'
              }
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: bgPaper,
              boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.03)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
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
              boxShadow: '0 12px 36px rgba(0,0,0,0.25)'
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
                backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                color: textSecondary,
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }
          }
        }
      }
    });

    return responsiveFontSizes(baseTheme, {
      factor: 2.4
    });
  }, [themeMode, customColors]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, customColors, setCustomColors }}>
      <ThemeProvider theme={activeTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
