'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { getTableData } from '@/services/Metadata';

export default function TargetDataGrid(props) {

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

  const dataSource = React.useMemo(
    () => ({
      getRows: async (params) => {
        params.tableId = props.tableId

        try {
          const res = await getTableData(params);
          return {
            rows: res.data.results,
            rowCount: res.data.count,
          };
        } catch (error) {
          console.error('Erro ao carregar os dados', error);
          throw error; // isso é importante para acionar o `onDataSourceError`
        }
      },
    }),
    [props.tableId],
  );



  return (
    <DataGrid
      showToolbar

      columns={columns}
      dataSource={dataSource}
      getRowId={(row) => row.meta_id}
      // Disable datasouce Cache for tests
      // dataSourceCache={null}      
      onDataSourceError={(error) => {
        console.log('Data source error:', error);
      }}
      // Pagination
      pagination
      pageSizeOptions={[10, 50, 100]}
      // Filtering
      ignoreDiacritics
      // Selection
      onRowSelectionModelChange={(newRowSelectionModel, details) => {
        // console.log('Selection Model Change:', newRowSelectionModel);
        // console.log('details:', details);
        // console.log('IDS Set:', newRowSelectionModel.ids);
        // console.log('IDS values:', newRowSelectionModel.ids.values());

        const selectedRows = []

        newRowSelectionModel.ids.values().forEach((value) => {
          selectedRows.push(details.api.getRow(value));
        });

        props.onChangeSelection(selectedRows)

        // getSelectedRows() DEPRECATED
        // const selectedRows = details.api.getSelectedRows()
        // props.onChangeSelection(selectedRows);
      }}
      disableMultipleRowSelection
      keepNonExistentRowsSelected

      // checkboxSelection

      initialState={{
        pagination: { paginationModel: { pageSize: 50, page: 0 }, rowCount: 0 },
      }}

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
