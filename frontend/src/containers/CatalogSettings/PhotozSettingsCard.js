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
import { MAX_SEARCH_FACTOR, MAX_SEARCH_RADIUS_DEG } from '@/components/Aladin/neighborClusters';
import { PHOTOZ_Z_BOUNDS, Z_SLIDER_STEP, photozParamsFromSettings } from '@/components/Aladin/photoz';
import { colormapGradientCss } from '@/components/Aladin/photozColors';
import { usePhotozTables } from '@/components/Aladin/usePhotoz';

/**
 * Default do photo-z (Settings.photoz): tabela de photo-z, raio da busca
 * (fator × raio do cluster, com teto), shape, tamanho, escala de cor,
 * intervalo de z e se o overlay já abre visível no Aladin do Cluster Detail.
 * `value` é o dict salvo ({} = sem default); `onChange` recebe o dict novo.
 */
export default function PhotozSettingsCard({ value, onChange }) {
  const { data: tables = [], isLoading } = usePhotozTables();
  const params = photozParamsFromSettings(value);
  const selected = tables.find(t => t.id === value?.tableId);
  const tableId = selected ? selected.id : '';
  const showOnOpen = value?.showOnOpen ?? false;

  // Valores dos sliders durante o arraste; só salva no commit.
  const [factor, setFactor] = React.useState(params.factor);
  const [maxRadiusDeg, setMaxRadiusDeg] = React.useState(params.maxRadiusDeg);
  const [sourceSize, setSourceSize] = React.useState(params.sourceSize);
  const [range, setRange] = React.useState([params.zMin, params.zMax]);

  React.useEffect(() => {
    setFactor(params.factor);
    setMaxRadiusDeg(params.maxRadiusDeg);
    setSourceSize(params.sourceSize);
    setRange([params.zMin, params.zMax]);
  }, [params.factor, params.maxRadiusDeg, params.sourceSize, params.zMin, params.zMax]);

  const save = (changes) => {
    onChange({ tableId, ...params, showOnOpen, ...changes });
  };

  // "None" limpa o default.
  const handleTableChange = (event) => {
    const id = event.target.value;
    if (id === '') {
      onChange({});
      return;
    }
    save({ tableId: id });
  };

  const disabled = !tableId;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Photo-z</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Default photo-z table for the Aladin viewer: sources around the selected cluster
          (cluster radius times a factor), colored by their photo-z value.
        </Typography>
        {!isLoading && tables.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No photo-z table registered. Register a table with the Photo-z type to use it here.
          </Typography>
        ) : (
          <Stack spacing={3}>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                fullWidth
                label="Photo-z table"
                value={tableId}
                onChange={handleTableChange}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {tables.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>
                ))}
              </TextField>
              <ShapeSelect value={params.shape} onChange={(shape) => save({ shape })} />
            </Stack>
            <Stack direction="row" spacing={4}>
              <Box sx={{ flex: 1 }}>
                <Typography id="photoz-settings-factor-label" variant="body2" color="text.secondary">
                  Search radius (× cluster radius)
                </Typography>
                <Slider
                  aria-labelledby="photoz-settings-factor-label"
                  value={factor}
                  onChange={(event, v) => setFactor(v)}
                  onChangeCommitted={(event, v) => save({ factor: v })}
                  min={1}
                  max={MAX_SEARCH_FACTOR}
                  step={1}
                  valueLabelDisplay="auto"
                  disabled={disabled}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography id="photoz-settings-max-radius-label" variant="body2" color="text.secondary">
                  Max search radius (deg)
                </Typography>
                <Slider
                  aria-labelledby="photoz-settings-max-radius-label"
                  value={maxRadiusDeg}
                  onChange={(event, v) => setMaxRadiusDeg(v)}
                  onChangeCommitted={(event, v) => save({ maxRadiusDeg: v })}
                  min={0.05}
                  max={MAX_SEARCH_RADIUS_DEG}
                  step={0.05}
                  valueLabelDisplay="auto"
                  disabled={disabled}
                />
              </Box>
            </Stack>
            <ColormapSelect
              value={params.colormap}
              onChange={(colormap) => save({ colormap })}
              disabled={disabled}
            />
            <Stack direction="row" spacing={4}>
              <Box sx={{ flex: 1 }}>
                <Typography id="photoz-settings-size-label" variant="body2" color="text.secondary">
                  Size
                </Typography>
                <Slider
                  aria-labelledby="photoz-settings-size-label"
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
                <Typography id="photoz-settings-range-label" variant="body2" color="text.secondary">
                  Photo-z range
                </Typography>
                <Slider
                  aria-labelledby="photoz-settings-range-label"
                  value={range}
                  onChange={(event, v) => setRange(v)}
                  onChangeCommitted={(event, [zMin, zMax]) => save({ zMin, zMax })}
                  min={PHOTOZ_Z_BOUNDS[0]}
                  max={PHOTOZ_Z_BOUNDS[1]}
                  step={Z_SLIDER_STEP}
                  disableSwap
                  valueLabelDisplay="auto"
                  disabled={disabled}
                />
                <Box
                  sx={{
                    height: 12,
                    borderRadius: 1,
                    background: colormapGradientCss(params.colormap),
                    opacity: disabled ? 0.4 : 1,
                  }}
                />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    z ≥ {range[0].toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    z ≤ {range[1].toFixed(2)}
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
        )}
      </CardContent>
    </Card>
  );
}
