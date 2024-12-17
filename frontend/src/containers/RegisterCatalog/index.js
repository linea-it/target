'use client'
import React from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import RegisterCatalogStepper from "./Stepper";
import RegisterCatalogBasicInformation from "./BasicInformation";
import RegisterCatalogColumnAssociation from "./ColumnAssociation";
import RegisterCatalogConfirmation from "./Confirmation";
dayjs.extend(LocalizedFormat)
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";

export default function RegisterCatalogContainer() {
  const { activeStep } = useRegisterCatalog();
  console.log("activeStep", activeStep);
  return (
    <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', pb: 4 }}>
      <Stack spacing={4} sx={{
        justifyContent: "flex-start",
        alignItems: "stretch",
        flexGrow: 1,
      }}>
        <Box mt={2}> <RegisterCatalogStepper /> </Box>
        <Box sx={{ flexGrow: 1 }}>
          {activeStep === 0 && (<RegisterCatalogBasicInformation />)}
          {activeStep === 1 && (<RegisterCatalogColumnAssociation />)}
          {activeStep === 2 && (<RegisterCatalogConfirmation />)}
        </Box>
      </Stack>
    </Container >
  );
}
