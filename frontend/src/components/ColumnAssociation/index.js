import React, { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import DoneIcon from '@mui/icons-material/Done';
import ColumnInputReadOnly from "@/components/ColumnInputReadOnly";
import ColumnInputUcd from "@/components/ColumnInputUcd";
import { ucds, getUcdLabel } from "@/data/ucds";
import { useMutation } from '@tanstack/react-query'
import { getTableColumn, updateTableColumn } from "@/services/Metadata";


export default function ColumnAssociation({ catalog_id, requiredUcds, onValidationChange }) {

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
    const availableUcds = []
    ucds.forEach(ucd => {
      if (usedUcds.indexOf(ucd.value) === -1) {
        availableUcds.push(ucd)
      }
    })
    return availableUcds
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


  // usedUcds tiver pelo menos todos os elementos de requiredUcds
  // e todos os requiredUcds estejam contidos em usedUcds
  const isValid =
    usedUcds.length >= requiredUcds.length &&
    requiredUcds.every((ucd) => usedUcds.includes(ucd));

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

