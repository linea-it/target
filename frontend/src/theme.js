'use client';
import { createTheme } from '@mui/material/styles';


const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
  },
});

export default theme;
