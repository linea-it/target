'use client';
import React from "react";
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ShapeSelect from '@/components/Aladin/CatalogControls/ShapeSelect';
import ColormapSelect from '@/components/Aladin/CatalogControls/ColormapSelect';
import { DEFAULT_PHOTOZ_STYLE, Z_SLIDER_STEP, zSliderBounds } from '@/components/Aladin/hipsCatalogs';
import { colormapGradientCss } from '@/components/Aladin/photozColors';


/**
 * Default do catálogo HiPS de photo-z (Settings.photoz_hips): catálogo,
 * shape, tamanho, escala de cor, intervalo de z e se ele já abre visível no
 * Aladin do Cluster Detail.
 * `value` é o dict salvo ({} = sem default); `onChange` recebe o dict novo.
 */
export default function PhotozHipsSettingsCard({ catalogs, value, onChange }) {
  const selected = catalogs.find(cat => cat.id === value?.catalogId);
  const catalogId = selected ? selected.id : '';
  const zRange = selected?.zRange ?? [0, 1];
  const style = {
    shape: value?.shape ?? DEFAULT_PHOTOZ_STYLE.shape,
    sourceSize: value?.sourceSize ?? DEFAULT_PHOTOZ_STYLE.sourceSize,
    colormap: value?.colormap ?? DEFAULT_PHOTOZ_STYLE.colormap,
    zMin: value?.zMin ?? zRange[0],
    zMax: value?.zMax ?? zRange[1],
  };
  const showOnOpen = value?.showOnOpen ?? false;

  // Valores dos sliders durante o arraste; só salva no commit.
  const [sourceSize, setSourceSize] = React.useState(style.sourceSize);
  const [range, setRange] = React.useState([style.zMin, style.zMax]);

  React.useEffect(() => {
    setSourceSize(style.sourceSize);
  }, [style.sourceSize]);

  React.useEffect(() => {
    setRange([style.zMin, style.zMax]);
  }, [style.zMin, style.zMax]);

  const [boundMin, boundMax] = zSliderBounds(selected);

  const save = (changes) => {
    onChange({ catalogId, ...style, showOnOpen, ...changes });
  };

  // "None" limpa o default; trocar de catálogo volta o intervalo para o
  // default do novo catálogo.
  const handleCatalogChange = (event) => {
    const id = event.target.value;
    if (!id) {
      onChange({});
      return;
    }
    const [zMin, zMax] = catalogs.find(cat => cat.id === id).zRange;
    save({ catalogId: id, zMin, zMax });
  };

  const disabled = !catalogId;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Photo-z catalog (HiPS)</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Default photo-z catalog for the Aladin viewer. Each source is colored by its photo-z value.
        </Typography>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              fullWidth
              label="Catalog"
              value={catalogId}
              onChange={handleCatalogChange}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {catalogs.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
            <ShapeSelect value={style.shape} onChange={(shape) => save({ shape })} />
          </Stack>
          <ColormapSelect
            value={style.colormap}
            onChange={(colormap) => save({ colormap })}
            disabled={disabled}
          />
          <Stack direction="row" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography id="photoz-hips-size-label" variant="body2" color="text.secondary">
                Size
              </Typography>
              <Slider
                aria-labelledby="photoz-hips-size-label"
                value={sourceSize}
                onChange={(event, v) => setSourceSize(v)}
                onChangeCommitted={(event, v) => save({ sourceSize: v })}
                min={4}
                max={28}
                step={1}
                valueLabelDisplay="auto"
                disabled={disabled}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography id="photoz-hips-range-label" variant="body2" color="text.secondary">
                Photo-z range
              </Typography>
              <Slider
                aria-labelledby="photoz-hips-range-label"
                value={range}
                onChange={(event, v) => setRange(v)}
                onChangeCommitted={(event, [zMin, zMax]) => save({ zMin, zMax })}
                min={boundMin}
                max={boundMax}
                step={Z_SLIDER_STEP}
                disableSwap
                valueLabelDisplay="auto"
                disabled={disabled}
              />
              <Box
                sx={{
                  height: 12,
                  borderRadius: 1,
                  background: colormapGradientCss(style.colormap),
                  opacity: disabled ? 0.4 : 1,
                }}
              />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  z ≤ {range[0].toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  z ≥ {range[1].toFixed(2)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={showOnOpen}
                onChange={(event) => save({ showOnOpen: event.target.checked })}
                disabled={disabled}
              />
            }
            label="Show on open"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
