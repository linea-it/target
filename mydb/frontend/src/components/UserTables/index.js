"use client";
import DeleteIcon from "@mui/icons-material/Delete";
import Tooltip from "@mui/material/Tooltip";
import {
  DataGrid,
  GRID_ROOT_GROUP_ID,
  GridActionsCellItem,
  useGridApiRef,
} from "@mui/x-data-grid";
import prettyBytes from "pretty-bytes";
import React from "react";
// import Link from 'next/link'
import DropTableDialog from "@/components/DropTableDialog";
import { dropTable, userTables } from "@/services/Mydb";

export default function UserTables() {
  const apiRef = useGridApiRef();

  const [deleteTableId, setDeleteTableId] = React.useState(null);

  const handleClose = React.useCallback(() => {
    setDeleteTableId(null);
  }, []);

  const handleDelete = React.useCallback(
    (id) => () => {
      setDeleteTableId(id);
    },
    [],
  );

  const deleteTable = React.useCallback(() => {
    dropTable(deleteTableId)
      .then(() => {
        console.log("Table deleted successfully");
      })
      .catch((error) => {
        console.error("Error deleting table:", error);
      })
      .finally(() => {
        // Refreshing data grid
        apiRef.current.dataSource.fetchRows(GRID_ROOT_GROUP_ID, {
          skipCache: true,
        });
        // Closing dialog
        handleClose();
      });
  }, [
    deleteTableId, // Refreshing data grid
    apiRef.current.dataSource.fetchRows, // Closing dialog
    handleClose,
  ]);

  const columns = [
    {
      field: "table_name",
      headerName: "Name",
      width: 300,
      flex: 1,
      // renderCell: params => (
      //   <Link component='a' underline="always" href={`/catalog/${params.row.schema}/${params.row.table}`} sx={{}}>
      //   { params.value }
      //   </Link>
      // )
    },
    {
      field: "rows",
      headerName: "Rows",
      type: "number",
    },
    {
      field: "columns",
      headerName: "Columns",
      type: "number",
    },
    {
      field: "table_bytes",
      headerName: "Table Size",
      type: "number",
      renderCell: (params) => <>{`${prettyBytes(params.value)}`}</>,
    },
    {
      field: "actions",
      type: "actions",
      width: 80,
      getActions: (params) => [
        <Tooltip title="Drop Table" key="delete-tooltip">
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDelete(params.id)}
          />
        </Tooltip>,
      ],
    },
  ];

  const dataSource = React.useMemo(
    () => ({
      getRows: async (params) => {
        try {
          const res = await userTables(params);
          return {
            rows: res.data.results,
            rowCount: res.data.count,
          };
        } catch (error) {
          console.error("Erro ao carregar os dados", error);
          throw error; // isso é importante para acionar o `onDataSourceError`
        }
      },
    }),
    [],
  );

  return (
    <>
      <DataGrid
        apiRef={apiRef}
        // dataSourceCache={null}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.table_name}
        pagination
        pageSizeOptions={[25, 50, 100]}
        disableColumnFilter
        disableRowSelectionOnClick
        onDataSourceError={(error) => {
          console.log("Data source error:", error);
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
            rowCount: 0,
          },
          // sorting: { sortModel: [{ field: "table_name", sort: "asc" }] },
        }}
      />
      <DropTableDialog
        open={deleteTableId !== null}
        handleClose={handleClose}
        handleOk={deleteTable}
      />
    </>
  );
}
