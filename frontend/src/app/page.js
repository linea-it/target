// import Image from "next/image";
// import styles from "./page.module.css";
import React from "react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CatalogDataGrid from '@/components/CatalogDataGrid';
import Paper from '@mui/material/Paper';


export default function Home() {

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
        <Typography variant="h4" gutterBottom>
          Catalogs
        </Typography>
        {/* <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="textPrimary">Catalogs</Typography>
        </Breadcrumbs> */}
      </Box>
      <Paper sx={{
        flex: 1
      }}>
        <CatalogDataGrid />
      </Paper>
    </Box>
  );
}
