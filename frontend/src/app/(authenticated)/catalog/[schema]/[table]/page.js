'use client'
import React from "react";
import { useEffect } from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import Stack from '@mui/material/Stack';
// import ShareIcon from '@mui/icons-material/Share';

import CatalogDetailContainer from "@/containers/CatalogDetail";
import Loading from "@/components/Loading";
import AppNameBreadcrumbLink from '@/components/AppNameBreadcrumbLink';
import CatalogsBreadcrumbLink from '@/components/CatalogsBreadcrumbLink';

import { useAuth } from "@/contexts/AuthContext";
import { getMetadataBySchemaTable } from "@/services/Metadata";

import { AladinProvider } from "@/components/Aladin/AladinProvider";
import { useCatalog } from '@/contexts/CatalogContext';

import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(LocalizedFormat)
import { useQuery } from '@tanstack/react-query'

export default function CatalogDetail({ params }) {
  const { schema, table } = React.use(params)
  const [isClient, setIsClient] = React.useState(false)
  const { user, settings } = useAuth();
  const { setCatalog, catalog, lastFilterModel } = useCatalog();
  const hasActiveFilter = !!lastFilterModel?.items?.length;

  const { status, isLoading, data, isSuccess } = useQuery({
    queryKey: ['metadataBySchemaTable', { schema, table }],
    queryFn: getMetadataBySchemaTable
  })

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isSuccess) {
      const record = data?.data?.results?.[0];
      if (record) {
        setCatalog(record);
      }
    }
  }, [isSuccess, data, setCatalog]);

  if (!isClient) {
    return <Loading isLoading={true} />
  }

  if (isLoading) {
    return <Loading isLoading={isLoading} />
  }

  if (catalog?.id === undefined) {
    return <div>Not found</div>
  }

  return (
    <Box sx={{
      width: '100%',
      // height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: "stretch",
    }}
      p={4}
      pt={2}
    >
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <AppNameBreadcrumbLink />
          <CatalogsBreadcrumbLink />
          <Typography >{catalog.schema}</Typography>
          <Typography >{catalog.table}</Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/catalogs/`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5" mt={2}>
            {catalog.title}
          </Typography>
          {catalog.can_manage && (
            <IconButton href={`/catalog/${catalog.schema}/${catalog.table}/settings`}>
              <SettingsIcon />
            </IconButton>
          )}
          {catalog.is_public && (
            <Tooltip title={hasActiveFilter ? '' : 'Apply a filter on the grid first'}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterAltIcon />}
                  href={hasActiveFilter ? `/catalog/${catalog.schema}/${catalog.table}/materialize` : undefined}
                  disabled={!hasActiveFilter}
                  sx={{ ml: 1 }}
                >
                  Save filtered subset
                </Button>
              </span>
            </Tooltip>
          )}
          {/* <IconButton disabled>
            <ShareIcon />
          </IconButton> */}
        </Stack>
        <Typography ml={6} variant="caption">{dayjs(catalog.created_at).format('L')} by {catalog.owner}</Typography>
      </Box>

      <AladinProvider
        // Aladin Lite options
        // See available options at:
        // https://cds-astro.github.io/aladin-lite/global.html#AladinOptions
        aladinParams={{
          fov: 1.5,
          // target: "04 08 35.53 -37 06 27.6", // Coordenadas DES.
          // target: "12 26 53.27 +08 56 49.0",
          projection: "AIT",
          // cooFrame: "gal",
          cooFrame: "ICRSd",
          showGotoControl: true,
          showFullscreenControl: true,
          showSimbadPointerControl: true,
          realFullscreen: true,
          showCooGridControl: true,
          showContextMenu: true,
          showSettingsControl: true,
          showReticle: false,
          reticleColor: '#00ff04',
          selector: {
            color: '#00ff04' // Cor do campo de busca, OBS não funcionou por parametro a cor está hardcoded no css .aladin-input-text.search.
          }
        }}
        userGroups={user?.groups || []}
        default_survey={catalog?.settings?.default_image}
        baseHost={settings?.base_host}
      >

        <CatalogDetailContainer catalog={catalog} />

      </AladinProvider>
    </Box>
  );
}

// calc(100vh - 64px);
