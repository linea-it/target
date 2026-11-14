'use client';

import React from 'react';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import ShapeSelect from '@/components/Aladin/CatalogControls/ShapeSelect';
import ColormapSelect from '@/components/Aladin/CatalogControls/ColormapSelect';
import { colormapGradientCss } from '@/components/Aladin/photozColors';
import { MAX_SEARCH_FACTOR, MAX_SEARCH_RADIUS_DEG, formatAngle } from '@/components/Aladin/neighborClusters';
import { PHOTOZ_PAGE_SIZE, PHOTOZ_Z_BOUNDS, Z_SLIDER_STEP } from '@/components/Aladin/photoz';

/**
 * Diálogo do photo-z: fontes de uma tabela de photo-z ao redor do cluster
 * exibido, cada uma desenhada com o shape escolhido e a cor do seu z no
 * colormap. O usuário escolhe a tabela, o raio da busca (fator × raio do
 * cluster, com teto), o intervalo de z (filtra a busca) e o estilo.
 *
 * `photoz` é o retorno do usePhotoz do componente que abre o diálogo (o
 * estado vive lá e no useAladin, não aqui).
 */
export default function PhotozCatalogDialog({ open, onClose, photoz }) {
  const {
    tables,
    tablesLoading,
    table,
    setTableId,
    params,
    setParams,
    enabled,
    show,
    remove,
    visible,
    setVisible,
    hasRecord,
    searchRadiusDeg,
    isFetching,
    count,
    hasMore,
    elapsedMs,
    error,
  } = photoz;

  // Valores dos sliders durante o arraste; só aplica no commit.
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

  const hasTables = tables.length > 0;
  const disabled = !table;

  const handleToggleVisibility = () => {
    if (!enabled) {
      show();
      return;
    }
    setVisible(!visible);
  };

  const renderStatus = () => {
    if (!hasRecord) {
      return <Typography variant="body2" color="text.secondary">Select a cluster first.</Typography>;
    }
    if (!enabled) {
      return (
        <Typography variant="body2" color="text.secondary">
          Search radius: {formatAngle(searchRadiusDeg)}
        </Typography>
      );
    }
    if (isFetching) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Searching within {formatAngle(searchRadiusDeg)}…
          </Typography>
        </Stack>
      );
    }
    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }
    if (count === null) return null;
    return (
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {count} source{count === 1 ? '' : 's'} within {formatAngle(searchRadiusDeg)}
          {elapsedMs !== null && ` (${Math.round(elapsedMs)} ms)`}
        </Typography>
        {hasMore && (
          <Alert severity="warning">
            More than {PHOTOZ_PAGE_SIZE} sources in this area: only part of them is shown.
            Reduce the search radius or the photo-z range.
          </Alert>
        )}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Photo-z catalog</DialogTitle>
      <DialogContent>
        {!hasTables ? (
          <Typography variant="body2" color="text.secondary" mt={1}>
            {tablesLoading ? 'Loading photo-z tables…' : 'No photo-z table registered.'}
          </Typography>
        ) : (
          <Stack spacing={3} mt={1}>
            <TextField
              select
              fullWidth
              label="Photo-z table"
              value={table?.id ?? ''}
              onChange={(event) => setTableId(event.target.value)}
              helperText="Sources around the selected cluster, colored by their photo-z value."
            >
              {tables.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.title}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography id="photoz-factor-label" variant="body2" color="text.secondary">
                  Search radius (× cluster)
                </Typography>
                <Slider
                  aria-labelledby="photoz-factor-label"
                  value={factor}
                  onChange={(event, value) => setFactor(value)}
                  onChangeCommitted={(event, value) => setParams({ factor: value })}
                  min={1}
                  max={MAX_SEARCH_FACTOR}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography id="photoz-max-radius-label" variant="body2" color="text.secondary">
                  Max radius (deg)
                </Typography>
                <Slider
                  aria-labelledby="photoz-max-radius-label"
                  value={maxRadiusDeg}
                  onChange={(event, value) => setMaxRadiusDeg(value)}
                  onChangeCommitted={(event, value) => setParams({ maxRadiusDeg: value })}
                  min={0.05}
                  max={MAX_SEARCH_RADIUS_DEG}
                  step={0.05}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Stack>

            <ShapeSelect
              value={params.shape}
              onChange={(shape) => setParams({ shape })}
            />

            <Box>
              <Typography gutterBottom variant="body2" color="text.secondary">Size</Typography>
              <Slider
                value={sourceSize}
                onChange={(event, value) => setSourceSize(value)}
                onChangeCommitted={(event, value) => setParams({ sourceSize: value })}
                min={4}
                max={28}
                step={1}
                valueLabelDisplay="auto"
                disabled={disabled}
              />
            </Box>

            <ColormapSelect
              value={params.colormap}
              onChange={(colormap) => setParams({ colormap })}
              disabled={disabled}
            />

            <Stack spacing={1}>
              <Typography id="photoz-range-label" variant="body2" color="text.secondary">
                Photo-z range
              </Typography>
              <Slider
                aria-labelledby="photoz-range-label"
                value={range}
                onChange={(event, value) => setRange(value)}
                onChangeCommitted={(event, [zMin, zMax]) => setParams({ zMin, zMax })}
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
            </Stack>

            {renderStatus()}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleToggleVisibility}
          disabled={!hasRecord || disabled}
          startIcon={visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
        <Button color="error" onClick={remove} disabled={!enabled}>
          Remove
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
