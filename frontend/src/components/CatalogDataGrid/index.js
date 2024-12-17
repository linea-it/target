'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Link from 'next/link'
import { catalogs } from '../../data/catalogs'
export default function CatalogDataGrid() {
  const columns = [
    // { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'name',
      headerName: 'Name',
      width: 300,
      flex: 1,
      renderCell: params => (
        <Link component='a' underline="always" href={`/catalog/${params.row.schema}/${params.row.table}`} sx={{}}>
          {params.value}
        </Link>
      )
    },
    {
      field: 'owner',
      headerName: 'Owner',
      width: 300,
    },
    {
      field: 'created_at',
      headerName: 'Created at',
      type: 'dateTime',
      width: 300,
    },
  ];

  const rows = catalogs

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 5,
          },
        },
      }}
      pageSizeOptions={[5]}
      // checkboxSelection
      disableRowSelectionOnClick
    />
  );
}
