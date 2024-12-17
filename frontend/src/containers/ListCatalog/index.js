import React from "react";
import Paper from '@mui/material/Paper';
import CatalogDataGrid from '@/components/CatalogDataGrid';

export default function ListCatalogContainer() {
  return (
    <Paper sx={{
      flex: 1
    }}>
      <CatalogDataGrid />
    </Paper>
  );
}
