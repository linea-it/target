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
        flexGrow: 1,
        flex: 1,
        height: '100%'
      }}
    >
      <Box>
        <Toolbar>
          <Button variant="outlined" size="large"
            href={`${pathname}/target_detail/${record?.meta_id}`}
            disabled={!record}
          >
            Object Detail</Button>
        </Toolbar>
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        {record && (
          <Aladin position={record && {
            ra: record.meta_ra,
            dec: record.meta_dec,
            fov: 0.01
          }} />
        )}
      </Box>
    </Stack>

  );
}
