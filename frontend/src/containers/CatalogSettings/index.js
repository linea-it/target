'use client';
import React from "react";
import { useEffect } from "react";
import Box from '@mui/material/Box';
import MetadataForm from "@/containers/CatalogSettings/MetadataForm";
import CatalogSettingsColumnAssociation from "@/containers/CatalogSettings/ColumnAssociation";
import SettingsForm from "@/containers/CatalogSettings/SettingsForm";
import CatalogSettingsRemove from "@/components/CatalogSettingsRemove";

import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Stack from '@mui/material/Stack';
import Loading from "@/components/Loading";

import { getMetadataBySchemaTable } from "@/services/Metadata";

import { useQuery } from '@tanstack/react-query'
import { useEditCatalog } from "@/contexts/EditCatalogContext";

import AccessRestricted from "@/components/AccessRestricted";


export default function CatalogSettingsContainer({ schema, table }) {

  const { catalog, setCatalog } = useEditCatalog();

  const { data, status, isLoading, isSuccess } = useQuery({
    queryKey: ['metadataBySchemaTable', { schema, table }],
    queryFn: getMetadataBySchemaTable,
  })

  useEffect(() => {
    if (isSuccess) {
      const record = data?.data?.results?.[0];
      if (record) {
        setCatalog(record);
      }
    }
  }, [isSuccess, data, setCatalog]);


  if (isLoading) {
    return <Loading isLoading={isLoading} />
  }

  if (catalog === undefined) {
    return <div>Not found</div>
  }

  if (!catalog.is_owner) {
    return (
      <AccessRestricted message="You don't have permission to edit this catalog. Only the catalog owner can modify its settings." />
    );
  }


  return (

    <Box sx={(theme) => ({
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'auto', // scroll horizontal se necessário
      minWidth: theme.breakpoints.values.md
    })}
      p={4}
      pt={2}
    >
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">
            Home
          </Link>
          <Link color="inherit" href={`/catalog/${catalog.schema}/${catalog.table}`}>
            {catalog.schema}
          </Link>
          <Link color="inherit" href={`/catalog/${catalog.schema}/${catalog.table}`}>
            {catalog.table}
          </Link>
          <Typography >Settings</Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/catalog/${catalog.schema}/${catalog.table}`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5" mt={2}>
            Edit {catalog.title}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // overflow: 'auto',
      }}>
        <Box
          sx={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // centraliza horizontalmente
          }}
        >
          <Box sx={(theme) => ({ width: '100%', maxWidth: theme.breakpoints.values.md })} mb={4}>
            <MetadataForm />
          </Box>
          <Box sx={(theme) => ({ width: '100%', maxWidth: theme.breakpoints.values.md })} mb={4}>
            <SettingsForm />
          </Box>
          <Box sx={(theme) => ({ width: '100%', maxWidth: theme.breakpoints.values.md })} mb={4}>
            <CatalogSettingsColumnAssociation catalog={catalog} />
          </Box>
          <Box sx={(theme) => ({ width: '100%', maxWidth: theme.breakpoints.values.md })} mb={4}>
            <CatalogSettingsRemove catalog={catalog} />
          </Box>
        </Box >
      </Box>
    </Box>
  );

}
