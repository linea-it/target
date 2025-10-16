import React, { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from "@mui/material/Typography";
import { ucds } from "@/data/ucds";

import UcdColumnMapper from "@/components/UcdColumnMapper";


export default function ColumnAssociationCluster({ catalog, onValidationChange, direction = "row" }) {

  const [clusterIsValid, setClusterIsValid] = useState(false)
  const [membersIsValid, setMembersIsValid] = useState(false)

  useEffect(() => {
    onValidationChange(clusterIsValid && membersIsValid)
  }, [clusterIsValid, membersIsValid, onValidationChange])

  return (
    <Box>
      <Stack
        direction={direction}
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
            catalog_type="cluster"
            ucds={ucds}
            onValidationChange={setClusterIsValid} />
        </Box>

        <Box>
          <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
            Please associate the column names of table <b>{catalog.related_table_name.split('.')[1]}</b> with those expected by the tool.
          </Typography>

          <UcdColumnMapper
            catalog_id={catalog.related_table}
            catalog_type="members"
            ucds={ucds}
            onValidationChange={setMembersIsValid} />
        </Box>
      </Stack>
    </Box>
  )
}
