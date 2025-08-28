import React from "react";
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import { useEffect } from 'react'
import TargetProperties from "@/components/TargetProperties";

import { useAladinContext } from '@/components/Aladin/AladinContext';
import AladinViewer from '@/components/Aladin/AladinViewer';



export default function TargetDetailContainer({ catalog, record }) {

  const { isReady, setTarget, aladinRef, setImageSurvey } = useAladinContext();

  useEffect(() => {
    // Quando o catalogo tem uma imagem/survey default
    // Ele é definido apos a instancia do Aladin.

    // console.log("Aladin carregado e pronto para uso");
    // console.log(catalog, isReady)
    if (catalog?.settings?.default_image && isReady) {
      setImageSurvey(catalog?.settings?.default_image)
    }
  }, [catalog, isReady])


  useEffect(() => {
    centerOnTarget()
  }, [record, isReady, aladinRef.current]);


  const centerOnTarget = () => {
    if (!record || !isReady || !aladinRef.current) return;
    // console.log('Setting target in Aladin:', record);
    let fov = catalog?.settings?.default_fov || 5; // Default FOV if not set
    let radius = catalog?.settings?.default_marker_size || 5

    setTarget(record, fov, radius);
  }

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
