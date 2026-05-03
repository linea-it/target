'use client';
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Stack from '@mui/material/Stack';
import AppNameBreadcrumbLink from '@/components/AppNameBreadcrumbLink';
import CatalogsBreadcrumbLink from '@/components/CatalogsBreadcrumbLink';
import RegisterCatalogContainer from "@/containers/RegisterCatalog";
import { RegisterCatalogProvider } from "@/contexts/RegisterCatalogContext";
export default function RegisterCatalog({ params }) {

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
          <CatalogsBreadcrumbLink />
          <Typography >New</Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/catalogs/`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5" mt={2}>
            Register New Catalog
          </Typography>
        </Stack>
      </Box>
      <RegisterCatalogProvider>
        <RegisterCatalogContainer />
      </RegisterCatalogProvider>
    </Box>
  );
}
