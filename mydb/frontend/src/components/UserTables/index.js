'use client';
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
// import Link from 'next/link'
// import { userTables } from '@/services/Metadata';

export default function UserTables() {

  const columns = [
    {
      field: 'title',
      headerName: 'Name',
      width: 300,
      flex: 1,
      // renderCell: params => (
      //   <Link component='a' underline="always" href={`/catalog/${params.row.schema}/${params.row.table}`} sx={{}}>
      //   { params.value }
      //   </Link>
      // )
    },
    {
      field: 'table',
      headerName: 'Tablename',
      width: 300,
      flex: 1,
      valueGetter: (value, row) => (`${row.schema}.${row.table}`),
      sortable: false
    },
    {
      field: 'created_at',
      headerName: 'Created at',
      type: 'dateTime',
      width: 300,
      valueGetter: (value, row) => {
        return new Date(value)
      }
    },
    {
      field: 'owner',
      headerName: 'Owner',
      width: 300,
      sortable: false
    },
    {
      field: 'nrows',
      headerName: 'Rows',
      type: 'number',
    },

  ];


  const dataSource = React.useMemo(
    () => ({
      getRows: async (params) => {
        // try {
        //   const res = await userTables(params);
        //   return {
        //     rows: res.data.results,
        //     rowCount: res.data.count,
        //   };
        // } catch (error) {
        //   console.error('Erro ao carregar os dados', error);
        //   throw error; // isso é importante para acionar o `onDataSourceError`
        // }
      },
    }),
    [],
  );

  return (
    <DataGrid
      // Disable datasouce Cache for tests
      // dataSourceCache={null}
      columns={columns}
      dataSource={dataSource}
      pagination
      pageSizeOptions={[10, 50, 100]}
      disableRowSelectionOnClick
      onDataSourceError={(error) => {
        console.log('Data source error:', error);
      }}
      initialState={{
        pagination: { paginationModel: { pageSize: 10, page: 0 }, rowCount: 0 },
        sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }], },
      }}
    />
  );
}
