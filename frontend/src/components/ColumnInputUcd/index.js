import {
  FormControl,
  MenuItem,
  Stack,
  TextField
} from '@mui/material'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

export default function ColumnInputUcd({ column, options, onChange }) {
  const [value, setValue] = useState('')

  const [type, setType] = useState('select')

  const handleChange = e => {
    setValue(e.target.value)
    onChange(column, e.target.value)
  }
  return (
    <FormControl>
      <Stack direction="row" spacing={2}>

        {type === 'select' && (
          <TextField select value={value} onChange={handleChange}>
            {options.map(ucd => (
              <MenuItem key={`${column.name}_${ucd.value}`} value={ucd.value}>
                {ucd?.label ? ucd.label : ucd.value}
                {/* Uncomment if you want to show the Label and UCD as well */}
                {/* {ucd?.label && (`${ucd.label} (${ucd.value})`) || ucd.value} */}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </FormControl>
  )
}
ColumnInputUcd.propTypes = {
  column: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired
}
