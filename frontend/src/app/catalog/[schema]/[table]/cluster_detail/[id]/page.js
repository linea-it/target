'use client'
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ShareIcon from '@mui/icons-material/Share';
import { getClusterById } from "@/data/clusters";
import ClusterDetailContainer from "@/containers/ClusterDetail";

export default function SingleTargetDetail({ params }) {
  // asynchronous access of `params.id`.
  const { schema, table, id } = React.use(params)

  let record = undefined
  if (id) {
    record = getClusterById(id)
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
          <Link color="inherit" href="/">
            {schema}
          </Link>
          <Link color="inherit" href={`/catalog/${schema}/${table}`}>
            {table}
          </Link>
          <Typography> {id} </Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/catalog/${schema}/${table}`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5">
            Cluster {record.id} - {record.ra}, {record.dec}
          </Typography>
          <IconButton>
            <ShareIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" size="large">Statistics</Button>
        </Stack>
      </Box>
      <ClusterDetailContainer record={record} />
    </Box>
  );
}
