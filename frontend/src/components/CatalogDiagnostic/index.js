'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import DownloadIcon from '@mui/icons-material/Download';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCatalogDiagnostic,
  downloadCatalogDiagnostic,
  regenerateCatalogDiagnostic,
} from '@/services/Metadata';

const POLLING_STATUS = ['pending', 'running', '', null, undefined];

export default function CatalogDiagnostic({ catalog }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();

  const {
    isLoading,
    data: diagnostic,
    error: queryError,
  } = useQuery({
    queryKey: ['catalogDiagnostic', catalog.id],
    queryFn: () => getCatalogDiagnostic({ tableId: catalog.id }),
    select: (data) => data?.data,
    enabled: catalog?.catalog_type === 'cluster' && !!catalog?.related_table,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return POLLING_STATUS.includes(status) ? 5000 : false;
    },
    staleTime: 5 * 60000,
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateCatalogDiagnostic({ tableId: catalog.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogDiagnostic', catalog.id] });
    },
  });

  const handleDownload = () => {
    downloadCatalogDiagnostic({ tableId: catalog.id });
  };

  if (catalog?.catalog_type !== 'cluster' || !catalog?.related_table) {
    return null;
  }

  if (isLoading && !diagnostic) {
    return <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />;
  }

  if (queryError) {
    return (
      <Alert severity="error">
        Failed to load catalog diagnostic: {queryError.message}
      </Alert>
    );
  }

  const status = diagnostic?.status;
  const isGenerating = POLLING_STATUS.includes(status);
  const hasError = status === 'error';
  const hasHtml = !!diagnostic?.html;

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        mb={2}
      >
        <Box />
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={isGenerating || !diagnostic?.updated_at}
          >
            Download notebook
          </Button>
          <Tooltip title="Regenerate">
            <span>
              <IconButton
                onClick={() => regenerate.mutate()}
                disabled={isGenerating || regenerate.isPending}
              >
                {regenerate.isPending ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {isGenerating && (
        <Alert severity="info" icon={<CircularProgress size={20} />}>
          Diagnostics are being generated. This may take a few moments.
        </Alert>
      )}

      {hasError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Diagnostic generation failed: {diagnostic?.error || 'Unknown error'}
        </Alert>
      )}

      {!isGenerating && !hasError && !hasHtml && (
        <Alert severity="info">
          No diagnostic available yet. Register or complete the catalog to generate it.
        </Alert>
      )}

      {hasHtml && (
        <Box
          sx={{
            height: isMobile ? 600 : 'calc(100vh - 290px)',
            minHeight: 400,
            overflow: 'hidden',
          }}
        >
          <iframe
            srcDoc={diagnostic.html.replace(/<head(\s[^>]*)?>/i, '$&<base target="_blank">')}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="Catalog Diagnostic"
          />
        </Box>
      )}
    </Paper>
  );
}
