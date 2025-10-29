"use client";
import { DataGrid } from "@mui/x-data-grid";
import prettyBytes from "pretty-bytes";
import React from "react";
// import Link from 'next/link'
import { userTables } from "@/services/Mydb";

export default function UserTables() {
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
    <DataGrid
      // Disable datasouce Cache for tests
      // dataSourceCache={null}
      columns={columns}
      dataSource={dataSource}
      getRowId={(row) => row.table_name}
      pagination
      pageSizeOptions={[10, 50, 100]}
      disableColumnFilter
      disableRowSelectionOnClick
      onDataSourceError={(error) => {
        console.log("Data source error:", error);
      }}
      initialState={{
        pagination: { paginationModel: { pageSize: 10, page: 0 }, rowCount: 0 },
        // sorting: { sortModel: [{ field: "table_name", sort: "asc" }] },
      }}
    />
  );
}
