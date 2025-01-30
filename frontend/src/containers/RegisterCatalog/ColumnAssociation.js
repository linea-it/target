import React, { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from "@mui/material/Typography";
import LinearProgress from '@mui/material/LinearProgress';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import ColumnInputReadOnly from "@/components/ColumnInputReadOnly";
import ColumnInputUcd from "@/components/ColumnInputUcd";
import { ucds } from "@/data/ucds";
import { useMutation } from '@tanstack/react-query'
import { getTableColumn, updateTableColumn } from "@/services/Metadata";

export default function RegisterCatalogColumnAssociation() {

  const { setActiveStep, catalog } = useRegisterCatalog();

  const [usedUcds, setUsedUcds] = useState([])

  const [columns, setColumns] = useState(catalog.columns)

  const [isLoading, setIsLoading] = useState(false)

  const loadColumns = React.useCallback(async () => {
    setIsLoading(true)
    getTableColumn(catalog.id).then((response) => {
      setColumns(response.data)
    }).catch((error) => {
      // TODO: handle Error
      console.log('error', error)
    }).finally(() => {
      setIsLoading(false)
    })
  }, [])

  const mutation = useMutation({
    mutationFn: updateTableColumn,
    onSuccess: (data, variables, context) => {
      loadColumns()
    },
    onError: (error, variables, context) => {
      // TODO: Handle Error
      console.log('onError', error)
      // An error happened!
      console.log(`rolling back optimistic update with id ${context.id}`)
    },
  })


  useEffect(() => {
    const useducds = []
    columns.forEach(row => {
      if (row.ucd !== null && row.ucd !== '' && row.ucd !== undefined) {
        useducds.push(row.ucd)
      }
    })
    setUsedUcds(useducds)
  }, [columns])

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  const handlePrev = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }

  const changeColumn = (column, ucd, value) => {
    // console.log("changeColumn", column, ucd, value)
    mutation.mutate({
      ...column,
      ucd: ucd
    })
  }

  const onSelectUcd = (column, ucd) => {
    changeColumn(column, ucd, null)
  }

  const onClear = (column) => {
    changeColumn(column, null, null)
  }

  const getAvailableUcds = () => {
    const availvableUcds = []
    ucds.forEach(ucd => {
      if (usedUcds.indexOf(ucd.value) === -1) {
        availvableUcds.push(ucd)
      }
    })
    return availvableUcds
  }

  const createField = (column) => {
    if (column.ucd) {
      return (
        <ColumnInputReadOnly
          name={column.name}
          value={column.ucd} // Se for utilizar sistema de Alias aqui vai o valor do alias
          onClear={() => onClear(column)}
        />
      )
    }

    return (
      <ColumnInputUcd
        column={column}
        options={getAvailableUcds()}
        onChange={onSelectUcd}
      />

    )
  }

  return (
    <Box
      component="form"
      sx={{
        '& > :not(style)': { mb: 2 },
        '& .MuiTextField-root': { width: '30ch' }
      }}
      noValidate
      autoComplete="off"
    >
      <Typography variant="body1" gutterBottom>
        Please associate the column names of your file with those expected by the tool.
      </Typography>

      {columns.map((column, index) => {
        return (
          <Stack
            key={`table_columns_${index}`}
            direction="row"
            spacing={2}
            mb={2}
          >
            <ColumnInputReadOnly value={column.name} />
            {createField(column)}
          </Stack>
        )
      }
      )}
      {isLoading ? <LinearProgress /> : null}
      <RegisterCatalogToolbar onNext={handleNext} onPrev={handlePrev} />
    </Box>
  );
}
