import CloseIcon from '@mui/icons-material/Close'
import {
  FormControl,
  TextField
} from '@mui/material'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import PropTypes from 'prop-types'
import React, { } from 'react'

export default function ColumnInputReadOnly({ name, value, onClear }) {
  return (
    <FormControl>
      <TextField
        id={`column_ready_only_${name}`}
        name={name}
        value={value}
        readOnly
        slotProps={{
          input: {
            endAdornment: onClear && (
              <InputAdornment position="end">
                <IconButton onClick={onClear}>
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ) || undefined
          }
        }}
      />
    </FormControl>
  )
}
ColumnInputReadOnly.propTypes = {
  value: PropTypes.string.isRequired,
  name: PropTypes.string,
  onClear: PropTypes.func
}
