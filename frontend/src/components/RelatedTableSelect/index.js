import React from 'react'
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PropTypes from 'prop-types'
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query'
import { availableUserTables } from '@/services/Metadata';

export default function RelatedTableSelect({ onChange, value }) {

  const { isLoading, data } = useQuery({
    queryKey: ['availableUserTables'],
    queryFn: availableUserTables
  })

  const handleChange = e => {
    onChange(e.target.value)
  }

  return (
    <TextField
      id="available-related-tables-select"
      select
      label="Select Related Table"
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
RelatedTableSelect.defaultProps = {
  value: ''
}
RelatedTableSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
}
