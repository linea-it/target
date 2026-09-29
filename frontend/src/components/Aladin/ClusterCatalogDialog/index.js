'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import { useAladinContext } from '@/components/Aladin/AladinContext';
import ColorSelect from '@/components/Aladin/CatalogControls/ColorSelect';

const DEFAULT_STYLE = { color: '#ff9800', opacity: 0.8, lineWidth: 2 };

/**
 * Diálogo do catálogo HiPS de clusters (céu inteiro). Cada cluster é
 * desenhado como um círculo com o seu raio; aqui o usuário escolhe o
 * catálogo, a cor, a transparência e a espessura da linha.
 *
 * O estado aplicado vive no hook useAladin, então reabrir o diálogo sempre
 * reflete o que está realmente no Aladin.
 */
export default function ClusterCatalogDialog({ open, onClose }) {
  const {
    clusterOverlay,
    getClusterCatalogs,
    setClusterCatalog,
    setClusterCatalogVisibility,
    removeClusterCatalog,
  } = useAladinContext();

  const catalogId = clusterOverlay?.catalogId ?? '';
  const visible = clusterOverlay?.visible ?? false;
  const style = {
    color: clusterOverlay?.color ?? DEFAULT_STYLE.color,
    opacity: clusterOverlay?.opacity ?? DEFAULT_STYLE.opacity,
    lineWidth: clusterOverlay?.lineWidth ?? DEFAULT_STYLE.lineWidth,
  };

  // Valores dos sliders durante o arraste; o catálogo só é recriado no commit.
  const [opacity, setOpacity] = React.useState(style.opacity);
  const [lineWidth, setLineWidth] = React.useState(style.lineWidth);

  React.useEffect(() => {
    setOpacity(style.opacity);
    setLineWidth(style.lineWidth);
  }, [style.opacity, style.lineWidth]);

  const catalogs = getClusterCatalogs();

  // Sem catálogos de clusters disponíveis não há o que exibir.
  if (catalogs.length === 0) return null;

  const applyStyle = (changes) => {
    if (!catalogId) return;
    setClusterCatalog(catalogId, { ...style, visible, ...changes });
  };

  const handleCatalogChange = (event) => {
    setClusterCatalog(event.target.value, style);
  };

  const handleToggleVisibility = () => {
    setClusterCatalogVisibility(!visible);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Clusters catalog</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          <TextField
            select
            fullWidth
            label="Catalog"
            value={catalogId}
            onChange={handleCatalogChange}
            helperText="Each cluster is drawn as a circle with its radius."
          >
            {catalogs.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <ColorSelect
            value={style.color}
            onChange={(color) => applyStyle({ color })}
          />

          <Stack spacing={1}>
            <Typography id="cluster-opacity-label" variant="body2" color="text.secondary">
              Opacity
            </Typography>
            <Slider
              aria-labelledby="cluster-opacity-label"
              value={opacity}
              onChange={(event, value) => setOpacity(value)}
              onChangeCommitted={(event, value) => applyStyle({ opacity: value })}
              min={0.05}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              disabled={!catalogId}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography id="cluster-line-width-label" variant="body2" color="text.secondary">
              Line width
            </Typography>
            <Slider
              aria-labelledby="cluster-line-width-label"
              value={lineWidth}
              onChange={(event, value) => setLineWidth(value)}
              onChangeCommitted={(event, value) => applyStyle({ lineWidth: value })}
              min={1}
              max={5}
              step={1}
              marks
              valueLabelDisplay="auto"
              disabled={!catalogId}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleToggleVisibility}
          disabled={!catalogId}
          startIcon={visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
        <Button color="error" onClick={removeClusterCatalog} disabled={!catalogId}>
          Remove
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
