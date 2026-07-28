'use client';

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

const DEFAULT_OPACITY = 0.8;

/**
 * Diálogo de seleção de mapas (imagens HiPS aplicadas como overlay sobre a
 * imagem base, com opacidade ajustável).
 *
 * O estado do overlay vive no hook useAladin, então reabrir o diálogo sempre
 * reflete o mapa e a opacidade realmente aplicados no Aladin.
 */
export default function MapsDialog({ open, onClose, surveyId }) {
  const {
    mapOverlays,
    getMapsForSurvey,
    setMapOverlay,
    setMapOpacity,
    setMapVisibility,
    removeMapOverlay,
  } = useAladinContext();

  const group = getMapsForSurvey(surveyId);

  // Sem mapas para esta imagem base não há o que exibir.
  if (!group) return null;

  const overlay = mapOverlays[group.surveyKey];
  const mapId = overlay?.mapId ?? '';
  const opacity = overlay?.opacity ?? DEFAULT_OPACITY;
  const visible = overlay?.visible ?? false;

  const handleMapChange = (event) => {
    setMapOverlay(group.surveyKey, event.target.value, opacity);
  };

  const handleToggleVisibility = () => {
    setMapVisibility(group.surveyKey, !visible);
  };

  const handleOpacityChange = (event, value) => {
    setMapOpacity(group.surveyKey, value);
  };

  const handleRemove = () => {
    removeMapOverlay(group.surveyKey);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{`Maps — ${group.name}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          <TextField
            select
            fullWidth
            label="Map"
            value={mapId}
            onChange={handleMapChange}
            helperText="O mapa é aplicado como uma camada sobre a imagem base."
          >
            {group.options.map((option) => (
              <MenuItem key={option.mapId} value={option.mapId}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack spacing={1}>
            <Typography id="map-opacity-label" variant="body2" color="text.secondary">
              Opacity
            </Typography>
            <Slider
              aria-labelledby="map-opacity-label"
              value={opacity}
              onChange={handleOpacityChange}
              min={0}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              disabled={!mapId}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleToggleVisibility}
          disabled={!mapId}
          startIcon={visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
        <Button color="error" onClick={handleRemove} disabled={!mapId}>
          Remove
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
