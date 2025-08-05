import React from "react";
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import { useEffect } from 'react'
import TargetProperties from "@/components/TargetProperties";

import { useAladinContext } from '@/components/Aladin/AladinContext';
import AladinViewer from '@/components/Aladin/AladinViewer';

export default function TargetDetailContainer({ record }) {

  const { isReady, setTarget, aladinRef } = useAladinContext();

  useEffect(() => {
    // console.log(record, isReady, aladinRef?.current);
    if (!record || !isReady || !aladinRef.current) return;
    // console.log('Setting target in Aladin:', record);
    setTarget(record);
  }, [record, isReady, aladinRef.current]);


  return (
    <Grid container spacing={2} sx={{ height: '100%' }} >
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
          <AladinViewer />
        </Paper>
      </Grid>
    </Grid>
  );
}
