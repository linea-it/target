import React from 'react';
import PropTypes from 'prop-types'
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { COLORMAPS, colormapGradientCss } from '@/components/Aladin/photozColors';

// Gradiente de cada escala, calculado uma vez para as opções do select.
const OPTIONS = Object.entries(COLORMAPS).map(([value, { label }]) => ({
  value,
  label,
  gradient: colormapGradientCss(value),
}));

export default function ColormapSelect({ value, onChange, disabled }) {

  const handleChange = (event) => {
    onChange(event.target.value);
  }

  return (
    <TextField
      select
      label="Color scale"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      fullWidth
    >
      {OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Box sx={{ width: 64, height: 12, flexShrink: 0, borderRadius: 0.5, background: option.gradient }} />
            {option.label}
          </Box>
        </MenuItem>
      ))}
    </TextField>
  )
}

ColormapSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}
