import React from "react";
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import Aladin from "@/components/Aladin";
import TargetProperties from "@/components/TargetProperties";
import ClusterMembersDataGrid from "@/components/ClusterMembersDataGrid";
// import { getMemebersByClusterId } from "@/data/clustersMembers";

export default function ClusterDetailContainer({ record }) {

  let members = []
  if (record.id) {
    // members = getMemebersByClusterId(record.id)
  }

  const [selectedRecord, setSelectedRecord] = React.useState(undefined);

  const onChangeSelection = (selectedRows) => {
    if (selectedRows.size > 0) {
      setSelectedRecord(selectedRows.values().next().value)
    }
    else {
      setSelectedRecord(undefined)
    }
  }

  console.log(selectedRecord)

  return (
    <Grid container spacing={2} >
      <Grid size={{ md: 4 }}>
        <Paper sx={{
          height: '100%',
          minHeight: 400,
          display: 'flex'
        }}>
          <TargetProperties record={record} />
        </Paper>
      </Grid>
      <Grid size={{ md: 8 }}>
        <Paper sx={{
          height: '100%',
          minHeight: 400,
          display: 'flex'
        }}
        >
          <Aladin position={record && {
            ra: record.ra,
            dec: record.dec,
            fov: 0.80
          }}
            catalog={members}
          // radius={{ ra: record.ra, dec: record.dec, radius: record.radius_amin, unit: 'arcmin' }}
          />
        </Paper>
      </Grid>
      <Grid size={{ md: 12 }}>
        <Paper sx={{
          height: '100%',
          minHeight: 500,
          display: 'flex'
        }}
        >
          <ClusterMembersDataGrid cluster_id={record.id} onChangeSelection={onChangeSelection} />
        </Paper>
      </Grid>
    </Grid>
  );
}
