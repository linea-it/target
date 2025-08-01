'use client';
import React from 'react';
import Box from '@mui/material/Box';
import { useState, useEffect } from 'react'
import Aladin from "@/components/Aladin";
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { useAladinContext } from '@/components/Aladin/AladinContext';
import { useCatalog } from '@/contexts/CatalogContext';

import AladinViewer from '@/components/Aladin/AladinViewer';
import theme from '@/theme';

export default function TargetDetail(props) {


  const pathname = usePathname()
  const { user } = useAuth();
  const { record } = props
  const { isReady, setTarget, aladinRef } = useAladinContext();
  const { selectedRecord } = useCatalog();

  useEffect(() => {
    console.log(selectedRecord, isReady, aladinRef.current);
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
          <Button variant="outlined" size="large"
            href={`${pathname}/target_detail/${record?.meta_id}`}
            disabled={!record}
          >
            Object Detail</Button>

          <Button variant="outlined" size="large"
            onClick={() => {
              // aladinRef.current.gotoRaDec(286.924667, 70.1892269)
              aladinRef.current.gotoPosition(286.924667, 70.1892, 'gal');
            }}
          >
            Teste</Button>
        </Toolbar>
      </Box>
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        <AladinViewer />
        {/* <Aladin userGroups={user?.groups || []} /> */}
        {/* {record && (
          <Aladin userGroups={user?.groups || []} />
        )} */}

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
