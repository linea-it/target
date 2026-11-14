'use client';

import React from 'react';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import ColorSelect from '@/components/Aladin/CatalogControls/ColorSelect';
import { MAX_SEARCH_FACTOR, MAX_SEARCH_RADIUS_DEG, formatAngle } from '@/components/Aladin/neighborClusters';

/**
 * Diálogo dos clusters vizinhos: clusters da mesma tabela ao redor do cluster
 * exibido, desenhados como círculos com o seu raio. O usuário ajusta o fator
 * do raio de busca, o raio máximo e o estilo.
 *
 * `neighbors` é o retorno do useNeighborClusters do componente que abre o
 * diálogo (o estado vive lá e no useAladin, não aqui).
 */
export default function NeighborClustersDialog({ open, onClose, neighbors }) {
  const {
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
  } = neighbors;

  // Valores dos sliders durante o arraste; só aplica no commit.
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
          {count} neighbor cluster{count === 1 ? '' : 's'} within {formatAngle(searchRadiusDeg)}
          {elapsedMs !== null && ` (${Math.round(elapsedMs)} ms)`}
        </Typography>
        {hasMore && (
          <Alert severity="warning">
            Too many clusters in this area: only part of them is shown. Reduce the search radius.
          </Alert>
        )}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Neighbor clusters</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Clusters from this table around the selected cluster, each drawn as a circle with its radius.
            Click a circle to see its data.
          </Typography>

          <Stack spacing={1}>
            <Typography id="neighbor-factor-label" variant="body2" color="text.secondary">
              Search radius (× cluster radius)
            </Typography>
            <Slider
              aria-labelledby="neighbor-factor-label"
              value={factor}
              onChange={(event, value) => setFactor(value)}
              onChangeCommitted={(event, value) => setParams({ factor: value })}
              min={1}
              max={MAX_SEARCH_FACTOR}
              step={1}
              valueLabelDisplay="auto"
            />
          </Stack>

          <Stack spacing={1}>
            <Typography id="neighbor-max-radius-label" variant="body2" color="text.secondary">
              Max search radius (deg)
            </Typography>
            <Slider
              aria-labelledby="neighbor-max-radius-label"
              value={maxRadiusDeg}
              onChange={(event, value) => setMaxRadiusDeg(value)}
              onChangeCommitted={(event, value) => setParams({ maxRadiusDeg: value })}
              min={0.05}
              max={MAX_SEARCH_RADIUS_DEG}
              step={0.05}
              valueLabelDisplay="auto"
            />
          </Stack>

          <ColorSelect
            value={params.color}
            onChange={(color) => setParams({ color })}
          />

          <Stack spacing={1}>
            <Typography id="neighbor-opacity-label" variant="body2" color="text.secondary">
              Opacity
            </Typography>
            <Slider
              aria-labelledby="neighbor-opacity-label"
              value={opacity}
              onChange={(event, value) => setOpacity(value)}
              onChangeCommitted={(event, value) => setParams({ opacity: value })}
              min={0.05}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
            />
          </Stack>

          <Stack spacing={1}>
            <Typography id="neighbor-line-width-label" variant="body2" color="text.secondary">
              Line width
            </Typography>
            <Slider
              aria-labelledby="neighbor-line-width-label"
              value={lineWidth}
              onChange={(event, value) => setLineWidth(value)}
              onChangeCommitted={(event, value) => setParams({ lineWidth: value })}
              min={1}
              max={5}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Stack>

          {renderStatus()}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleToggleVisibility}
          disabled={!hasRecord}
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
