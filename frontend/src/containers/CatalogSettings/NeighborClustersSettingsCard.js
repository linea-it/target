'use client';
import React from "react";
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import ColorSelect from '@/components/Aladin/CatalogControls/ColorSelect';
import {
  MAX_SEARCH_FACTOR,
  MAX_SEARCH_RADIUS_DEG,
  neighborParamsFromSettings,
} from '@/components/Aladin/neighborClusters';

/**
 * Default dos clusters vizinhos (Settings.neighbor_clusters): fator do raio
 * de busca, raio máximo, estilo e se o overlay já abre
 * visível no Aladin do Cluster Detail.
 * `value` é o dict salvo ({} = sem default); `onChange` recebe o dict novo.
 */
export default function NeighborClustersSettingsCard({ value, onChange }) {
  const params = neighborParamsFromSettings(value);
  const showOnOpen = value?.showOnOpen ?? false;

  // Valores dos sliders durante o arraste; só salva no commit.
  const [factor, setFactor] = React.useState(params.factor);
  const [maxRadiusDeg, setMaxRadiusDeg] = React.useState(params.maxRadiusDeg);
  const [opacity, setOpacity] = React.useState(params.opacity);
  const [lineWidth, setLineWidth] = React.useState(params.lineWidth);

  React.useEffect(() => {
    setFactor(params.factor);
    setMaxRadiusDeg(params.maxRadiusDeg);
    setOpacity(params.opacity);
    setLineWidth(params.lineWidth);
  }, [params.factor, params.maxRadiusDeg, params.opacity, params.lineWidth]);

  const save = (changes) => {
    onChange({ ...params, showOnOpen, ...changes });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Neighbor clusters</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Clusters from this table around the selected cluster, searched within the cluster radius times a factor
          (up to a maximum radius). Each cluster is drawn as a circle with its radius.
        </Typography>
        <Stack spacing={3}>
          <Stack direction="row" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography id="neighbor-settings-factor-label" variant="body2" color="text.secondary">
                Search radius (× cluster radius)
              </Typography>
              <Slider
                aria-labelledby="neighbor-settings-factor-label"
                value={factor}
                onChange={(event, v) => setFactor(v)}
                onChangeCommitted={(event, v) => save({ factor: v })}
                min={1}
                max={MAX_SEARCH_FACTOR}
                step={1}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography id="neighbor-settings-max-radius-label" variant="body2" color="text.secondary">
                Max search radius (deg)
              </Typography>
              <Slider
                aria-labelledby="neighbor-settings-max-radius-label"
                value={maxRadiusDeg}
                onChange={(event, v) => setMaxRadiusDeg(v)}
                onChangeCommitted={(event, v) => save({ maxRadiusDeg: v })}
                min={0.05}
                max={MAX_SEARCH_RADIUS_DEG}
                step={0.05}
                valueLabelDisplay="auto"
              />
            </Box>
          </Stack>
          <ColorSelect value={params.color} onChange={(color) => save({ color })} />
          <Stack direction="row" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography id="neighbor-settings-opacity-label" variant="body2" color="text.secondary">
                Opacity
              </Typography>
              <Slider
                aria-labelledby="neighbor-settings-opacity-label"
                value={opacity}
                onChange={(event, v) => setOpacity(v)}
                onChangeCommitted={(event, v) => save({ opacity: v })}
                min={0.05}
                max={1}
                step={0.05}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography id="neighbor-settings-line-width-label" variant="body2" color="text.secondary">
                Line width
              </Typography>
              <Slider
                aria-labelledby="neighbor-settings-line-width-label"
                value={lineWidth}
                onChange={(event, v) => setLineWidth(v)}
                onChangeCommitted={(event, v) => save({ lineWidth: v })}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={showOnOpen}
                onChange={(event) => save({ showOnOpen: event.target.checked })}
              />
            }
            label="Show on open"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
