import React from "react";
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useCatalog } from "@/contexts/CatalogContext";
import { useMaterializeCatalog } from "@/contexts/MaterializeCatalogContext";
import { materializeTable } from "@/services/Metadata";
import MaterializeCatalogToolbar from "./Toolbar";

export default function MaterializeCatalogConfirmation() {
  const { catalog, lastFilterModel } = useCatalog();
  const { setActiveStep, setJob, tableName } = useMaterializeCatalog();

  const mutation = useMutation({
    mutationFn: () => materializeTable({ tableId: catalog.id, filterModel: lastFilterModel, tableName }),
    onSuccess: (res) => {
      setJob(res.data);
      setActiveStep(2);
    },
  });

  return (
    <Box>
      <Typography variant="body1" mb={2}>
        This will create a new table named <strong>{tableName}</strong> in your own catalog
        space (mydb), with the filter applied above
        {catalog.catalog_type === 'cluster' && ` (along with a ${tableName}_members table)`}.
        UCDs are inherited automatically from <strong>{catalog.schema}.{catalog.table}</strong> -
        you won't need to go through the column association wizard.
      </Typography>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutation.error?.response?.data?.error || 'Failed to start materialization.'}
        </Alert>
      )}

      <MaterializeCatalogToolbar
        onPrev={() => setActiveStep(0)}
        onNext={() => mutation.mutate()}
        nextLabel={mutation.isPending ? 'Starting…' : 'Materialize'}
        nextDisabled={mutation.isPending}
      />
    </Box>
  );
}
