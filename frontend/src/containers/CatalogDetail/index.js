import React from "react";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
// import Button from '@mui/material/Button';
// import Toolbar from '@mui/material/Toolbar';
import TargetDataGrid from "@/components/TargetDataGrid";
import TargetDetail from "@/components/TargetDetail";
import ClusterDetail from "@/components/ClusterDetail";
export default function CatalogDetailContainer({ record }) {

  const [selectedRecord, setSelectedRecord] = React.useState(undefined);


  const onChangeSelection = (selectedRows) => {
    if (selectedRows.size > 0) {
      setSelectedRecord(selectedRows.values().next().value)
    }
    else {
      setSelectedRecord(undefined)
    }

  }

  return (
    <Box
      sx={{
        flex: 1,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          minWidth: '1200px', // largura mínima para os dois painéis
          maxHeight: 'calc(100vh - 250px)',
          minHeight: 'calc(100vh - 250px)',
        }}
      >
        {/* Painel esquerdo */}
        <Box
          sx={{
            flex: 2,
            display: 'flex',
            padding: 1,
            minWidth: '400px', // largura mínima para o painel direito            
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                // minHeight: 'calc(100vh - 250px)',
                // maxHeight: 'calc(100vh - 250px)',
              }}
            >
              <TargetDataGrid
                type={record.catalog_type}
                tableId={record.id}
                schema={record.schema}
                table={record.table}
                tableColumns={record.columns}
                onChangeSelection={onChangeSelection}
              />
            </Box>
          </Paper>
        </Box>

        {/* Painel direito */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            padding: 1,
            minWidth: '300px', // largura mínima para o painel direito
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%' }}>
            {record.catalog_type === 'target' && (
              <TargetDetail
                schema={record.schema}
                table={record.table}
                record={selectedRecord}
              />
            )}
            {record.catalog_type === 'cluster' && (
              <ClusterDetail
                schema={record.schema}
                table={record.table}
                record={selectedRecord}
              />
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );

}
