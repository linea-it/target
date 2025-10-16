import React, { } from "react";
import Box from '@mui/material/Box';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";

import ColumnAssociationContainer from "@/containers/ColumnAssociation";

export default function RegisterCatalogColumnAssociation() {

  const { setActiveStep, catalog } = useRegisterCatalog();

  const [isValid, setIsValid] = React.useState(false);

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  const handlePrev = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }

  return (
    <Box>
      <ColumnAssociationContainer catalog={catalog} onValidationChange={setIsValid} direction="row" />

      <RegisterCatalogToolbar onNext={(isValid) ? handleNext : undefined} onPrev={handlePrev} />
    </Box>
  );
}
