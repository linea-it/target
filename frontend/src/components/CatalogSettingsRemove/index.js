'use client';
import React from "react";
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { deleteUserTable } from "@/services/Metadata";

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from "@/contexts/AuthContext";


export default function CatalogSettingsRemove({ catalog }) {
  const { user } = useAuth();
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await deleteUserTable(data.id);
      return res;
    },
    onSuccess: (data, variables, context) => {
      // Redirects to Home.
      router.push('/')
    },
    onError: (error, variables, context) => {
      console.log('onError', error)
      // An error happened!
      console.log(`rolling back optimistic update with id ${context.id}`)
    },
  })


  const deleteCatalog = () => {
    mutation.mutate(catalog);
  }


  return (
    <Box>
      <Typography variant="h4" gutterBottom>Danger Zone</Typography>
      <Card>
        <CardContent sx={{ display: 'flex' }}>
          <Box
            component="form"
            noValidate
            autoComplete="off"
            sx={{ flex: 1 }}
          >
            <Stack
              direction="row"
              spacing={2} sx={{
                justifyContent: "center",
                alignItems: "center",
              }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Removes this catalog from the visible list.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  This action does not delete the underlying table from the database. The table remains intact and can be re-added later.
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Box sx={{ minWidth: 200 }}>
                <Button color="error" onClick={deleteCatalog} variant="outlined" disabled={user?.username !== catalog.owner || mutation.isPending}>
                  Remove Catalog
                </Button>
              </Box>
            </Stack>
            {mutation.isPending ? <LinearProgress /> : <Box sx={{ height: 4, marginBottom: 2 }} />}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

}
