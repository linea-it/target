import React from 'react'
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PropTypes from 'prop-types'
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query'
import { availableUserTables } from '@/services/Metadata';

export default function UserTableSelect({ onChange, value, label, exclude }) {

  const id = React.useId()

  const { isLoading, data } = useQuery({
    queryKey: ['availableUserTables'],
    queryFn: availableUserTables
  })

  const handleChange = e => {
    onChange(e.target.value)
  }

  const options = data?.data.filter((option) => `${option.schema}.${option.table}` !== exclude)

  return (
    <TextField
      id={`available-user-tables-select-${id}`}
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
      {options?.map((option) => {
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
UserTableSelect.defaultProps = {
  value: '',
  label: 'Select Table',
  exclude: ''
}
UserTableSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  label: PropTypes.string,
  exclude: PropTypes.string
}
