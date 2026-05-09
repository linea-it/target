import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Link from 'next/link';
export default function LandingBodyTarget() {
    return (
        <Box
            component="main"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                // minHeight: 'calc(100vh - 64px - 496px)',
                py: 4,
            }}
        >
            <Grid container spacing={2} justifyContent="center">
                <Grid size={{ xs: 12, md: 10, lg: 8 }}>

                    <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.9, textAlign: 'center' }}>
                        Target Viewer is a flexible, catalog-driven visualization tool that enables astronomers to explore astronomical images centered on user-defined target objects. Built on Aladin Lite v3 and integrated with the IDAC-Brazil service ecosystem, it supports both public and restricted datasets with appropriate access control. Users can register custom catalogs, navigate large datasets with filtering and sorting, and tailor visualization settings to their specific analysis needs.
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                        <Button
                            component={Link}
                            href="/catalogs"
                            variant="contained"
                            size="large"
                        >
                            Explore Catalogs
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}