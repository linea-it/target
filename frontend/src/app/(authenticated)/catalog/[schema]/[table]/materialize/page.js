'use client'
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Stack from '@mui/material/Stack';
import { useQuery } from '@tanstack/react-query';

import Loading from "@/components/Loading";
import AppNameBreadcrumbLink from '@/components/AppNameBreadcrumbLink';
import CatalogsBreadcrumbLink from '@/components/CatalogsBreadcrumbLink';
import MaterializeCatalogContainer from "@/containers/MaterializeCatalog";
import { MaterializeCatalogProvider } from "@/contexts/MaterializeCatalogContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { getMetadataBySchemaTable } from "@/services/Metadata";

export default function MaterializeCatalogPage({ params }) {
  const { schema, table } = React.use(params);
  const { catalog, setCatalog } = useCatalog();

  const { isLoading, data: tableRecord } = useQuery({
    queryKey: ['metadataBySchemaTable', { schema, table }],
    queryFn: getMetadataBySchemaTable,
    select: (data) => data?.data.results[0],
  });

  React.useEffect(() => {
    if (tableRecord) {
      setCatalog(tableRecord);
    }
  }, [tableRecord, setCatalog]);

  if (isLoading || catalog?.id === undefined) {
    return <Loading isLoading={true} />;
  }

  if (!catalog.is_public) {
    return <div>Not found</div>;
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: "stretch" }} p={4} pt={2}>
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <AppNameBreadcrumbLink />
          <CatalogsBreadcrumbLink />
          <Link color="inherit" href={`/catalog/${schema}/${table}`}>{catalog.schema}</Link>
          <Link color="inherit" href={`/catalog/${schema}/${table}`}>{catalog.table}</Link>
          <Typography>Save filtered subset</Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{ alignItems: "center" }}>
          <IconButton href={`/catalog/${schema}/${table}`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5">{catalog.title}</Typography>
        </Stack>
      </Box>

      <MaterializeCatalogProvider>
        <MaterializeCatalogContainer />
      </MaterializeCatalogProvider>
    </Box>
  );
}
