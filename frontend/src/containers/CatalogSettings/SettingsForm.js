'use client';
import React from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import { useEditCatalog } from "@/contexts/EditCatalogContext";
import { updateTableSettings, createTableSettings } from "@/services/Metadata";

import { useMutation } from '@tanstack/react-query'

import { useAuth } from "@/contexts/AuthContext";


export default function SettingsForm() {
  const { user } = useAuth();
  const { catalog } = useEditCatalog();

  const [editedSettings, setEditedSettings] = React.useState(catalog?.settings || {
    id: undefined,
    table: undefined,
    default_image: '',
    default_fov: 1.5,
    default_marker_size: 0.001,
  })

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (data.id === undefined) {
        // Cria novo registro
        const res = await createTableSettings(data);
        return res;
      } else {
        // Atualiza registro existente
        const res = await updateTableSettings(data);
        return res;
      }
    },
    onSuccess: (data, variables, context) => {
      setEditedSettings(data.data);

      // const updatedCatalog = {
      //   ...catalog,
      //   settings: data.data
      // };
      // setCatalog(updatedCatalog);

    },
    onError: (error, variables, context) => {
      console.log('onError', error)
      // An error happened!
      console.log(`rolling back optimistic update with id ${context.id}`)
    },
  })

  const handleChange = (event) => {
    const { name, value } = event.target;

    const updated = {
      ...editedSettings,
      table: catalog.id,
      [name]: value
    };
    setEditedSettings(updated);

    // Salva automaticamente (POST ou PATCH)
    mutation.mutate(updated);
  };

  const surveys = [{
    value: "DES_DR2_IRG_LIneA",
    label: "DES DR2 IRG at LIneA",
  }, {
    value: "RUBIN_FIRST_LOOK_UGRI",
    label: "RUBIN FIRST LOOK at LIneA"
  }, {
    value: "LSST_DP02_IRG_LIneA",
    label: "LSST DP0.2 IRG at LIneA",
    requireGroup: "lsst_dp0.2"
  }]


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
              select
              label="Default Survey"
              variant="outlined"
              fullWidth
              name="default_image"
              value={editedSettings?.default_image ?? ''}
              onChange={handleChange}
            >
              {surveys.map((option) => {
                if (option.requireGroup && !user?.groups?.includes(option.requireGroup)) {
                  return null; // Não renderiza a opção se o usuário não tiver acesso
                }
                return (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField
              label="Default FOV"
              variant="outlined"
              type="number"
              fullWidth
              name="default_fov"
              value={editedSettings?.default_fov}
              onChange={handleChange}
            />

            <TextField
              label="Default Marker Size"
              variant="outlined"
              type="number"
              fullWidth
              name="default_marker_size"
              value={editedSettings?.default_marker_size}
              onChange={handleChange}
            />
          </Stack>
          {mutation.isPending ? <LinearProgress /> : <Box sx={{ height: 4, marginBottom: 2 }} />}
        </Box>
      </CardContent>
    </Card>
  );

}
