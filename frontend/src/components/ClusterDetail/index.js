import React from 'react';
import { useEffect } from 'react'
import Box from '@mui/material/Box';

import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';

import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
// import ModeStandbyIcon from '@mui/icons-material/ModeStandby';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CircularProgress from '@mui/material/CircularProgress';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import Tooltip from '@mui/material/Tooltip';
import { usePathname } from 'next/navigation';
import { useAladinContext } from '@/components/Aladin/AladinContext';
import { useCatalog } from '@/contexts/CatalogContext';
import { useQuery } from '@tanstack/react-query'

import { getClusterMembers } from '@/services/Metadata';


import AladinViewer from '@/components/Aladin/AladinViewer';

export default function ClusterDetail(props) {
  const pathname = usePathname()
  const { isReady, setTarget, aladinRef, setImageSurvey, toggleMarkerVisibility, takeSnapshot, addCatalog, toggleCatalogVisibility } = useAladinContext();
  const { selectedRecord, catalog } = useCatalog();

  const { isLoading, data: members } = useQuery({
    queryKey: ['membersByClusterId', catalog?.related_table, selectedRecord?.meta_id],
    queryFn: async () => {
      return getClusterMembers({
        tableId: catalog.related_table,
        property_cross_id: catalog.related_property_id,
        value: selectedRecord.meta_id
      });
    },
    select: (data) => data?.data.results,
    enabled: !!selectedRecord && !!catalog?.related_table,
    staleTime: 5 * 10000
  })

  useEffect(() => {
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

  useEffect(() => {
    if (members) {
      addCatalog('Members', members)
    }
  }, [members]);


  const centerOnTarget = () => {
    if (!selectedRecord || !isReady || !aladinRef.current || !catalog) return;
    // console.log('Setting target in Aladin:', selectedRecord);

    let fov = catalog?.settings?.default_fov || 5; // Default FOV if not set

    // 1 - Verifica se tem campo radius arcmin na tabela. se tiver usa ele
    // 2 - Se não tiver, usa o default_marker_size do catalogo
    // 3 - Se não tiver nenhum dos dois, usa um valor fixo de 5 arcmin

    let radius = 5; // valor fixo padrão
    if (selectedRecord?.meta_radius_arcmin) {
      radius = selectedRecord.meta_radius_arcmin * 60; // convertendo para arcsegundos
    } else if (catalog?.settings?.default_marker_size) {
      radius = catalog.settings.default_marker_size;
    }

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
              href={`${pathname}/cluster_detail/${selectedRecord?.meta_id}`}
              target="_blank"
              variant="outlined"
              size="large"
              disabled={!selectedRecord}
            >
              Cluster Detail
            </Button>
            <Tooltip title="Center on target">
              <IconButton aria-label="center" disabled={!selectedRecord} onClick={centerOnTarget}>
                <MyLocationIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Show/Hide Cluster Radius">
              <IconButton aria-label="show-hide-marker" disabled={!selectedRecord} onClick={toggleMarkerVisibility}>
                <PanoramaFishEyeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Show/Hide members">
              <IconButton
                aria-label="show-hide-members"
                disabled={!selectedRecord}
                onClick={toggleCatalogVisibility.bind(this, 'Members')}
              >
                {isLoading ? <CircularProgress size={24} /> : <ScatterPlotIcon />}
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
          //  Overlay para prevenir que o Aladin fique visível
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
