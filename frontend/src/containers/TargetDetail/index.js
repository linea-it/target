import React from "react";
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import Aladin from "@/components/Aladin";
import TargetProperties from "@/components/TargetProperties";
export default function TargetDetailContainer({ record }) {
  return (
    <Grid container spacing={2} sx={{ height: '100%' }}>
      <Grid size={{ md: 6 }}>
        <Paper sx={{
          height: '100%',
          display: 'flex'
        }}>
          <TargetProperties record={record} />
        </Paper>
      </Grid>
      <Grid size={{ md: 6 }}>
        <Paper sx={{
          height: '100%',
          display: 'flex'
        }}
        >
          <Aladin position={record && {
            ra: record.ra,
            dec: record.dec,
            fov: 0.01
          }} />
        </Paper>
      </Grid>
    </Grid>
  );
}
