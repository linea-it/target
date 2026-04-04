'use client';
import React from "react";
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { settings } = useAuth();
  const appTitle = settings?.application_title || settings?.application_name || 'Science Platform';

  return (
    <React.Fragment>
      <Box
        sx={{
          width: '100%',
          backgroundImage: "linear-gradient(120deg, rgba(10, 10, 10, 0.82), rgba(32, 32, 32, 0.72)), url('/banner.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          color: 'common.white',
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              minHeight: { xs: 260, md: 360 },
              display: 'flex',
              alignItems: 'center',
              py: { xs: 6, md: 10 },
            }}
          >
            <Grid container spacing={4} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: '0.18em',
                    opacity: 0.9,
                  }}
                >
                  Public Landing Page
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    mt: 1,
                    fontWeight: 700,
                    fontSize: { xs: '2.2rem', md: '3.8rem' },
                    lineHeight: 1.1,
                  }}
                >
                  {appTitle}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mt: 3,
                    maxWidth: 760,
                    fontWeight: 400,
                    opacity: 0.95,
                    lineHeight: 1.6,
                  }}
                >
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    color: 'text.primary',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '0.14em' }}>
                    Overview
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 600 }}>
                    Explore the platform
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2, lineHeight: 1.7 }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      <Container>
        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - 64px - 496px)',
            py: 4,
          }}
        >
          <Grid container spacing={2} justifyContent="center">
            <Grid size={{ xs: 12, md: 10, lg: 8 }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                A shared entry point for the platform
              </Typography>

              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.9, textAlign: 'center' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.
              </Typography>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                Built to support discovery and access
              </Typography>

              <Typography variant="body1" sx={{ lineHeight: 1.9, textAlign: 'center' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Mauris ultrices eros in cursus turpis massa tincidunt dui ut. Turpis egestas integer eget aliquet nibh praesent tristique magna.
              </Typography>
            </Grid>
          </Grid>
        </Box>
        <Footer />
      </Container>
    </React.Fragment>
  );
}
