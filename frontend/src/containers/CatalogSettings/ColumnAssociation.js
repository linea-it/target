import React, { useState } from "react";
import Box from '@mui/material/Box';
import Typography from "@mui/material/Typography";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ColumnAssociationContainer from "@/containers/ColumnAssociation";


export default function CatalogSettingsColumnAssociation({ catalog }) {


  return (
    <Box>
      <Typography variant="h4" gutterBottom>Column Association</Typography>
      <Card sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Box>
            <ColumnAssociationContainer catalog={catalog} onValidationChange={() => { }} direction="row" />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
