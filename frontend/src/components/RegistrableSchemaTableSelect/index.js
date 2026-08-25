import React from 'react'
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PropTypes from 'prop-types'
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query'
import { registrableSchemaTables } from '@/services/Metadata';

export default function RegistrableSchemaTableSelect({ schema, onChange, value, label }) {

  const { isLoading, data } = useQuery({
    queryKey: ['registrableSchemaTables', schema],
    queryFn: () => registrableSchemaTables(schema),
    enabled: !!schema,
  })

  const handleChange = e => {
    onChange(e.target.value)
  }

  return (
    <TextField
      id="registrable-schema-tables-select"
      select
      label={label}
      fullWidth
      disabled={isLoading}
      slotProps={{
        input: {
          endAdornment: (
            <React.Fragment>
              {isLoading ? <CircularProgress color="inherit" size={20} sx={{ marginRight: 2 }} /> : null}
            </React.Fragment>
          ),
        },
      }}
      value={value && data ? value : ''}
      onChange={handleChange}
    >
      {!data && <MenuItem value="" />}
      {data?.data.map((option) => {
        let value = `${option.schema}.${option.table}`
        return (
          <MenuItem key={value} value={value}>
            {option.table}
          </MenuItem>
        )
      }
      )}
    </TextField>
  )
}
RegistrableSchemaTableSelect.defaultProps = {
  value: '',
  label: 'Select Table'
}
RegistrableSchemaTableSelect.propTypes = {
  schema: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  label: PropTypes.string
}
