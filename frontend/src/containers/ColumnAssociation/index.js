import React, { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';


import ColumnAssociationCluster from "@/containers/ColumnAssociation/Cluster";
import ColumnAssociationTarget from "@/containers/ColumnAssociation/Target";


export default function ColumnAssociationContainer({ catalog, onValidationChange, direction = "row" }) {

  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    onValidationChange(isValid)
  }, [isValid, onValidationChange])

  return (
    <Box>
      <Stack sx={{ width: '100%' }} spacing={2}>

        {catalog.catalog_type === 'target' && (<ColumnAssociationTarget catalog={catalog} onValidationChange={setIsValid} />)}

        {catalog.catalog_type === 'cluster' && (<ColumnAssociationCluster catalog={catalog} onValidationChange={setIsValid} direction={direction} />)}

        {!isValid && (
          <Alert variant="outlined" severity="error">
            All mandatory attributes need to be associated.
          </Alert>
        )}
      </Stack>
    </Box>
  );
}