import React from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
export default function RegisterCatalogColumnAssociation() {

  const { setActiveStep } = useRegisterCatalog();

  const handleSubmit = () => {
    //  TODO: Save data
    console.log("Submit");
  }

  const handlePrev = () => {
    //  TODO: Save data
    console.log("Prev");
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }

  return (
    <Box
      component="form"
      sx={{ '& > :not(style)': { mb: 2 } }}
      noValidate
      autoComplete="off"
    >
      Review data and submit
      <RegisterCatalogToolbar onSubmit={handleSubmit} onPrev={handlePrev} />
    </Box>
  );
}
