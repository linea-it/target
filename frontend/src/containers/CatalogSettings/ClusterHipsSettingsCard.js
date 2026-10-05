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

import ColorSelect from '@/components/Aladin/CatalogControls/ColorSelect';
import { DEFAULT_CLUSTER_STYLE } from '@/components/Aladin/hipsCatalogs';

/**
 * Default do catálogo HiPS de clusters (Settings.cluster_hips): catálogo,
 * estilo e se ele já abre visível no Aladin do Cluster Detail.
 * `value` é o dict salvo ({} = sem default); `onChange` recebe o dict novo.
 */
export default function ClusterHipsSettingsCard({ catalogs, value, onChange }) {
  const catalogId = catalogs.some(cat => cat.id === value?.catalogId) ? value.catalogId : '';
  const style = {
    color: value?.color ?? DEFAULT_CLUSTER_STYLE.color,
    opacity: value?.opacity ?? DEFAULT_CLUSTER_STYLE.opacity,
    lineWidth: value?.lineWidth ?? DEFAULT_CLUSTER_STYLE.lineWidth,
  };
  const showOnOpen = value?.showOnOpen ?? false;

  // Valores dos sliders durante o arraste; só salva no commit.
  const [opacity, setOpacity] = React.useState(style.opacity);
  const [lineWidth, setLineWidth] = React.useState(style.lineWidth);

  React.useEffect(() => {
    setOpacity(style.opacity);
    setLineWidth(style.lineWidth);
  }, [style.opacity, style.lineWidth]);

  const save = (changes) => {
    onChange({ catalogId, ...style, showOnOpen, ...changes });
  };

  // "None" limpa o default.
  const handleCatalogChange = (event) => {
    const id = event.target.value;
    if (!id) {
      onChange({});
      return;
    }
    save({ catalogId: id });
  };

  const disabled = !catalogId;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Clusters catalog (HiPS)</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Default whole-sky clusters catalog for the Aladin viewer. Each cluster is drawn as a circle with its radius.
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
            <Box sx={{ width: '100%' }}>
              <ColorSelect value={style.color} onChange={(color) => save({ color })} />
            </Box>
          </Stack>
          <Stack direction="row" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography id="cluster-hips-opacity-label" variant="body2" color="text.secondary">
                Opacity
              </Typography>
              <Slider
                aria-labelledby="cluster-hips-opacity-label"
                value={opacity}
                onChange={(event, v) => setOpacity(v)}
                onChangeCommitted={(event, v) => save({ opacity: v })}
                min={0.05}
                max={1}
                step={0.05}
                valueLabelDisplay="auto"
                disabled={disabled}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography id="cluster-hips-line-width-label" variant="body2" color="text.secondary">
                Line width
              </Typography>
              <Slider
                aria-labelledby="cluster-hips-line-width-label"
                value={lineWidth}
                onChange={(event, v) => setLineWidth(v)}
                onChangeCommitted={(event, v) => save({ lineWidth: v })}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
                disabled={disabled}
              />
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
