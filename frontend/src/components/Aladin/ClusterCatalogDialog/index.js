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
import { DEFAULT_CLUSTER_STYLE } from '@/components/Aladin/hipsCatalogs';

/**
 * Diálogo do catálogo HiPS de clusters (céu inteiro). Cada cluster é
 * desenhado como um círculo com o seu raio; aqui o usuário escolhe o
 * catálogo, a cor, a transparência e a espessura da linha.
 *
 * O estado aplicado vive no hook useAladin, então reabrir o diálogo sempre
 * reflete o que está realmente no Aladin. Sem catálogo aplicado, o diálogo
 * parte de `defaults` (Settings.cluster_hips do catálogo aberto).
 */
export default function ClusterCatalogDialog({ open, onClose, defaults }) {
  const {
    clusterOverlay,
    getClusterCatalogs,
    setClusterCatalog,
    setClusterCatalogVisibility,
    removeClusterCatalog,
  } = useAladinContext();

  const catalogs = getClusterCatalogs();

  // Overlay ativo tem prioridade; sem ele, o default salvo no Settings (se o
  // catálogo ainda estiver disponível para o usuário).
  const initial = clusterOverlay ?? {
    ...defaults,
    catalogId: catalogs.some(cat => cat.id === defaults?.catalogId) ? defaults.catalogId : '',
  };
  const catalogId = initial.catalogId ?? '';
  const visible = clusterOverlay?.visible ?? false;
  const style = {
    color: initial.color ?? DEFAULT_CLUSTER_STYLE.color,
    opacity: initial.opacity ?? DEFAULT_CLUSTER_STYLE.opacity,
    lineWidth: initial.lineWidth ?? DEFAULT_CLUSTER_STYLE.lineWidth,
  };

  // Valores dos sliders durante o arraste; o catálogo só é recriado no commit.
  const [opacity, setOpacity] = React.useState(style.opacity);
  const [lineWidth, setLineWidth] = React.useState(style.lineWidth);

  React.useEffect(() => {
    setOpacity(style.opacity);
    setLineWidth(style.lineWidth);
  }, [style.opacity, style.lineWidth]);

  // Sem catálogos de clusters disponíveis não há o que exibir.
  if (catalogs.length === 0) return null;

  // Sem overlay ativo, mudar o estilo aplica o catálogo (já visível).
  const applyStyle = (changes) => {
    if (!catalogId) return;
    setClusterCatalog(catalogId, { ...style, visible: clusterOverlay ? visible : true, ...changes });
  };

  const handleCatalogChange = (event) => {
    setClusterCatalog(event.target.value, style);
  };

  const handleToggleVisibility = () => {
    if (!clusterOverlay) {
      applyStyle({});
      return;
    }
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
        <Button color="error" onClick={removeClusterCatalog} disabled={!clusterOverlay}>
          Remove
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
