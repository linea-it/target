import React from 'react';
import Box from '@mui/material/Box';

import Aladin from "@/components/Aladin";
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';

import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ModeStandbyIcon from '@mui/icons-material/ModeStandby';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import { usePathname } from 'next/navigation';

export default function ClusterDetail(props) {
  const pathname = usePathname()
  const { record } = props

  return (
    <Stack
      direction="column"
      sx={{
        justifyContent: "center",
        alignItems: "stretch",
        flexGrow: 1
      }}
    >
      <Box>
        <Toolbar>
          <Button variant="outlined" size="large"
            href={`${pathname}/cluster_detail/${record?.id}`}
            disabled={!record}
          >
            Cluster Detail</Button>
          <IconButton size="large">
            <ModeStandbyIcon />
          </IconButton>
          <IconButton size="large">
            <ScatterPlotIcon />
          </IconButton>
        </Toolbar>
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Aladin position={record && {
          ra: record.ra,
          dec: record.dec,
          fov: 0.5
        }} />
      </Box>
    </Stack>

  );
}
