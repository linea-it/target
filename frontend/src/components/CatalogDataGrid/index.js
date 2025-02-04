'use client';
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Link from 'next/link'
import { catalogs } from '../../data/catalogs'
import { useQuery } from '@tanstack/react-query'
import { userTables } from '@/services/Metadata';
import { useEffect } from 'react';
export default function CatalogDataGrid() {

  const [queryOptions, setQueryOptions] = React.useState({
    paginationModel: {
      pageSize: 25,
      page: 0,
    },
    sortModel: []
  });

  const handlePaginationModelChange = React.useCallback((paginationModel) => {
    setQueryOptions({
      ...queryOptions,
      paginationModel: { ...paginationModel }
    });
  }, []);

  const handleSortModelChange = React.useCallback((sortModel) => {
    setQueryOptions({
      ...queryOptions,
      sortModel: [...sortModel]
    });
  }, []);

  const { status, isLoading, data } = useQuery({
    queryKey: ['userTables', queryOptions],
    queryFn: userTables
  })


  const rowCountRef = React.useRef(data?.data.count || 0);

  const rowCount = React.useMemo(() => {
    if (data?.data.count !== undefined) {
      rowCountRef.current = data.data.count;
    }
    return rowCountRef.current;
  }, [data?.data.count]);

  const columns = [
    {
      field: 'title',
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
      field: 'table',
      headerName: 'Tablename',
      width: 300,
      flex: 1,
      valueGetter: (value, row) => (`${row.schema}.${row.table}`)
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
    },
    {
      field: 'nrows',
      headerName: 'Rows',
    },

  ];

  return (
    <DataGrid
      loading={isLoading}
      rows={data?.data.results || []}
      rowCount={rowCount}
      columns={columns}
      paginationMode="server"
      paginationModel={queryOptions.paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      pageSizeOptions={[10, 25, 50]}
      // sortingMode="server"
      // onSortModelChange={handleSortModelChange}
      disableRowSelectionOnClick
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 25,
            page: 0,
          },
        },
      }}
    />
  );
}
