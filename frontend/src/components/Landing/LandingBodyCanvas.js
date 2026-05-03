import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Footer from '@/components/Footer';
import Link from 'next/link';

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

                    <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.9, textAlign: 'center' }}>
                        CAnVAS is a scientific platform designed to analyze galaxy cluster catalogs detected in optical surveys using the WaZP cluster finder. Users can upload their catalogs directly to the service, enabling a comprehensive evaluation of cluster candidates. The platform provides statistical analyses of the submitted catalogs, along with interactive visualizations of detected clusters. When available, CAnVAS also integrates detailed information on cluster members, survey depth maps, and the footprint of the originating survey, offering a robust and intuitive environment for validation and exploration.
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
            <Footer />
        </Box>
    );
}