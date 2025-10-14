'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { getMembersTableData } from '@/services/Metadata';

export default function MembersDataGrid(props) {

  // ids das rows atualmente carregadas/visíveis (atualizado no dataSource.getRows)
  const [visibleRowIds, setVisibleRowIds] = React.useState(new Set());

  // estado controlado da seleção
  const [rowSelectionModel, setRowSelectionModel] = React.useState({ type: 'include', ids: new Set(), })

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
        filterable: props.property_cross_id !== column.name, // desabilita filtro na coluna de cluster id
      }
    })
  }

  const columns = makeColumns();

  const dataSource = React.useMemo(
    () => ({
      getRows: async (params) => {
        params.tableId = props.tableId
        params.property_cross_id = props.property_cross_id
        params.clusterId = props.clusterId
        console.log("MembersDataGrid getRows", params)

        // params[props.property_cross_id] = props.clusterId
        try {
          const res = await getMembersTableData(params);
          const rows = res.data.results || [];

          // atualiza o conjunto de ids visíveis
          setVisibleRowIds(new Set(rows.map((r) => r.meta_id)));

          return {
            rows,
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

  // quando usuário seleciona uma linha
  const handleSelectionChange = (newSelectionModel, details) => {

    setRowSelectionModel(newSelectionModel)

    const selectedRows = []
    if (newSelectionModel.ids) {
      for (const value of newSelectionModel.ids) {
        selectedRows.push(details.api.getRow(value))
      }
    }
    props.onChangeSelection(selectedRows)
  }

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
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={handleSelectionChange}
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
