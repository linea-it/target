import React from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from "@mui/material/Typography";
import { ucds } from "@/data/ucds";

import UcdColumnMapper from "@/components/UcdColumnMapper";


export default function ColumnAssociationTarget({ catalog, onValidationChange }) {


  return (
    <Box>
      <Stack
        direction="row"
        spacing={4}
        sx={{
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        <Box>
          <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
            Please associate the column names of table <b>{catalog.table}</b> with those expected by the tool.
          </Typography>

          <UcdColumnMapper
            catalog_id={catalog.id}
            catalog_type="target"
            ucds={ucds}
            onValidationChange={onValidationChange} />
        </Box>
      </Stack>
    </Box>
  )
}
