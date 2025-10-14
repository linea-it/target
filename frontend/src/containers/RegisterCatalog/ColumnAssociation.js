import React, { } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from "@mui/material/Typography";
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import { mandatoryUcds, membersMandatoryUcds } from "@/data/ucds";
import ColumnAssociation from "@/components/ColumnAssociation";

export default function RegisterCatalogColumnAssociation() {

  const { setActiveStep, catalog } = useRegisterCatalog();

  const [isValid, setIsValid] = React.useState(false);
  const [isRelatedValid, setIsRelatedValid] = React.useState(false);

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  const handlePrev = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }


  const typeTarget = () => {
    return (
      <>
        <Typography variant="body1" gutterBottom>
          Please associate the column names of table <b>{catalog.table}</b> with those expected by the tool.
        </Typography>

        <ColumnAssociation catalog_id={catalog.id} requiredUcds={mandatoryUcds} onValidationChange={setIsValid} />

        <RegisterCatalogToolbar onNext={isValid ? handleNext : undefined} onPrev={handlePrev} />
      </>
    )
  }

  const typeCluster = () => {

    return (
      <>
        <Stack
          direction="row"
          spacing={4}
          sx={{
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          <Box>
            <Typography variant="body1" gutterBottom>
              Please associate the column names of table <b>{catalog.table}</b> with those expected by the tool.
            </Typography>

            <ColumnAssociation catalog_id={catalog.id} requiredUcds={mandatoryUcds} onValidationChange={setIsValid} />
          </Box>
          <Box>
            <Typography variant="body1" gutterBottom>
              Please associate the column names of table <b>{catalog.related_table_name.split('.')[1]}</b> with those expected by the tool.
            </Typography>

            <ColumnAssociation catalog_id={catalog.related_table} requiredUcds={membersMandatoryUcds} onValidationChange={setIsRelatedValid} />
          </Box>
        </Stack>
        <RegisterCatalogToolbar onNext={(isValid && isRelatedValid) ? handleNext : undefined} onPrev={handlePrev} />
      </>
    )
  }

  return (
    <Box
      component="form"
      sx={{
        '& > :not(style)': { mb: 2 },
        '& .MuiTextField-root': { width: '30ch' }
      }}
      noValidate
      autoComplete="off"
    >

      {catalog.catalog_type === 'target' && (typeTarget())}

      {catalog.catalog_type === 'cluster' && (typeCluster())}

    </Box>
  );
}
