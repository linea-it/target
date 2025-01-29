import React from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import UserTableSelect from "@/components/UserTableSelect";
import { useMutation } from '@tanstack/react-query'
import { registerUserTable } from "@/services/Metadata";



export default function RegisterCatalogBasicInformation() {

  const { catalog, setCatalog, setActiveStep } = useRegisterCatalog();

  const mutation = useMutation({
    mutationFn: registerUserTable,
    onSuccess: (data, variables, context) => {
      // console.log('onSuccess', data)
      setCatalog(data.data)
      setActiveStep(prevActiveStep => prevActiveStep + 1);
    },
    onError: (error, variables, context) => {
      console.log('onError', error)
      // An error happened!
      console.log(`rolling back optimistic update with id ${context.id}`)
    },
    // onSettled: (data, error, variables, context) => {
    //   // Error or success... doesn't matter!
    //   console.log('onSettled', data)
    // },
  })


  const handleNext = () => {
    console.log('handleNext')
    //  TODO: Save data
    mutation.mutate(catalog)


    // setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  const onSelectTable = (value) => {
    let [schema, table] = value.split('.')
    setCatalog({
      ...catalog,
      schema: schema,
      table: table
    })
  }

  const handleChange = (e) => {
    setCatalog({
      ...catalog,
      [e.target.name]: e.target.value
    })
  }

  const isValid = catalog.title && catalog.schema && catalog.table ? true : false

  console.log(mutation.error)

  return (
    <Box
      component="form"
      sx={{ '& > :not(style)': { mb: 2 } }}
      noValidate
      autoComplete="off"
    >
      <UserTableSelect onChange={onSelectTable} value={catalog.schema && catalog.table ? `${catalog.schema}.${catalog.table}` : ''} />
      <TextField
        label="Name"
        variant="outlined"
        fullWidth
        name="title"
        value={catalog.title}
        onChange={handleChange} />
      <TextField
        label="Type"
        variant="outlined"
        fullWidth
        name="type"
        value={catalog.catalog_type}
        select
        onChange={handleChange}
      >
        <MenuItem key="target-option" value="target">Target</MenuItem>
        <MenuItem key="cluster-option" value="cluster">Cluster</MenuItem>
      </TextField>
      <TextField
        label="Description"
        variant="outlined"
        multiline
        rows={5}
        fullWidth
        name="description"
        value={catalog.description}
        onChange={handleChange} />

      {mutation.isLoading ? <LinearProgress /> : null}
      {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}

      {!isValid && (<RegisterCatalogToolbar />)}
      {isValid && (<RegisterCatalogToolbar onNext={handleNext} />)}


    </Box>
  );
}
