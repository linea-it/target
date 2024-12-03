'use client'
// import Image from "next/image";
// import styles from "./page.module.css";
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
import TargetDetail from "@/components/TargetDetail";
export default function CatalogDetail({ params }) {
  // asynchronous access of `params.id`.
  const { schema, table } = React.use(params)

  console.log("SCHEMA: ", schema)
  console.log("TABLE: ", table)

  const [selectedRecord, setSelectedRecord] = React.useState(undefined);


  const onChangeSelection = (selectedRows) => {
    console.log('selectedRows: ', selectedRows)
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
      // backgroundColor: 'gray',
      display: 'flex',
      flexDirection: 'column',
    }}
      p={4}
    >
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">
            Home
          </Link>
          {/* <Link color="inherit" href="/">
            Catalogs
          </Link> */}
          <Typography color="textPrimary">{schema}</Typography>
          <Typography color="textPrimary">{table}</Typography>
        </Breadcrumbs>
        <Typography variant="h4" gutterBottom>
          My Target List
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid size={{ md: 8 }}>
          <Paper sx={{
            // backgroundColor: 'red',
            height: '100%'
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
              <TargetDataGrid onChangeSelection={onChangeSelection} />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ md: 4 }}>
          <Paper sx={{
            height: '100%',
            display: 'flex'
          }}
          >
            <TargetDetail const schema={schema} table={table} record={selectedRecord} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
