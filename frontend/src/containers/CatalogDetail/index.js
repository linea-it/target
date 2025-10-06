'use client';
import React from "react";
import { useEffect } from "react";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
// import Button from '@mui/material/Button';
// import Toolbar from '@mui/material/Toolbar';
import TargetDataGrid from "@/components/TargetDataGrid";
import TargetDetail from "@/components/TargetDetail";
// import ClusterDetail from "@/components/ClusterDetail";
import { useCatalog } from '@/contexts/CatalogContext';


export default function CatalogDetailContainer({ catalog }) {

  const { selectedRecord, setSelectedRecord } = useCatalog();

  // useEffect(() => {
  //   console.log("Selected Record: ", selectedRecord);
  // }, [selectedRecord])

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

        {/* Painel direito */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            padding: 1,
            minWidth: '500px', // largura mínima para o painel direito
          }}
        >
          <Paper elevation={3} sx={{ flex: 1, width: '100%' }}>
            {catalog.catalog_type === 'target' && (
              <TargetDetail />
            )}
            {/* {record.catalog_type === 'cluster' && (
                <ClusterDetail
                  schema={record.schema}
                  table={record.table}
                  record={selectedRecord}
                />
              )} */}
          </Paper>
        </Box>
      </Box>
    </Box >
  );

}
