// Colormap e desenho dos shapes usados pelo catálogo HiPS de photo-z.
// O Aladin não aceita cor por fonte, então cada fonte recebe um canvas com o
// shape já pintado na cor do seu z (ver makePhotozColorShape em useAladin).

// Viridis amostrado em 9 pontos igualmente espaçados (t = 0 .. 1).
const VIRIDIS = [
  [68, 1, 84],
  [71, 45, 123],
  [59, 82, 139],
  [44, 114, 142],
  [33, 145, 140],
  [40, 174, 128],
  [94, 201, 98],
  [173, 220, 48],
  [253, 231, 37],
];

// Número de cores distintas: cada uma vira um canvas em cache por estilo.
export const COLOR_LEVELS = 64;

/** Cor do colormap para t em [0, 1] (com clamp), no formato rgb(). */
export function colormapColor(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const pos = clamped * (VIRIDIS.length - 1);
  const i = Math.min(Math.floor(pos), VIRIDIS.length - 2);
  const f = pos - i;
  const [r, g, b] = VIRIDIS[i].map((c, k) => Math.round(c + (VIRIDIS[i + 1][k] - c) * f));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Índice de cor (0 .. levels-1) do valor z no intervalo [zMin, zMax]. */
export function zToColorIndex(z, zMin, zMax, levels = COLOR_LEVELS) {
  const span = zMax - zMin;
  const t = span > 0 ? (z - zMin) / span : 0;
  return Math.round(Math.min(1, Math.max(0, t)) * (levels - 1));
}

/** Cor do índice retornado por zToColorIndex. */
export function colorForIndex(index, levels = COLOR_LEVELS) {
  return colormapColor(levels > 1 ? index / (levels - 1) : 0);
}

/** Gradiente CSS do colormap (esquerda = zMin), para a colorbar. */
export function colormapGradientCss(stops = 16) {
  const colors = Array.from({ length: stops }, (_, i) => colormapColor(i / (stops - 1)));
  return `linear-gradient(to right, ${colors.join(', ')})`;
}

/**
 * Desenha um dos shapes padrão do Aladin num canvas size x size.
 * Mesmo desenho do Catalog.createShape do aladin-lite (3.7.0-beta).
 */
export function drawShapeCanvas(shape, color, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const s = size;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (shape === 'plus') {
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s / 2, s);
    ctx.moveTo(0, s / 2);
    ctx.lineTo(s, s / 2);
  } else if (shape === 'cross') {
    ctx.moveTo(0, 0);
    ctx.lineTo(s - 1, s - 1);
    ctx.moveTo(s - 1, 0);
    ctx.lineTo(0, s - 1);
  } else if (shape === 'rhomb') {
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(0, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, 0);
  } else if (shape === 'triangle') {
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(0, s - 1);
    ctx.lineTo(s - 1, s - 1);
    ctx.lineTo(s / 2, 0);
  } else if (shape === 'circle') {
    ctx.arc(s / 2, s / 2, s / 2 - 1, 0, 2 * Math.PI, true);
  } else {
    // square
    ctx.moveTo(1, 0);
    ctx.lineTo(1, s - 1);
    ctx.lineTo(s - 1, s - 1);
    ctx.lineTo(s - 1, 1);
    ctx.lineTo(1, 1);
  }
  ctx.stroke();

  return canvas;
}
