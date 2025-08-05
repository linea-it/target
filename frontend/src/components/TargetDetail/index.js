'use client';
import React from 'react';
import Box from '@mui/material/Box';
import { useEffect } from 'react'
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import { usePathname } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { useAladinContext } from '@/components/Aladin/AladinContext';
import { useCatalog } from '@/contexts/CatalogContext';

import AladinViewer from '@/components/Aladin/AladinViewer';
import theme from '@/theme';

export default function TargetDetail(props) {

  const pathname = usePathname()
  const { isReady, setTarget, aladinRef } = useAladinContext();
  const { selectedRecord } = useCatalog();

  useEffect(() => {

    if (!selectedRecord || !isReady || !aladinRef.current) return;
    // console.log('Setting target in Aladin:', selectedRecord);
    setTarget(selectedRecord);
    // aladinRef.current.gotoPosition(parseFloat(selectedRecord.meta_ra), parseFloat(selectedRecord.meta_dec), 'gal');
  }, [selectedRecord, aladinRef.current, isReady]);


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
          <Button
            href={`${pathname}/target_detail/${selectedRecord?.meta_id}`}
            variant="outlined"
            size="large"
            disabled={!selectedRecord}
          >
            Object Detail</Button>
        </Toolbar>
      </Box>
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        <AladinViewer />

        {!selectedRecord && (
          //  Overlay para previnir que o Aladin fique visivel
          // Sem nenhum registro selecionado 
          <Box
            sx={(theme) => ({
              position: 'absolute',
              inset: 0, // equivale a top:0, right:0, bottom:0, left:0
              backgroundColor: theme.palette.background.paper,
              zIndex: 10, // garantir que fique acima do AladinViewer
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'auto', // bloqueia interações no viewer abaixo
            })}
          >
          </Box>
        )}
      </Box>
    </Stack>

  );
}
