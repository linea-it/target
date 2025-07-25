'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';

import { useQuery } from '@tanstack/react-query'
import { getTableData } from '@/services/Metadata';

export default function TargetDataGrid(props) {

  const [queryOptions, setQueryOptions] = React.useState({
    tableId: props.tableId,
    schema: props.schema,
    table: props.table,
    paginationModel: {
      pageSize: 25,
      page: 0,
    },
    sortModel: [],
    columnVisibilityModel: {},
    filterModel: { items: [] }
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

  const handleColumnVisibilityModelChange = React.useCallback((columnVisibilityModel) => {
    setQueryOptions({
      ...queryOptions,
      columnVisibilityModel: { ...columnVisibilityModel }
    });
  }, []);

  const handleFilterModelChange = React.useCallback((filterModel) => {
    setQueryOptions({
      ...queryOptions,
      filterModel: { ...filterModel }
    });
  }, []);


  const makeColumns = () => {
    const mainUcds = ['meta.id;meta.main;meta.ref', 'pos.eq.ra;meta.main', 'pos.eq.dec;meta.main']
    return props.tableColumns.map((column) => {

      const width = mainUcds.includes(column.ucd) ? 150 : undefined;
      return {
        field: column.name,
        headerName: column.title || column.name,
        width: width,
        type: column.muicolumntype || 'string',
        // flex: flex
      }
    })
  }

  const columns = makeColumns();


  const { status, isLoading, data } = useQuery({
    queryKey: ['tableData', queryOptions],
    queryFn: getTableData
  })


  const rowCountRef = React.useRef(data?.data.count || 0);

  const rowCount = React.useMemo(() => {
    if (data?.data.count !== undefined) {
      rowCountRef.current = data.data.count;
    }
    return rowCountRef.current;
  }, [data?.data.count]);

  return (
    <DataGrid
      loading={isLoading}
      columns={columns}
      rows={data?.data.results || []}
      rowCount={rowCount}
      getRowId={(row) => row.meta_id}
      paginationMode="server"
      paginationModel={queryOptions.paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      pageSizeOptions={[25, 50, 100]}
      sortingMode="server"
      onSortModelChange={handleSortModelChange}
      onRowSelectionModelChange={(newRowSelectionModel, details) => {
        const selectedRows = details.api.getSelectedRows()
        props.onChangeSelection(selectedRows)
      }}
      columnVisibilityModel={queryOptions.columnVisibilityModel}
      onColumnVisibilityModelChange={handleColumnVisibilityModelChange}
      filterModel={queryOptions.filterModel}
      onFilterModelChange={handleFilterModelChange}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 25,
            page: 0,
          },
        },
      }}
      disableMultipleRowSelection
      showToolbar
      // disableColumnFilter
      slotProps={{
        toolbar: {
          showQuickFilter: false,
          printOptions: { disableToolbarButton: true },
          csvOptions: { disableToolbarButton: true },
          excelOptions: { disableToolbarButton: true },
        }
      }}
    />
  );
}
