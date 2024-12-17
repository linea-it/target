'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';

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

  let rows = []

  if (props.record) {
    // iterate over record keys and create rows
    rows = Object.keys(props.record).map((key, index) => {
      return {
        id: index,
        property: key,
        value: props.record[key],
      }
    })
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      hideFooterPagination
      // rowSelectionModel={rowSelectionModel}
      disableMultipleRowSelection
    />
  );
}
