import EditIcon from '@mui/icons-material/Edit'
import {
  FormControl,
  MenuItem,
  Stack,
  TextField
} from '@mui/material'
import IconButton from '@mui/material/IconButton'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

export default function ColumnInputUcd({ column, options, onChange }) {
  const [value, setValue] = useState('')

  const [type, setType] = useState('select')

  const handleChange = e => {
    setValue(e.target.value)
    onChange(column, e.target.value)
  }
  const handleChangeType = () => {
    type === 'select' ? setType('text') : setType('select')
  }
  return (
    <FormControl>
      <Stack direction="row" spacing={2}>

        {type === 'select' && (
          <TextField select value={value} onChange={handleChange}>
            {options.map(ucd => (
              <MenuItem key={`${column.name}_${ucd.value}`} value={ucd.value}>
                {ucd?.label && (`${ucd.label} (${ucd.value})`) || ucd.value}
              </MenuItem>
            ))}
          </TextField>
        )}
        {type === 'text' && (
          <TextField value={value} onChange={handleChange}></TextField>
        )}
        <IconButton onClick={handleChangeType}>
          <EditIcon />
        </IconButton>
      </Stack>
    </FormControl>
  )
}
ColumnInputUcd.propTypes = {
  column: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired
}
