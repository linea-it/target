// import Image from "next/image";
// import styles from "./page.module.css";
import React from "react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CatalogDataGrid from '@/components/CatalogDataGrid';
import Paper from '@mui/material/Paper';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link'

export default function Home() {

  const schema = 'mydb_glauber_costa'

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
          <Typography >{schema}</Typography>
        </Breadcrumbs>
        <Typography variant="h5" mt={2}>
          Catalogs
        </Typography>
      </Box>
      <Paper sx={{
        flex: 1
      }}>
        <CatalogDataGrid />
      </Paper>
    </Box>
  );
}
