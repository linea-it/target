'use client';
import React from 'react';
import Box from '@mui/material/Box';
import { useEffect } from 'react'
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import HideSourceIcon from '@mui/icons-material/HideSource';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { usePathname } from 'next/navigation';
import { useAladinContext } from '@/components/Aladin/AladinContext';
import { useCatalog } from '@/contexts/CatalogContext';

import AladinViewer from '@/components/Aladin/AladinViewer';


export default function TargetDetail(props) {

  const pathname = usePathname()
  const { isReady, setTarget, aladinRef, setImageSurvey, toggleMarkerVisibility, takeSnapshot } = useAladinContext();
  const { selectedRecord, catalog } = useCatalog();



  useEffect(() => {

    // if (!selectedRecord || !isReady || !aladinRef.current) return;
    // // console.log('Setting target in Aladin:', selectedRecord);
    // let fov = catalog?.settings?.default_fov || 1.5; // Default FOV if not set
    // let radius = catalog?.settings?.default_marker_size || 0.001

    // setTarget(selectedRecord, fov, radius);
    centerOnTarget()
  }, [selectedRecord, catalog, aladinRef.current, isReady]);

  useEffect(() => {
    // Quando o catalogo tem uma imagem/survey default
    // Ele é definido apos a instancia do Aladin.

    // console.log("Aladin carregado e pronto para uso");
    // console.log(catalog, isReady)
    if (catalog?.settings?.default_image && isReady) {
      setImageSurvey(catalog?.settings?.default_image)
    }
  }, [catalog, isReady])

  const centerOnTarget = () => {
    if (!selectedRecord || !isReady || !aladinRef.current || !catalog) return;
    // console.log('Setting target in Aladin:', selectedRecord);

    let fov = catalog?.settings?.default_fov || 5; // Default FOV if not set
    let radius = catalog?.settings?.default_marker_size || 5;

    // Previne que um target selecionado em um catalogo diferente seja exibido
    // O target selecionado fica na sessão, caso o usuario troque de catalogo
    // esse if garante que o target só será exibido se for do catalogo atual
    if (selectedRecord.meta_catalog_id === catalog.id) {
      setTarget(selectedRecord, fov, radius);
    }
  }

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
          <Stack direction="row" spacing={2}>
            <Button
              href={`${pathname}/target_detail/${selectedRecord?.meta_id}`}
              variant="outlined"
              size="large"
              disabled={!selectedRecord}
            >
              Object Detail
            </Button>
            <Tooltip title="Center on target">
              <IconButton aria-label="center" disabled={!selectedRecord} onClick={centerOnTarget}>
                <MyLocationIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Show/Hide marker">
              <IconButton aria-label="show-hide-marker" disabled={!selectedRecord} onClick={toggleMarkerVisibility}>
                <HideSourceIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Take snapshot">
              <IconButton aria-label="take-snapshot" disabled={!selectedRecord} onClick={takeSnapshot}>
                <CameraAltIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>

      </Box>
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        <AladinViewer />

        {(!selectedRecord || selectedRecord.meta_catalog_id !== catalog.id) && (
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
