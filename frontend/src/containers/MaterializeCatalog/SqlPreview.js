import React from "react";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useMaterializeCatalog } from "@/contexts/MaterializeCatalogContext";
import { previewFilterSql } from "@/services/Metadata";
import MaterializeCatalogToolbar from "./Toolbar";

// Mesma regra validada no backend (target/metadata/api/views.py::_validate_result_table_name).
const TABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,49}$/;

export default function MaterializeCatalogSqlPreview() {
  const router = useRouter();
  const { user } = useAuth();
  const { catalog, lastFilterModel } = useCatalog();
  const { setActiveStep, tableName, setTableName } = useMaterializeCatalog();
  const [nameTouched, setNameTouched] = React.useState(false);

  // Sugere um nome de partida (editável) assim que o catálogo de origem é conhecido.
  React.useEffect(() => {
    if (catalog.table && !tableName) {
      setTableName(`${catalog.table}_subset`);
    }
  }, [catalog.table, tableName, setTableName]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['filterPreviewSql', catalog.id, lastFilterModel],
    queryFn: () => previewFilterSql({ tableId: catalog.id, filterModel: lastFilterModel }),
    select: (res) => res.data?.sql,
    enabled: !!catalog.id,
  });

  const isNameValid = TABLE_NAME_RE.test(tableName);

  const handleCancel = () => {
    router.push(`/catalog/${catalog.schema}/${catalog.table}`);
  };

  return (
    <Box>
      <Typography variant="body1" mb={2}>
        This is the exact query that will be sent to materialize your filtered subset of{' '}
        <strong>{catalog.schema}.{catalog.table}</strong>. It reflects the filters currently
        applied on the catalog grid.
      </Typography>

      {!lastFilterModel?.items?.length && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No filters are currently applied - the full table will be materialized.
        </Alert>
      )}

      <TextField
        label="New table name"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
        onBlur={() => setNameTouched(true)}
        error={nameTouched && !isNameValid}
        helperText={
          nameTouched && !isNameValid
            ? 'Start with a letter or underscore; only letters, digits and underscores; max 50 characters.'
            : `This will be created as mydb_${user?.username || '<you>'}.${tableName || '…'}`
        }
        fullWidth
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to build the preview query: {error.response?.data?.error || error.message}
        </Alert>
      )}

      {isLoading && <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />}

      {data && (
        <Paper variant="outlined" sx={{ p: 2, overflow: 'auto' }}>
          <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {data}
          </Typography>
        </Paper>
      )}

      <MaterializeCatalogToolbar
        onCancel={handleCancel}
        onNext={() => setActiveStep(1)}
        nextDisabled={!data || isLoading || !!error || !isNameValid}
      />
    </Box>
  );
}
