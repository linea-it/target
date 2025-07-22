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

import { getMetadataBySchemaTable } from "@/services/Metadata";

import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(LocalizedFormat)
import { useQuery } from '@tanstack/react-query'

export default function CatalogDetail({ params }) {
  const { schema, table } = React.use(params)

  const { status, isLoading, data } = useQuery({
    queryKey: ['metadataBySchemaTable', { schema, table }],
    queryFn: getMetadataBySchemaTable
  })

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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
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
          <IconButton disabled>
            <SettingsIcon />
          </IconButton>
          {/* <IconButton disabled>
            <ShareIcon />
          </IconButton> */}
        </Stack>
        <Typography ml={6} variant="caption">{dayjs(record.created_at).format('L')} by {record.owner}</Typography>
      </Box>
      <CatalogDetailContainer record={record} />
    </Box>
  );
}
