'use client';
import React from "react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link'
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ListCatalogContainer from '@/containers/ListCatalog';
import { userTables } from "@/services/Metadata";
export default function Home() {

  const handleTestApi = (e) => {
    console.log('handleTestApi')
    userTables().then((response) => {
      console.log(response.data)
    }).catch((error) => {
      console.log(error)
    })
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
        </Breadcrumbs>
        <Stack direction="row" spacing={2}>
          <Typography variant="h5" mt={2}>
            Catalogs
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" size="large" onClick={handleTestApi}>TESTE API</Button>
          <Button variant="outlined" size="large" href={`/catalog/register/`}>New Catalog</Button>
        </Stack>
      </Box>
      <ListCatalogContainer />
    </Box>
  );
}
