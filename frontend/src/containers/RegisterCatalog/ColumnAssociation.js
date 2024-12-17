import React, { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import RegisterCatalogToolbar from "./Toolbar";
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import { Typography } from "@mui/material";
import ColumnInputReadOnly from "@/components/ColumnInputReadOnly";
import ColumnInputUcd from "@/components/ColumnInputUcd";
import { ucds } from "@/data/ucds";
export default function RegisterCatalogColumnAssociation() {

  const { setActiveStep, catalog } = useRegisterCatalog();

  const [usedUcds, setUsedUcds] = useState([])

  const columns = catalog.columns;

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
    //  TODO: Save data
    console.log("Next");
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  }

  const handlePrev = () => {
    //  TODO: Save data
    console.log("Prev");
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  }

  const changeColumn = (column, ucd, value) => {
    console.log("changeColumn", column, ucd, value)

    columns.forEach(row => {
      if (row.name === column.name) {
        row.ucd = ucd
        row.value = value
      }
    })
  }

  const onSelectUcd = (column, ucd) => {
    console.log("onSelectUcd", column, ucd)
    changeColumn(column, ucd, null)
  }

  const onClear = (column) => {
    console.log("onClear", column)
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

  console.log('usedUcds', usedUcds)

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
      <RegisterCatalogToolbar onNext={handleNext} onPrev={handlePrev} />
    </Box>
  );
}
