"use client";

import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useMemo, useState } from 'react';

// Declaration merging for custom MD3 colors if needed
declare module '@mui/material/styles' {
  interface Palette {
    surfaceContainer?: string;
  }
  interface PaletteOptions {
    surfaceContainer?: string;
  }
}

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  const theme = useMemo(
    () =>
      createTheme({
        cssVariables: true,
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#a8c7fa' : '#0b57d0',
          },
          secondary: {
            main: mode === 'dark' ? '#c2c7cf' : '#444746',
          },
          background: {
            default: mode === 'dark' ? '#0f1416' : '#f8fafd',
            paper: mode === 'dark' ? '#181f22' : '#eef1f6',
          },
          surfaceContainer: mode === 'dark' ? '#1e262a' : '#e1e5eb',
        },
        shape: {
          borderRadius: 24, // MD3 large rounded corners
        },
        typography: {
          fontFamily: 'inherit',
          button: {
            textTransform: 'none', // MD3 avoids full caps
            fontWeight: 500,
            fontSize: '1rem',
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 100, // Pill shape for buttons
                padding: '12px 24px',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 28, // Pill shape for inputs
                },
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
