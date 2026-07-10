'use client';
import React from "react";
import { useEffect } from "react";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import TargetDataGrid from "@/components/TargetDataGrid";
import TargetDetail from "@/components/TargetDetail";
import ClusterDetail from "@/components/ClusterDetail";
import { useCatalog } from '@/contexts/CatalogContext';


export default function CatalogDetailContainer({ catalog }) {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { selectedRecord, setSelectedRecord } = useCatalog();

  const onChangeSelection = (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) {
      setSelectedRecord(undefined);
      return;
    }

    // Atualiza o registro selecionado no contexto do catálogo

    // Usando o primeiro registro selecionado
    // Caso multiselect esteja habilitado, aqui deve ser alterado, 
    // mas é necessário atenção com o comportamento do Aladin.
    setSelectedRecord(selectedRows[0]);

  }

  return (
    <Box
      sx={{
        flex: 1,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          width: '100%',
          minWidth: isMobile ? '100%' : '1200px',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 250px)',
          minHeight: isMobile ? 'auto' : 'calc(100vh - 250px)',
          gap: isMobile ? 2 : 0,
        }}
      >
        {/* Painel esquerdo — tabela */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 2,
            display: 'flex',
            padding: isMobile ? 0 : 1,
            minWidth: isMobile ? '100%' : '400px',
            height: isMobile ? 420 : 'auto',
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
              }}
            >
              <TargetDataGrid
                type={catalog.catalog_type}
                tableId={catalog.id}
                schema={catalog.schema}
                table={catalog.table}
                tableColumns={catalog.columns}
                onChangeSelection={onChangeSelection}
              />
            </Box>
          </Paper>
        </Box>

        {/* Painel direito — mapa Aladin */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 1,
            display: 'flex',
            padding: isMobile ? 0 : 1,
            minWidth: isMobile ? '100%' : '500px',
            height: isMobile ? 420 : 'auto',
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%', minHeight: isMobile ? 420 : 0 }}>
            {catalog.catalog_type === 'target' && (
              <TargetDetail />
            )}
            {catalog.catalog_type === 'cluster' && (
              <ClusterDetail />
            )}
          </Paper>
        </Box>
      </Box>
    </Box >
  );

}
