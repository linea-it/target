import React from "react";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TargetDataGrid from "@/components/TargetDataGrid";
import Toolbar from '@mui/material/Toolbar';
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
    <Grid container spacing={2} sx={{ height: '100%' }}>
      <Grid size={{ md: 8 }}>
        <Paper sx={{
          // backgroundColor: 'red',
          height: '100%',
        }}>
          {/* <Toolbar>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" size="large" disabled>Statistics</Button>
          </Toolbar> */}
          <Box maxHeight={500}>
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
      <Grid size={{ md: 4 }}>
        <Paper sx={{
          height: '100%',
          display: 'flex'
        }}
        >
          {record.catalog_type === 'target' && (<TargetDetail schema={record.schema} table={record.table} record={selectedRecord} />)}
          {record.catalog_type === 'cluster' && (<ClusterDetail schema={record.schema} table={record.table} record={selectedRecord} />)}
        </Paper>
      </Grid>
    </Grid>
  );
}
