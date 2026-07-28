import "./globals.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import { AuthProvider } from "@/contexts/AuthContext";
import AppBootstrapGate from "@/components/AppBootstrapGate";

export const metadata = {
  title: "LIneA Science Platform",
  description: "LIneA Science Platform",
};

export default function RootLayout(props) {
  const { children } = props;
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <AppBootstrapGate>
                {children}
              </AppBootstrapGate>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
