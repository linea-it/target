'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import { useAladinContext } from '@/components/Aladin/AladinContext';
import ShapeSelect from '@/components/Aladin/CatalogControls/ShapeSelect';
import ColormapSelect from '@/components/Aladin/CatalogControls/ColormapSelect';
import { colormapGradientCss } from '@/components/Aladin/photozColors';
import { DEFAULT_PHOTOZ_STYLE, Z_SLIDER_STEP, zSliderBounds } from '@/components/Aladin/hipsCatalogs';

/**
 * Diálogo do catálogo HiPS de photo-z. Cada fonte é desenhada com o shape
 * escolhido e a cor dada pelo seu valor de z no colormap; aqui o usuário
 * escolhe o catálogo, o shape, o tamanho, a escala de cor e o intervalo de z.
 *
 * O estado aplicado vive no hook useAladin, então reabrir o diálogo sempre
 * reflete o que está realmente no Aladin. Sem catálogo aplicado, o diálogo
 * parte de `defaults` (Settings.photoz_hips do catálogo aberto).
 */
export default function PhotozCatalogDialog({ open, onClose, defaults }) {
  const {
    photozOverlay,
    getPhotozCatalogs,
    setPhotozCatalog,
    setPhotozCatalogVisibility,
    removePhotozCatalog,
  } = useAladinContext();

  const catalogs = getPhotozCatalogs();

  // Overlay ativo tem prioridade; sem ele, o default salvo no Settings (se o
  // catálogo ainda estiver disponível para o usuário).
  const initial = photozOverlay ?? {
    ...defaults,
    catalogId: catalogs.some(cat => cat.id === defaults?.catalogId) ? defaults.catalogId : '',
  };
  const catalogId = initial.catalogId ?? '';
  const visible = photozOverlay?.visible ?? false;
  const selected = catalogs.find(cat => cat.id === catalogId);
  const zRange = selected?.zRange ?? [0, 1];
  const style = {
    shape: initial.shape ?? DEFAULT_PHOTOZ_STYLE.shape,
    sourceSize: initial.sourceSize ?? DEFAULT_PHOTOZ_STYLE.sourceSize,
    colormap: initial.colormap ?? DEFAULT_PHOTOZ_STYLE.colormap,
    zMin: initial.zMin ?? zRange[0],
    zMax: initial.zMax ?? zRange[1],
  };

  // Valores dos sliders durante o arraste; o catálogo só é recriado no commit.
  const [sourceSize, setSourceSize] = React.useState(style.sourceSize);
  const [range, setRange] = React.useState([style.zMin, style.zMax]);

  React.useEffect(() => {
    setSourceSize(style.sourceSize);
  }, [style.sourceSize]);

  React.useEffect(() => {
    setRange([style.zMin, style.zMax]);
  }, [style.zMin, style.zMax]);

  // Sem catálogos de photo-z disponíveis não há o que exibir.
  if (catalogs.length === 0) return null;

  const [boundMin, boundMax] = zSliderBounds(selected);

  // Sem overlay ativo, mudar o estilo aplica o catálogo (já visível).
  const applyStyle = (changes) => {
    if (!catalogId) return;
    setPhotozCatalog(catalogId, { ...style, visible: photozOverlay ? visible : true, ...changes });
  };

  // Trocar de catálogo volta o intervalo para o default do novo catálogo.
  const handleCatalogChange = (event) => {
    const { shape, sourceSize: size, colormap } = style;
    setPhotozCatalog(event.target.value, { shape, sourceSize: size, colormap });
  };

  const handleToggleVisibility = () => {
    if (!photozOverlay) {
      applyStyle({});
      return;
    }
    setPhotozCatalogVisibility(!visible);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Photo-z catalog</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          <TextField
            select
            fullWidth
            label="Catalog"
            value={catalogId}
            onChange={handleCatalogChange}
            helperText="Each source is colored by its photo-z value."
          >
            {catalogs.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <ShapeSelect
            value={style.shape}
            onChange={(shape) => applyStyle({ shape })}
          />

          <Box>
            <Typography gutterBottom variant="body2" color="text.secondary">Size</Typography>
            <Slider
              value={sourceSize}
              onChange={(event, value) => setSourceSize(value)}
              onChangeCommitted={(event, value) => applyStyle({ sourceSize: value })}
              min={4}
              max={28}
              step={1}
              valueLabelDisplay="auto"
              disabled={!catalogId}
            />
          </Box>

          <ColormapSelect
            value={style.colormap}
            onChange={(colormap) => applyStyle({ colormap })}
            disabled={!catalogId}
          />

          <Stack spacing={1}>
            <Typography id="photoz-range-label" variant="body2" color="text.secondary">
              Photo-z range
            </Typography>
            <Slider
              aria-labelledby="photoz-range-label"
              value={range}
              onChange={(event, value) => setRange(value)}
              onChangeCommitted={(event, [zMin, zMax]) => applyStyle({ zMin, zMax })}
              min={boundMin}
              max={boundMax}
              step={Z_SLIDER_STEP}
              disableSwap
              valueLabelDisplay="auto"
              disabled={!catalogId}
            />
            <Box
              sx={{
                height: 12,
                borderRadius: 1,
                background: colormapGradientCss(style.colormap),
                opacity: catalogId ? 1 : 0.4,
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
        <Button color="error" onClick={removePhotozCatalog} disabled={!photozOverlay}>
          Remove
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
