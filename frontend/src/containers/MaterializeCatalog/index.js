'use client'
import React from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useMaterializeCatalog } from "@/contexts/MaterializeCatalogContext";
import MaterializeCatalogStepper from "./Stepper";
import MaterializeCatalogSqlPreview from "./SqlPreview";
import MaterializeCatalogConfirmation from "./Confirmation";
import MaterializeCatalogProgress from "./Progress";

export default function MaterializeCatalogContainer() {
  const { activeStep } = useMaterializeCatalog();

  return (
    <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', pb: 4 }}>
      <Stack spacing={4} sx={{
        justifyContent: "flex-start",
        alignItems: "stretch",
        flexGrow: 1,
        width: '100%',
      }}>
        <Typography variant="h5" mt={2}>Save filtered subset</Typography>
        <Box> <MaterializeCatalogStepper /> </Box>
        <Box sx={{ flexGrow: 1 }}>
          {activeStep === 0 && (<MaterializeCatalogSqlPreview />)}
          {activeStep === 1 && (<MaterializeCatalogConfirmation />)}
          {activeStep === 2 && (<MaterializeCatalogProgress />)}
        </Box>
      </Stack>
    </Container>
  );
}
