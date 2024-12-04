'use client'
import React from "react";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TargetDataGrid from "@/components/TargetDataGrid";
import Toolbar from '@mui/material/Toolbar';
import FilterListIcon from '@mui/icons-material/FilterList';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Stack from '@mui/material/Stack';
import ShareIcon from '@mui/icons-material/Share';
import TargetDetail from "@/components/TargetDetail";
import ClusterDetail from "@/components/ClusterDetail";
import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(LocalizedFormat)
export default function CatalogDetail({ params }) {
  // asynchronous access of `params.id`.
  const { schema, table } = React.use(params)

  const catalogs = [
    { id: 1, schema: 'mydb_glauber_costa', table: 'estrelas_brilhantes', name: 'My Target List', owner: 'glauber.costa', created_at: dayjs(), type: 'single' },
    { id: 2, schema: 'mydb_glauber_costa', table: 'my_cluster_galaxies', name: 'My Cluster Galaxies', owner: 'glauber.costa', created_at: dayjs(), type: 'cluster' },
  ]

  let catalog = catalogs[0]
  if (table === 'my_cluster_galaxies') {
    catalog = catalogs[1]
  }


  const [selectedRecord, setSelectedRecord] = React.useState(undefined);


  const onChangeSelection = (selectedRows) => {
    if (selectedRows.size > 0) {
      setSelectedRecord(selectedRows.values().next().value)
    }
    else {
      setSelectedRecord(undefined)
    }

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
          <Typography >{schema}</Typography>
          <Typography >{table}</Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5" mt={2}>
            {catalog.name}
          </Typography>
          <IconButton>
            <SettingsIcon />
          </IconButton>
          <IconButton>
            <ShareIcon />
          </IconButton>
        </Stack>
        <Typography ml={6} variant="caption">{catalog.created_at.format('L')} by {catalog.owner}</Typography>
      </Box>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid size={{ md: 8 }}>
          <Paper sx={{
            // backgroundColor: 'red',
            height: '100%',
          }}>
            <Toolbar>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <SearchIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
                <TextField id="input-with-sx" label="Search" variant="standard" sx={{ width: '50ch', mr: 2 }} />
              </Box>
              <Button variant="outlined" size="large">Statistics</Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button endIcon={<FilterListIcon />}>
                Filters
              </Button>
            </Toolbar>
            <Box>
              <TargetDataGrid type={catalog.type} onChangeSelection={onChangeSelection} />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ md: 4 }}>
          <Paper sx={{
            height: '100%',
            display: 'flex'
          }}
          >
            {catalog.type === 'cluster' && (<ClusterDetail schema={schema} table={table} record={selectedRecord} />)}
            {catalog.type === 'single' && (<TargetDetail schema={schema} table={table} record={selectedRecord} />)}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
