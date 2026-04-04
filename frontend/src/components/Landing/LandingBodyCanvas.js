import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

export default function LandingBodyCanvas() {
    return (
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
                        Canvas experience
                    </Typography>

                    <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.9, textAlign: 'center' }}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.
                    </Typography>

                    <Divider sx={{ my: 4 }} />

                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                        Explore catalogs and clusters
                    </Typography>

                    <Typography variant="body1" sx={{ lineHeight: 1.9, textAlign: 'center' }}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Mauris ultrices eros in cursus turpis massa tincidunt dui ut. Turpis egestas integer eget aliquet nibh praesent tristique magna.
                    </Typography>
                </Grid>
            </Grid>
        </Box>
    );
}