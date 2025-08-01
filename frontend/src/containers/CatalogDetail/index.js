'use client';
import React from "react";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
// import Button from '@mui/material/Button';
// import Toolbar from '@mui/material/Toolbar';
import TargetDataGrid from "@/components/TargetDataGrid";
import TargetDetail from "@/components/TargetDetail";
import ClusterDetail from "@/components/ClusterDetail";
import { AladinProvider } from "@/components/Aladin/AladinProvider";
import { useCatalog } from '@/contexts/CatalogContext';


export default function CatalogDetailContainer({ record }) {

  const { selectedRecord, setSelectedRecord } = useCatalog();

  const onChangeSelection = (selectedRows) => {
    console.log('Selected rows:', selectedRows);

    if (!selectedRows || selectedRows.length === 0) {
      console.log('No rows selected');
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
          minWidth: '1200px', // largura mínima para os dois painéis
          maxHeight: 'calc(100vh - 250px)',
          minHeight: 'calc(100vh - 250px)',
        }}
      >
        {/* Painel esquerdo */}
        <Box
          sx={{
            flex: 2,
            display: 'flex',
            padding: 1,
            minWidth: '400px', // largura mínima para o painel direito            
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                // minHeight: 'calc(100vh - 250px)',
                // maxHeight: 'calc(100vh - 250px)',
              }}
            >
              <TargetDataGrid
                type={record.catalog_type}
                tableId={record.id}
                schema={record.schema}
                table={record.table}
                tableColumns={record.columns}
                onChangeSelection={onChangeSelection}
              />
            </Box>
          </Paper>
        </Box>

        {/* Painel direito */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            padding: 1,
            minWidth: '300px', // largura mínima para o painel direito
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%' }}>
            <AladinProvider
              // Aladin Lite options
              // See available options at:
              // https://cds-astro.github.io/aladin-lite/global.html#AladinOptions
              aladinParams={{
                fov: 1.5,
                // target: "04 08 35.53 -37 06 27.6", // Coordenadas DES. 
                // target: "12 26 53.27 +08 56 49.0",
                projection: "AIT",
                // cooFrame: "gal",
                cooFrame: "ICRSd",
                showGotoControl: true,
                showFullscreenControl: true,
                showSimbadPointerControl: true,
                realFullscreen: true,
                showCooGridControl: true,
                showContextMenu: true,
                showSettingsControl: true,
                reticleColor: '#00ff04',
                selector: {
                  color: '#00ff04' // Cor do campo de busca, OBS não funcionou por parametro a cor está hardcoded no css .aladin-input-text.search.
                }
              }}

            >
              {record.catalog_type === 'target' && (
                <TargetDetail
                // schema={record.schema}
                // table={record.table}
                // record={selectedRecord}
                />
              )}
              {/* {record.catalog_type === 'cluster' && (
                <ClusterDetail
                  schema={record.schema}
                  table={record.table}
                  record={selectedRecord}
                />
              )} */}
            </AladinProvider>
          </Paper>
        </Box>
      </Box>
    </Box >
  );

}
