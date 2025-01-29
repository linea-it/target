'use client';
import React from "react";
import Box from "@mui/material/Box";
import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { CatalogProvider } from "@/contexts/CatalogContext";
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()
export default function MainContainer({ children }) {

  return (
    <AuthProvider>
      < CssBaseline />
      <Header />
      <QueryClientProvider client={queryClient}>
        <CatalogProvider>
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
        </CatalogProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
