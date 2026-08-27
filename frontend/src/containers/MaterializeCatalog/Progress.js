import React from "react";
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCatalog } from "@/contexts/CatalogContext";
import { useMaterializeCatalog } from "@/contexts/MaterializeCatalogContext";
import { getMaterializationJob, getMetadataById } from "@/services/Metadata";
import MaterializeCatalogToolbar from "./Toolbar";

const POLLING_STATUS = ['pending', 'running'];

export default function MaterializeCatalogProgress() {
  const router = useRouter();
  const { catalog } = useCatalog();
  const { job, setActiveStep } = useMaterializeCatalog();

  const { data: jobStatus } = useQuery({
    queryKey: ['materializationJob', job?.id],
    queryFn: () => getMaterializationJob({ jobId: job.id }),
    select: (res) => res.data,
    enabled: !!job?.id,
    // query.state.data aqui é o valor bruto (antes do `select` acima), ou
    // seja, a Response do axios - cujo próprio campo `.status` é o status
    // HTTP (200), não o status do job. Por isso `.data.status` (mesmo
    // padrão de CatalogDiagnostic/index.js), não `.status`.
    refetchInterval: (query) => (
      POLLING_STATUS.includes(query.state.data?.data?.status) ? 3000 : false
    ),
  });

  const status = jobStatus?.status;
  const isRunning = !status || POLLING_STATUS.includes(status);
  const isDone = status === 'done';
  const isError = status === 'error';

  const { data: resultTable } = useQuery({
    queryKey: ['metadataById', jobStatus?.result_table],
    queryFn: () => getMetadataById({ tableId: jobStatus.result_table }),
    select: (res) => res.data,
    enabled: isDone && !!jobStatus?.result_table,
  });

  const handleViewTable = () => {
    router.push(`/catalog/${resultTable.schema}/${resultTable.table}`);
  };

  const handleCancel = () => {
    router.push(`/catalog/${catalog.schema}/${catalog.table}`);
  };

  return (
    <Box>
      {isRunning && (
        <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2 }}>
          Materializing your filtered subset. This can take a few minutes for large tables -
          feel free to leave this page, the job keeps running in the background.
        </Alert>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {jobStatus.error || 'Materialization failed.'}
        </Alert>
      )}

      {isDone && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Your filtered subset is ready.
        </Alert>
      )}

      {isDone && resultTable && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            New table: <strong>{resultTable.schema}.{resultTable.table}</strong>
          </Typography>
          <Button variant="contained" sx={{ mt: 1 }} onClick={handleViewTable}>
            View table
          </Button>
        </Box>
      )}

      <MaterializeCatalogToolbar
        onCancel={handleCancel}
        onPrev={isError ? () => setActiveStep(0) : undefined}
      />
    </Box>
  );
}
