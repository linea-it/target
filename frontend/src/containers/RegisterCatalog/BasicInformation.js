import React from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
export default function RegisterCatalogBasicInformation() {

  const { catalog, setActiveStep } = useRegisterCatalog();

  const handleNext = () => {
    //  TODO: Save data
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  return (
    <Box
      component="form"
      // sx={{ '& > :not(style)': { p: 2 } }}
      sx={{ '& > :not(style)': { mb: 2 } }}
      noValidate
      autoComplete="off"
    >
      <TextField label="Table" variant="outlined" fullWidth value={`${catalog.schema}.${catalog.table}`} />
      <TextField label="Name" variant="outlined" fullWidth value={catalog.name} />
      <TextField label="Type" variant="outlined" fullWidth value={catalog.type} />
      <TextField label="Description" variant="outlined" multiline rows={5} fullWidth value={catalog.description} />
      <RegisterCatalogToolbar onNext={handleNext} />
    </Box>
  );
}
