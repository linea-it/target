'use client'
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Stack from '@mui/material/Stack';
// import ShareIcon from '@mui/icons-material/Share';

import CatalogDetailContainer from "@/containers/CatalogDetail";
import Loading from "@/components/Loading";

import { useAuth } from "@/contexts/AuthContext";
import { getMetadataBySchemaTable } from "@/services/Metadata";

import { AladinProvider } from "@/components/Aladin/AladinProvider";

import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(LocalizedFormat)
import { useQuery } from '@tanstack/react-query'

export default function CatalogDetail({ params }) {
  const { schema, table } = React.use(params)
  const [isClient, setIsClient] = React.useState(false)
  const { user } = useAuth();

  const { status, isLoading, data } = useQuery({
    queryKey: ['metadataBySchemaTable', { schema, table }],
    queryFn: getMetadataBySchemaTable
  })

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <Loading isLoading={true} />
  }

  if (isLoading) {
    return <Loading isLoading={isLoading} />
  }

  const record = data.data.results[0]

  if (record === undefined) {
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
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography >{record.schema}</Typography>
          <Typography >{record.table}</Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5" mt={2}>
            {record.title}
          </Typography>
          {record.is_owner && (
            <IconButton href={`/catalog/${record.schema}/${record.table}/settings`}>
              <SettingsIcon />
            </IconButton>
          )}
          {/* <IconButton disabled>
            <ShareIcon />
          </IconButton> */}
        </Stack>
        <Typography ml={6} variant="caption">{dayjs(record.created_at).format('L')} by {record.owner}</Typography>
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
          reticleColor: '#00ff04',
          selector: {
            color: '#00ff04' // Cor do campo de busca, OBS não funcionou por parametro a cor está hardcoded no css .aladin-input-text.search.
          }
        }}
        userGroups={user?.groups || []}
      >

        <CatalogDetailContainer record={record} />

      </AladinProvider>
    </Box>
  );
}

// calc(100vh - 64px);
