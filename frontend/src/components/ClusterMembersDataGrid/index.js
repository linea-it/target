'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { clustersMembersColumns, getMemebersByClusterId } from '../../data/clustersMembers';
export default function ClusterMembersDataGrid(props) {

  const columns = clustersMembersColumns;
  let rows = []

  const getRowId = (row) => {
    return row.seqnr;
  }

  if (props.cluster_id) {
    rows = getMemebersByClusterId(props.cluster_id)
  }


  return (
    <DataGrid
      getRowId={getRowId}
      rows={rows}
      columns={columns}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 10,
          },
        },
      }}
      pageSizeOptions={[5, 10]}
      onRowSelectionModelChange={(newRowSelectionModel, details) => {
        const selectedRows = details.api.getSelectedRows()
        console.log(selectedRows)
        props.onChangeSelection(selectedRows)
      }}
      disableMultipleRowSelection
    />
  );
}
