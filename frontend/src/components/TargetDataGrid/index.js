'use client';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';

import { clusterColumns, clusters } from '../../data/clusters';
import { targetColumns, targets } from '../../data/targets';

export default function TargetDataGrid(props) {


  // let columns = targetColumns;
  // let rows = targets

  // if (props.type === "cluster") {
  //   columns = clusterColumns;
  //   rows = clusters
  // }

  const makeColumns = () => {
    const mainUcds = ['meta.id;meta.main;meta.ref', 'pos.eq.ra;meta.main', 'pos.eq.dec;meta.main']
    return props.tableColumns.map((column) => {

      const width = mainUcds.includes(column.ucd) ? 150 : undefined;
      // const flex = column.ucd in mainUcds ? undefined : 1;
      // console.log(column)
      return {
        field: column.name,
        headerName: column.title || column.name,
        width: width,
        // flex: flex
      }
    })
  }

  const columns = makeColumns();

  // console.log(columns)
  return (
    <DataGrid
      rows={[]}
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
