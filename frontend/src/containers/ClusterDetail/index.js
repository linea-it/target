import React from "react";
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import { useEffect } from 'react'
import CircularProgress from '@mui/material/CircularProgress';
import TargetProperties from "@/components/TargetProperties";
import TargetDataGrid from "@/components/TargetDataGrid";
import { useAladinContext } from '@/components/Aladin/AladinContext';
import AladinViewer from '@/components/Aladin/AladinViewer';
import { getClusterMembers, getMetadataById } from '@/services/Metadata';
import { useQuery } from '@tanstack/react-query'

export default function ClusterDetailContainer({ catalog, record }) {
  const { isReady, setTarget, aladinRef, setImageSurvey, addCatalog } = useAladinContext();

  const [selectedMember, setSelectedMember] = React.useState(undefined);

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


  const onChangeSelection = (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) {
      setSelectedMember(undefined);
      return;
    }
    setSelectedMember(selectedRows[0]);

    console.log(selectedMember)
  }

  return (
    <Grid container spacing={2} sx={{ height: '100%' }} >
      <Grid size={{ md: 6, display: 'flex' }}>
        <Box sx={{ height: 400, flex: 1, display: 'flex' }}>
          <TargetProperties record={record} />
        </Box>
      </Grid>
      <Grid size={{ md: 6, display: 'flex' }}>
        <AladinViewer />
      </Grid>
      <Grid size={{ md: 12 }}>
        {isLoadingMembersCatalog && (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
            <CircularProgress />
          </Box>
        )}

        {(!isLoadingMembersCatalog && membersCatalog !== undefined) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '500px',
            }}
          >
            <TargetDataGrid
              type={membersCatalog.catalog_type}
              tableId={membersCatalog.id}
              schema={membersCatalog.schema}
              table={membersCatalog.table}
              tableColumns={membersCatalog.columns}
              onChangeSelection={onChangeSelection}
            />
          </Box>
        )}
      </Grid>
    </Grid>
  );

}
