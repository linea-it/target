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
import CatalogDiagnostic from "@/components/CatalogDiagnostic";
import { useCatalog } from '@/contexts/CatalogContext';


export default function CatalogDetailContainer({ catalog }) {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { selectedRecord, setSelectedRecord } = useCatalog();

  const [leftWidth, setLeftWidth] = React.useState(64);
  const splitRef = React.useRef(null);
  const draggingRef = React.useRef(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem('catalogDetailSplit'));
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
        window.localStorage.setItem('catalogDetailSplit', String(w));
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
        ref={splitRef}
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
            flex: isMobile ? 'none' : `0 0 ${leftWidth}%`,
            display: 'flex',
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

        {/* Divisor arrastável */}
        {!isMobile && (
          <Box
            onMouseDown={startSplitDrag}
            sx={{
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

        {/* Painel direito — mapa Aladin */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 1,
            display: 'flex',
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

      {catalog.catalog_type === 'cluster' && catalog.related_table && (
        <Box sx={{ padding: isMobile ? 0 : 1 }}>
          <CatalogDiagnostic catalog={catalog} />
        </Box>
      )}
    </Box >
  );

}
