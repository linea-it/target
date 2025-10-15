'use client';
import React from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useEditCatalog } from "@/contexts/EditCatalogContext";
import { updateUserTable } from "@/services/Metadata";

import { useMutation } from '@tanstack/react-query'

export default function MetadataForm() {

  const { catalog, setCatalog } = useEditCatalog();

  const [editedCatalog, setEditedCatalog] = React.useState(catalog)

  const mutation = useMutation({
    mutationFn: (data) => {
      return updateUserTable(data)
    },
    onSuccess: (data, variables, context) => {
      setCatalog(data.data)
      setEditedCatalog(data.data);
    },
    onError: (error, variables, context) => {
      console.log('onError', error)
      // An error happened!
      console.log(`rolling back optimistic update with id ${context.id}`)
    },
  })

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
    <Box>
      <Typography variant="h4" gutterBottom>General</Typography>
      <Card>
        <CardContent>
          <Box
            component="form"
            sx={{ '& > :not(style)': { mb: 2 } }}
            noValidate
            autoComplete="off"
          >
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              name="title"
              value={editedCatalog.title}
              onChange={handleChange}
            />
            <TextField
              label="Description"
              variant="outlined"
              multiline
              rows={5}
              fullWidth
              name="description"
              value={editedCatalog.description}
              onChange={handleChange}
            />
          </Box>
        </CardContent>
        <CardActions>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={handleDiscard}
            disabled={editedCatalog === catalog}
          >Discard</Button>
          <Button
            onClick={handleSave}
            disabled={editedCatalog === catalog}
          >Save</Button>
        </CardActions>
      </Card>
    </Box>
  );

}
