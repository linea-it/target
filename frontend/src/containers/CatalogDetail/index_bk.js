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
    <Box sx={{
      flex: 1,
      // height: '100%', // Garante que o Box ocupe toda altura disponível
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'calc(100vh - 250px)',
    }} >
      <Grid container spacing={2} sx={{
        justifyContent: "center",
        alignItems: "stretch",
        // height: '100%', // Grid ocupa toda altura do Box
        flex: 1 // Permite que o Grid cresça
      }}>
        <Grid size={{ md: 8 }} sx={{
          display: 'flex',
          // height: '100%',
        }}>
          <Paper elevation={3} sx={{
            flex: 1,
            // height: '100%',
          }}>
            {/* <Toolbar>
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="outlined" size="large" disabled>Statistics</Button>
            </Toolbar> */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              minHeight: 'calc(100vh - 250px)',
              maxHeight: 'calc(100vh - 250px)'
            }}>
              <TargetDataGrid
                type={record.catalog_type}
                tableId={record.id}
                schema={record.schema}
                table={record.table}
                tableColumns={record.columns}
                onChangeSelection={onChangeSelection} />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ md: 4 }} sx={{
          display: 'flex',
          // height: '100%',
        }}>
          <Paper elevation={3} sx={{
            flex: 1,
            // height: '100%',
          }}>
            {record.catalog_type === 'target' && (<TargetDetail schema={record.schema} table={record.table} record={selectedRecord} />)}
            {record.catalog_type === 'cluster' && (<ClusterDetail schema={record.schema} table={record.table} record={selectedRecord} />)}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )

}
