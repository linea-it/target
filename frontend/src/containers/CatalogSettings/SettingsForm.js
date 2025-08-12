'use client';
import React from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { useEditCatalog } from "@/contexts/EditCatalogContext";
import { updateUserTable } from "@/services/Metadata";

import { useMutation } from '@tanstack/react-query'

export default function SettingsForm() {

  const { catalog, setCatalog } = useEditCatalog();

  const [editedCatalog, setEditedCatalog] = React.useState(catalog)

  // const mutation = useMutation({
  //   mutationFn: (data) => {
  //     return updateUserTable(data)
  //   },
  //   onSuccess: (data, variables, context) => {
  //     setCatalog(data.data)
  //     setEditedCatalog(data.data);
  //   },
  //   onError: (error, variables, context) => {
  //     console.log('onError', error)
  //     // An error happened!
  //     console.log(`rolling back optimistic update with id ${context.id}`)
  //   },
  // })

  const handleChange = (event) => {
    const { name, value } = event.target
    setEditedCatalog((prev) => ({ ...prev, [name]: value }))
  }

  const handleDiscard = () => {
    setEditedCatalog(catalog)
  }


  const handleSave = () => {
    mutation.mutate(editedCatalog)
  }

  return (
    <Card>
      <CardContent>
        <Box
          component="form"
          noValidate
          autoComplete="off"
        >
          <Stack direction="row" spacing={2}>
            <TextField
              label="Default Survey"
              variant="outlined"
              fullWidth
              name="default_image"
              value={editedCatalog.settings.default_image}
              onChange={handleChange}
            />
            <TextField
              label="Default FOV"
              variant="outlined"
              type="number"
              fullWidth
              name="default_fov"
              value={editedCatalog.settings.default_fov}
              onChange={handleChange}
            />
            <TextField
              label="Default Marker Size"
              variant="outlined"
              type="number"
              fullWidth
              name="default_marker_size"
              value={editedCatalog.settings.default_marker_size}
              onChange={handleChange}
            />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );

}
