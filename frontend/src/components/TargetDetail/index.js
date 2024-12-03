import React from 'react';
import Box from '@mui/material/Box';

import Aladin from "@/components/Aladin";
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import { useRouter, usePathname } from 'next/navigation';
export default function TargetDetail(props) {
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
            href={`${pathname}/target_detail/${record?.id}`}
            disabled={!record}
          >
            Object Detail</Button>
          <Box ml={2}>
            RA: {record?.ra} Dec: {record?.dec}
          </Box>
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
