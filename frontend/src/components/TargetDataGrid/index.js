'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';

import { clusterColumns, clusters } from '../../data/clusters';
import { targetColumns, targets } from '../../data/targets';

export default function TargetDataGrid(props) {


  let columns = targetColumns;
  let rows = targets

  if (props.type === "cluster") {
    columns = clusterColumns;
    rows = clusters
  }

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
        const selectedRows = details.api.getSelectedRows()
        props.onChangeSelection(selectedRows)
      }}
      disableMultipleRowSelection
    />
  );
}
