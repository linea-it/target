'use client';
import React from "react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import AppNameBreadcrumbLink from '@/components/AppNameBreadcrumbLink';
import ListCatalogContainer from '@/containers/ListCatalog';
export default function Catalogs() {

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}
      p={4}
      pt={2}
    >
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <AppNameBreadcrumbLink />
          <Typography color="textPrimary">
            Catalogs
          </Typography>
        </Breadcrumbs>
        <Stack direction="row" spacing={2}>
          <Typography variant="h5" mt={2}>
            Catalogs
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" size="large" href={`/catalog/register/`}>Add Catalog</Button>
        </Stack>
      </Box>
      <ListCatalogContainer />
    </Box>
  );
}
