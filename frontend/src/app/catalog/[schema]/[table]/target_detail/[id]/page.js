'use client'
// import Image from "next/image";
// import styles from "./page.module.css";
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
export default function SingleTargetDetail({ params }) {
  // asynchronous access of `params.id`.
  const { schema, table, id } = React.use(params)

  console.log("SCHEMA: ", schema)
  console.log("TABLE: ", table)
  console.log("Target ID: ", id)


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
    >
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">
            Home
          </Link>
          <Link color="inherit" href="/">
            {schema}
          </Link>
          <Link color="inherit" href={`catalog/${schema}/${table}`}>
            {table}
          </Link>
          <Typography color="textPrimary"> {id} </Typography>
        </Breadcrumbs>
        <Typography variant="h4" gutterBottom>
          My Target Detail {id}
        </Typography>
      </Box>
    </Box>
  );
}
