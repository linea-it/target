import React from "react";
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { useEffect } from 'react'
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TargetProperties from "@/components/TargetProperties";
import MembersDataGrid from "@/components/MembersDataGrid";
import { useAladinContext } from '@/components/Aladin/AladinContext';
import AladinViewer from '@/components/Aladin/AladinViewer';
import MapsDialog from '@/components/Aladin/MapsDialog';
import { getClusterMembers, getMetadataById, getNotebookHtml, downloadClusterNotebook } from '@/services/Metadata';
import { useQuery } from '@tanstack/react-query'

import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LayersIcon from '@mui/icons-material/Layers';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';

function TabPanel({ children, value, index }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ flex: 1, overflow: 'auto' }}>
      {value === index && children}
    </Box>
  );
}


export default function ClusterDetailContainer({ catalog, record }) {
  const { isReady, setTarget, aladinRef, setImageSurvey, addCatalog, gotoRaDec, toggleMarkerVisibility, takeSnapshot, toggleCatalogVisibility, getMapsForSurvey } = useAladinContext();

  const [selectedMember, setSelectedMember] = React.useState(undefined);
  const [mapsOpen, setMapsOpen] = React.useState(false);

  const defaultImage = catalog?.settings?.default_image;
  const hasMaps = !!getMapsForSurvey(defaultImage);
  const [activeTab, setActiveTab] = React.useState(0);
  const [iframeHeight, setIframeHeight] = React.useState(0);
  const [downloadingNotebook, setDownloadingNotebook] = React.useState(false);
  const iframeRef = React.useRef(null);

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [leftWidth, setLeftWidth] = React.useState(64);
  const splitRef = React.useRef(null);
  const draggingRef = React.useRef(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem('clusterDetailSplit'));
    if (saved >= 20 && saved <= 80) setLeftWidth(saved);
  }, []);

  const startSplitDrag = () => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setLeftWidth((w) => {
        window.localStorage.setItem('clusterDetailSplit', String(w));
        return w;
      });
      // Força o Aladin a recalcular o tamanho do canvas.
      window.dispatchEvent(new Event('resize'));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    // Quando o catalogo tem uma imagem/survey default
    // Ele é definido apos a instancia do Aladin.

    if (catalog?.settings?.default_image && isReady) {
      setImageSurvey(catalog?.settings?.default_image)
    }
  }, [catalog, isReady])

  useEffect(() => {
    centerOnTarget()
  }, [record, isReady, aladinRef.current]);


  const centerOnTarget = () => {
    if (!record || !isReady || !aladinRef.current || !catalog) return;
    // console.log('Setting target in Aladin:', selectedRecord);

    let fov = catalog?.settings?.default_fov || 5; // Default FOV if not set

    // 1 - Verifica se tem campo radius arcmin na tabela. se tiver usa ele
    // 2 - Se não tiver, usa o default_marker_size do catalogo
    // 3 - Se não tiver nenhum dos dois, usa um valor fixo de 5 arcmin

    let radius = 5; // valor fixo padrão
    if (record?.meta_radius_arcmin) {
      radius = record.meta_radius_arcmin * 60; // convertendo para arcsegundos
    } else if (catalog?.settings?.default_marker_size) {
      radius = catalog.settings.default_marker_size;
    }

    // Previne que um target selecionado em um catalogo diferente seja exibido
    // O target selecionado fica na sessão, caso o usuario troque de catalogo
    // esse if garante que o target só será exibido se for do catalogo atual
    if (record.meta_catalog_id === catalog.id) {
      setTarget(record, fov, radius);
    }
  }

  const { isLoading: isLoadingMembersCatalog, data: membersCatalog } = useQuery({
    queryKey: ['metadataById', catalog.related_table],
    queryFn: async () => {
      return getMetadataById({
        tableId: catalog.related_table,
      });
    },
    select: (data) => data?.data,
    staleTime: 5 * 10000,
    enabled: catalog?.related_table !== undefined,
  })

  const { isLoading: isLoadingMembers, data: members } = useQuery({
    queryKey: ['membersByClusterId', catalog?.related_table, record?.meta_id],
    queryFn: async () => {
      return getClusterMembers({
        tableId: catalog.related_table,
        property_cross_id: catalog.related_property_id,
        value: record.meta_id
      });
    },
    select: (data) => data?.data.results,
    enabled: !!record && !!catalog?.related_table,
    staleTime: 5 * 10000
  })

  useEffect(() => {
    if (members) {
      addCatalog('Members', members)
    }
  }, [members]);

  const { isLoading: isLoadingNotebook, data: notebookHtml } = useQuery({
    queryKey: ['notebookHtml', catalog.id, record?.meta_id],
    queryFn: () => getNotebookHtml({
      tableId: catalog.id,
      propertyId: catalog.property_id,
      recordId: record.meta_id,
    }),
    select: (data) => data?.data?.html,
    enabled: !!record?.meta_id && !!catalog?.property_id,
    staleTime: 5 * 60000,
  });

  useEffect(() => {
    if (!notebookHtml) setIframeHeight(0);
  }, [notebookHtml]);

  const measureIframeHeight = () => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      setIframeHeight(doc.documentElement.scrollHeight);
    }
  };

  const handleIframeLoad = () => {
    measureIframeHeight();
    setTimeout(measureIframeHeight, 500);
  };

  const handleDownloadNotebook = async () => {
    if (!record?.meta_id || !catalog?.property_id) return;
    setDownloadingNotebook(true);
    try {
      await downloadClusterNotebook({
        tableId: catalog.id,
        propertyId: catalog.property_id,
        recordId: record.meta_id,
      });
    } finally {
      setDownloadingNotebook(false);
    }
  };


  const onChangeSelection = (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) {
      setSelectedMember(undefined);
      return;
    }
    setSelectedMember(selectedRows[0]);
  }

  useEffect(() => {
    if (selectedMember) {
      gotoRaDec(selectedMember.meta_ra, selectedMember.meta_dec);
    }
  }, [selectedMember]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }} mb={4}>
      <Box
        ref={splitRef}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
        }}
      >
        <Box sx={{ width: isMdUp ? `${leftWidth}%` : '100%', height: { xs: 420, md: 600 }, order: { xs: 2, md: 1 }, minWidth: 0 }}>
          <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Members" />
              <Tab label="Properties" />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              {isLoadingMembersCatalog && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                  <CircularProgress />
                </Box>
              )}
              {(!isLoadingMembersCatalog && membersCatalog !== undefined) && (
                <Box sx={{ width: '100%', height: '100%' }}>
                  <MembersDataGrid
                    type={membersCatalog.catalog_type}
                    tableId={membersCatalog.id}
                    schema={membersCatalog.schema}
                    table={membersCatalog.table}
                    tableColumns={membersCatalog.columns}
                    property_cross_id={catalog.related_property_id}
                    clusterId={record?.meta_id}
                    onChangeSelection={onChangeSelection}
                  />
                </Box>
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <TargetProperties record={record} />
            </TabPanel>
          </Paper>
        </Box>

        {isMdUp && (
          <Box
            onMouseDown={startSplitDrag}
            sx={{
              order: 2,
              flexShrink: 0,
              width: '14px',
              cursor: 'col-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover .split-handle-bar': { backgroundColor: 'primary.main' },
            }}
          >
            <Box
              className="split-handle-bar"
              sx={{ width: '4px', height: '48px', borderRadius: 2, backgroundColor: 'divider', transition: 'background-color 0.15s' }}
            />
          </Box>
        )}

        <Box sx={{ flex: { md: 1 }, width: { xs: '100%', md: 'auto' }, height: { xs: 420, md: 600 }, order: { xs: 1, md: 3 }, minWidth: 0 }}>
          <Paper
            elevation={3}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              position: 'relative',
              height: '100%',
            }}
          >
            <Box sx={{ flex: 1, position: 'relative' }}>
              <AladinViewer />
            </Box>

            <Toolbar
              orientation="vertical"
              sx={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: 64,
                borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: (theme) => theme.palette.background.paper,
                paddingY: 1,
                gap: 1,
              }}
            >
              <Tooltip title="Center on target">
                <IconButton aria-label="center" disabled={!record} onClick={centerOnTarget}>
                  <MyLocationIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Show/Hide Cluster Radius">
                <IconButton aria-label="show-hide-marker" disabled={!record} onClick={toggleMarkerVisibility}>
                  <PanoramaFishEyeIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Show/Hide members">
                <IconButton
                  aria-label="show-hide-members"
                  disabled={!record}
                  onClick={toggleCatalogVisibility.bind(this, 'Members')}
                >
                  {isLoadingMembers ? <CircularProgress size={24} /> : <ScatterPlotIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Take snapshot">
                <IconButton aria-label="take-snapshot" disabled={!record} onClick={takeSnapshot}>
                  <CameraAltIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={hasMaps ? 'Maps' : 'No maps available for this survey'}>
                <span>
                  <IconButton
                    aria-label="maps"
                    disabled={!record || !hasMaps}
                    onClick={() => setMapsOpen(true)}
                  >
                    <LayersIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Toolbar>
          </Paper>
        </Box>

      </Box>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadNotebook}
            disabled={downloadingNotebook || !record?.meta_id}
          >
            {downloadingNotebook ? 'Preparing…' : 'Download notebook'}
          </Button>
        </Stack>

        {(isLoadingNotebook || (notebookHtml && !iframeHeight)) && (
          <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 1 }} />
        )}
        {notebookHtml && (
          <Box sx={{ width: '100%', height: iframeHeight || 0, overflow: 'hidden' }}>
            <iframe
              ref={iframeRef}
              srcDoc={notebookHtml.replace(/<head(\s[^>]*)?>/i, '$&<base target="_blank">')}
              onLoad={handleIframeLoad}
              style={{ width: '100%', height: iframeHeight || 1, border: 'none', display: 'block' }}
              title="Cluster Notebook"
            />
          </Box>
        )}
      </Paper>
      <MapsDialog open={mapsOpen} onClose={() => setMapsOpen(false)} surveyId={defaultImage} />

      {/* Spacer */}
      <Box mt={6} />
    </Box>
  );

}
