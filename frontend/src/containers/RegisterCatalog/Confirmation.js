import React from "react";
import Box from '@mui/material/Box';
import { useMutation } from '@tanstack/react-query'
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import { updateUserTable } from "@/services/Metadata";
import { useRouter } from 'next/navigation'

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
      <RegisterCatalogToolbar onSubmit={handleSubmit} onPrev={handlePrev} />
    </Box>
  );
}
