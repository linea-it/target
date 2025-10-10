import React, { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from "@mui/material/Typography";
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import DoneIcon from '@mui/icons-material/Done';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import ColumnInputReadOnly from "@/components/ColumnInputReadOnly";
import ColumnInputUcd from "@/components/ColumnInputUcd";
import { ucds, mandatoryUcds, membersMandatoryUcds, getUcdLabel } from "@/data/ucds";
import { useMutation } from '@tanstack/react-query'
import { getTableColumn, updateTableColumn } from "@/services/Metadata";


function ColumnAssociation({ catalog_id, requiredUcds, onValidationChange }) {

  const [usedUcds, setUsedUcds] = useState([])

  const [columns, setColumns] = useState([])

  const [isLoading, setIsLoading] = useState(false)

  const loadColumns = React.useCallback(async () => {
    if (!catalog_id) return
    setIsLoading(true)
    getTableColumn(catalog_id).then((response) => {
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
    if (!catalog_id) return
    loadColumns();
  }, [catalog_id, loadColumns]);

  useEffect(() => {
    const useducds = []
    columns.forEach(row => {
      if (row.ucd !== null && row.ucd !== '' && row.ucd !== undefined) {
        useducds.push(row.ucd)
      }
    })
    setUsedUcds(useducds)
  }, [columns])

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
      let label = getUcdLabel(column.ucd)
      return (
        <ColumnInputReadOnly
          name={column.name}
          value={label ? label : column.ucd}
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

  const isValid = usedUcds.length >= requiredUcds.length && usedUcds.every((ucd) => requiredUcds.includes(ucd))

  // Notifica o pai quando isValid mudar
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [isValid, onValidationChange]);


  const mandatoryUcdsChips = () => {
    return (
      <Box mb={2}>
        <Stack direction="row" spacing={1}>
          {requiredUcds.map((ucd, index) => {
            const in_use = usedUcds.includes(ucd)
            if (in_use) {
              return (<Chip key={index} color="success" deleteIcon={<DoneIcon />} onDelete={() => { }} label={getUcdLabel(ucd) || ucd} size="small" sx={{
                minWidth: 50
              }} />)
            }
            return (
              <Chip key={index} label={getUcdLabel(ucd) || ucd} size="small" variant="outlined" sx={{
                minWidth: 50
              }} />)
          })}
        </Stack>
      </Box>
    )
  }


  return (
    <Box>
      {mandatoryUcdsChips()}

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
      {isLoading ? <LinearProgress /> : <Box sx={{ height: 4, marginBottom: 2 }} />}
    </Box>
  )
}

export default function RegisterCatalogColumnAssociation() {

  const { setActiveStep, catalog } = useRegisterCatalog();

  const [isValid, setIsValid] = React.useState(false);
  const [isRelatedValid, setIsRelatedValid] = React.useState(false);

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  const handlePrev = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }


  const typeTarget = () => {
    return (
      <>
        <Typography variant="body1" gutterBottom>
          Please associate the column names of table <b>{catalog.table}</b> with those expected by the tool.
        </Typography>

        <ColumnAssociation catalog_id={catalog.id} requiredUcds={mandatoryUcds} onValidationChange={setIsValid} />

        <RegisterCatalogToolbar onNext={isValid ? handleNext : undefined} onPrev={handlePrev} />
      </>
    )
  }

  const typeCluster = () => {
    
    return (
      <>
        <Stack
          direction="row"
          spacing={4}
          sx={{
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          <Box>
            <Typography variant="body1" gutterBottom>
              Please associate the column names of table <b>{catalog.table}</b> with those expected by the tool.
            </Typography>

            <ColumnAssociation catalog_id={catalog.id} requiredUcds={mandatoryUcds} onValidationChange={setIsValid} />
          </Box>
          <Box>
            <Typography variant="body1" gutterBottom>
              Please associate the column names of table <b>{catalog.related_table_name.split('.')[1]}</b> with those expected by the tool.
            </Typography>

            <ColumnAssociation catalog_id={catalog.related_table} requiredUcds={membersMandatoryUcds} onValidationChange={setIsRelatedValid} />
          </Box>
        </Stack>
        <RegisterCatalogToolbar onNext={(isValid && isRelatedValid) ? handleNext : undefined} onPrev={handlePrev} />
      </>
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

      {catalog.catalog_type === 'target' && (typeTarget())}

      {catalog.catalog_type === 'cluster' && (typeCluster())}

    </Box>
  );
}
