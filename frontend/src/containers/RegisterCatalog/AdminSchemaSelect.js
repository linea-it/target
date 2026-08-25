import React from 'react'
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PropTypes from 'prop-types'
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query'
import { publicSchemas } from '@/services/Metadata';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminSchemaSelect({ onChange, value }) {
  const { user } = useAuth();

  const { isLoading, data } = useQuery({
    queryKey: ['publicSchemas'],
    queryFn: publicSchemas,
    enabled: !!user?.is_staff,
  })

  if (!user?.is_staff) {
    return null;
  }

  const handleChange = e => {
    onChange(e.target.value)
  }

  return (
    <TextField
      id="admin-schema-select"
      select
      label="Register from a public schema (admin only)"
      helperText="Leave empty to register from your own tables"
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
      value={value}
      onChange={handleChange}
    >
      <MenuItem value="">None</MenuItem>
      {data?.data.map((schema) => (
        <MenuItem key={schema} value={schema}>
          {schema}
        </MenuItem>
      ))}
    </TextField>
  )
}
AdminSchemaSelect.defaultProps = {
  value: ''
}
AdminSchemaSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
}
