'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';

export default function TargetDataGrid(props) {

  // const [rowSelectionModel, setRowSelectionModel] = React.useState([]);

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'ra',
      headerName: 'RA',
      width: 300,
    },
    {
      field: 'dec',
      headerName: 'Dec',
      width: 300,
    },
    {
      field: 'mag_auto_g',
      headerName: 'g',
      width: 300,
    },
  ];
  const rows = [
    { id: 1, ra: 34.5905748, dec: -9.29177774, mag_auto_g: 18 },
    { id: 2, ra: 342.136437, dec: -51.3264799, mag_auto_g: 22 },
    { id: 3, ra: 47.4473644, dec: -20.5809728, mag_auto_g: 22 },
  ]

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
      onRowSelectionModelChange={(newRowSelectionModel, details) => {
        // console.log(newRowSelectionModel)
        // setRowSelectionModel(newRowSelectionModel);
        const selectedRows = details.api.getSelectedRows()
        console.log(selectedRows)
        props.onChangeSelection(selectedRows)
      }}
      // rowSelectionModel={rowSelectionModel}
      disableMultipleRowSelection
    />
  );
}
