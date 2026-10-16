import React from "react";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useMaterializeCatalog } from "@/contexts/MaterializeCatalogContext";
import { previewFilterSql } from "@/services/Metadata";
import { asFilterExpression, emptyFilterExpression, expressionIssues, filtersDiffer, hasActiveFilterModel } from "@/components/TargetDataGrid/filterExpression";
import MaterializeCatalogToolbar from "./Toolbar";
import SubsetFilter from "./SubsetFilter";

// Mesma regra validada no backend (target/metadata/api/views.py::_validate_result_table_name).
const TABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,49}$/;

export default function MaterializeCatalogSqlPreview() {
  const router = useRouter();
  const { user } = useAuth();
  const { catalog } = useCatalog();
  const { setActiveStep, tableName, setTableName, subsetFilter, setSubsetFilter, draftFilter, setDraftFilter } = useMaterializeCatalog();
  const [nameTouched, setNameTouched] = React.useState(false);
  const [previewNonce, setPreviewNonce] = React.useState(0);
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (seeded.current || subsetFilter) return;
    seeded.current = true;
    let model = null;
    try {
      model = JSON.parse(sessionStorage.getItem('lastFilterModel') || 'null');
    } catch {
      model = null;
    }
    const seededFilter = asFilterExpression(model) || emptyFilterExpression();
    setDraftFilter(seededFilter);
    setSubsetFilter(seededFilter);
  }, [setDraftFilter, setSubsetFilter, subsetFilter]);

  // Sugere um nome de partida (editável) assim que o catálogo de origem é conhecido.
  React.useEffect(() => {
    if (catalog.table && !tableName) {
      setTableName(`${catalog.table}_subset`);
    }
  }, [catalog.table, tableName, setTableName]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['filterPreviewSql', catalog.id, subsetFilter, previewNonce],
    queryFn: () => previewFilterSql({ tableId: catalog.id, filterModel: subsetFilter }),
    select: (res) => res.data?.sql,
    enabled: !!catalog.id && !!subsetFilter,
  });

  const issues = expressionIssues(draftFilter, catalog.columns);
  const previewStale = filtersDiffer(draftFilter, subsetFilter);
  const isNameValid = TABLE_NAME_RE.test(tableName);

  const handleCancel = () => {
    router.push(`/catalog/${catalog.schema}/${catalog.table}`);
  };

  return (
    <Box>
      <Typography variant="body1" mb={2}>
        This makes a new catalog from rows in{' '}
        <strong>{catalog.schema}.{catalog.table}</strong>. If you filtered the table
        before opening this page, that filter is already filled in. Rules you add
        below, including Or and Not, are used only for this new catalog.
      </Typography>

      <SubsetFilter catalog={catalog} expression={draftFilter} onChange={setDraftFilter} />

      {issues.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {issues[0]}
        </Alert>
      )}

      <Button
        variant="outlined"
        sx={{ mb: 2 }}
        disabled={!draftFilter || issues.length > 0 || (!previewStale && !error)}
        onClick={() => {
          setSubsetFilter(draftFilter);
          setPreviewNonce((nonce) => nonce + 1);
        }}
      >
        Update preview
      </Button>

      {!hasActiveFilterModel(subsetFilter) && (
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
        nextDisabled={!data || isLoading || !!error || !isNameValid || previewStale || issues.length > 0}
      />
    </Box>
  );
}
