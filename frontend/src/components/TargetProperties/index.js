'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

export default function TargetProperties(props) {

  const columns = [
    {
      field: 'property',
      headerName: 'Property',
      flex: 1,
    },
    {
      field: 'value',
      headerName: 'Value',
      flex: 1,
    },
  ];


  const rows = props.record
    ? Object.keys(props.record)
      // Filtra as propriedades que **não** começam com "meta_"
      .filter((key) => !key.startsWith('meta_'))
      // Cria as linhas da grid
      .map((key, index) => ({
        id: index,
        property: key,
        value: props.record[key],
      }))
    : [];

  return (
    <Box sx={{ flex: 1 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        hideFooter
        disableMultipleRowSelection
        density="compact"
      />
    </Box>
  );
}
