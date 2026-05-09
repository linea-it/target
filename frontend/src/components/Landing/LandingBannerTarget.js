import React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export default function LandingBannerTarget({ appTitle }) {
    return (
        <Box
            sx={{
                width: '100%',
                backgroundImage: "linear-gradient(120deg, rgba(10, 10, 10, 0.1), rgba(32, 32, 32, 0.2)), url('/banner_target.jpg')",
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
                        justifyContent: 'center',
                        py: { xs: 6, md: 10 },
                    }}
                >
                    <Grid container spacing={4} alignItems="center" justifyContent="center">
                        <Grid size={{ xs: 12, md: 12 }}>
                            <Typography
                                variant="h2"
                                sx={{
                                    mt: 1,
                                    fontWeight: 700,
                                    fontSize: { xs: '2.2rem', md: '3.8rem' },
                                    lineHeight: 1.1,
                                    textAlign: 'center',
                                }}
                            >
                                Target Viewer
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    mt: 3,
                                    fontWeight: 400,
                                    opacity: 0.95,
                                    lineHeight: 1.6,
                                    textAlign: 'center',
                                }}
                            >
                                Target Analysis and Visualization As a Service
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </Box>
    );
}