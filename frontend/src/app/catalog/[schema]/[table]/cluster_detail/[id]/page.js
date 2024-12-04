'use client'
// import Image from "next/image";
// import styles from "./page.module.css";
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ShareIcon from '@mui/icons-material/Share';
import Aladin from "@/components/Aladin";
import TargetProperties from "@/components/TargetProperties";
import ClusterMembersDataGrid from "@/components/ClusterMembersDataGrid";

import { getClusterById } from "@/components/TargetDataGrid/clusters";

export default function SingleTargetDetail({ params }) {
  // asynchronous access of `params.id`.
  const { schema, table, id } = React.use(params)

  console.log("SCHEMA: ", schema)
  console.log("TABLE: ", table)
  console.log("Target ID: ", id)

  let record = undefined

  if (id) {
    record = getClusterById(id)
  }

  // const record = { id: 1, ra: 34.5905748, dec: -9.29177774, mag_auto_g: 18 }

  console.log(params)

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      // backgroundColor: 'gray',
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
            {record.id} - {record.ra}, {record.dec}
          </Typography>
          <IconButton>
            <ShareIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" size="large">Statistics</Button>
        </Stack>
      </Box>
      <Grid container spacing={2} >
        <Grid size={{ md: 4 }}>
          <Paper sx={{
            height: '100%',
            minHeight: 400,
            display: 'flex'
          }}>
            <TargetProperties record={record} />
          </Paper>
        </Grid>
        <Grid size={{ md: 8 }}>
          <Paper sx={{
            height: '100%',
            minHeight: 400,
            display: 'flex'
          }}
          >
            <Aladin position={record && {
              ra: record.ra,
              dec: record.dec,
              fov: 0.80
            }} />
          </Paper>
        </Grid>
        <Grid size={{ md: 12 }}>
          <Paper sx={{
            height: '100%',
            minHeight: 500,
            display: 'flex'
          }}
          >
            <ClusterMembersDataGrid cluster_id={id} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
