'use client';
import React from "react";
import Box from "@mui/material/Box";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { CatalogProvider } from "@/contexts/CatalogContext";
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

export default function MainContainer({ children }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
        open={true}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    )
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <Header />
      <QueryClientProvider client={queryClient}>
        <CatalogProvider>
          {user && (
            <Box
              component='main'
              sx={{
                paddingLeft: 0,
                paddingRight: 0,
                display: 'flex',
                height: 'calc(100vh - 64px)',
              }}>
              {children}
            </Box>
          )}
        </CatalogProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}
