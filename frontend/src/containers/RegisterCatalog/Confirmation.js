import React from "react";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query'
import TargetDataGrid from "@/components/TargetDataGrid";
import Loading from "@/components/Loading";
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import { updateUserTable } from "@/services/Metadata";
import { useRouter } from 'next/navigation'
import filesize from 'filesize.js' // https://github.com/hustcc/filesize.js/

import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(LocalizedFormat)

export default function RegisterCatalogColumnAssociation() {
  const router = useRouter()
  const { catalog, setActiveStep } = useRegisterCatalog();

  const mutation = useMutation({
    mutationFn: updateUserTable,
    onSuccess: (data, variables, context) => {
      // Redireciona para a Home.
      router.push('/')
    },
    onError: (error, variables, context) => {
      // TODO: handle Error
      console.log('onError', error)
      // An error happened!
      console.log(`rolling back optimistic update with id ${context.id}`)
    },
  })

  const handleSubmit = () => {
    mutation.mutate({ id: catalog.id, is_completed: true })
  }

  const handlePrev = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }

  return (
    <Box
      component="form"
      sx={{ '& > :not(style)': { mb: 2 } }}
      noValidate
      autoComplete="off"
    >
      Review data and submit

      <Paper elevation={3} sx={{ p: 2 }}>
        <Stack>
          <Typography variant="h5" mt={2}>{catalog.title}</Typography>
          <Typography variant="caption">{dayjs(catalog.created_at).format('L')} by {catalog.owner}</Typography>
          <Typography variant="caption">Schema: {catalog.schema} Table: {catalog.table}</Typography>
          <Typography variant="caption">Rows: {catalog.nrows} Size: {filesize(catalog.size)}</Typography>
        </Stack>
        {catalog.description && catalog.description.length > 0 && <Typography variant="body1" mt={1}>{catalog.description}</Typography>}

        {/* <Box maxHeight={500} mt={1}> */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            maxHeight: 500,
          }}
        >
          <TargetDataGrid
            type={catalog.catalog_type}
            tableId={catalog.id}
            schema={catalog.schema}
            table={catalog.table}
            tableColumns={catalog.columns}
            onChangeSelection={() => { }}
          />
        </Box>
      </Paper>

      <RegisterCatalogToolbar onSubmit={handleSubmit} onPrev={handlePrev} />
    </Box>
  );
}
