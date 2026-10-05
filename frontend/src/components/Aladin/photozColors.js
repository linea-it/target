// Colormap e desenho dos shapes usados pelo catálogo HiPS de photo-z.
// O Aladin não aceita cor por fonte, então cada fonte recebe um canvas com o
// shape já pintado na cor do seu z (ver makePhotozColorShape em useAladin).

// Escalas de cor (do matplotlib) amostradas em 9 pontos igualmente
// espaçados (t = 0 .. 1); entre os pontos a cor é interpolada linearmente.
export const COLORMAPS = {
  viridis: {
    label: 'Viridis',
    stops: [[68, 1, 84], [71, 45, 123], [59, 82, 139], [44, 114, 142], [33, 145, 140], [40, 174, 128], [94, 201, 98], [173, 220, 48], [253, 231, 37]],
  },
  plasma: {
    label: 'Plasma',
    stops: [[13, 8, 135], [76, 2, 161], [126, 3, 168], [170, 35, 149], [204, 71, 120], [230, 108, 92], [248, 149, 64], [253, 197, 39], [240, 249, 33]],
  },
  inferno: {
    label: 'Inferno',
    stops: [[0, 0, 4], [33, 12, 74], [87, 16, 110], [138, 34, 106], [188, 55, 84], [228, 90, 49], [249, 142, 9], [249, 203, 53], [252, 255, 164]],
  },
  magma: {
    label: 'Magma',
    stops: [[0, 0, 4], [29, 17, 71], [81, 18, 124], [131, 38, 129], [183, 55, 121], [231, 82, 99], [252, 137, 97], [254, 196, 136], [252, 253, 191]],
  },
  cividis: {
    label: 'Cividis',
    stops: [[0, 34, 78], [26, 56, 111], [67, 78, 108], [97, 101, 111], [125, 124, 120], [155, 148, 118], [188, 174, 108], [222, 201, 88], [254, 232, 56]],
  },
  turbo: {
    label: 'Turbo',
    stops: [[48, 18, 59], [70, 107, 227], [40, 188, 235], [50, 242, 152], [164, 252, 60], [238, 207, 58], [251, 126, 33], [208, 47, 5], [122, 4, 3]],
  },
  jet: {
    label: 'Jet',
    stops: [[0, 0, 128], [0, 0, 255], [0, 128, 255], [22, 255, 225], [125, 255, 122], [228, 255, 19], [255, 148, 0], [255, 30, 0], [128, 0, 0]],
  },
  coolwarm: {
    label: 'Coolwarm',
    stops: [[59, 76, 192], [98, 130, 234], [141, 176, 254], [185, 208, 249], [221, 220, 220], [245, 196, 172], [244, 152, 122], [221, 95, 75], [180, 4, 38]],
  },
  rdylbu: {
    label: 'Blue-Yellow-Red',
    stops: [[49, 54, 149], [81, 131, 187], [144, 195, 221], [212, 237, 244], [255, 254, 190], [254, 210, 131], [248, 140, 81], [221, 61, 45], [165, 0, 38]],
  },
};

export const DEFAULT_COLORMAP = 'jet';

// Número de cores distintas: cada uma vira um canvas em cache por estilo.
export const COLOR_LEVELS = 64;

// Escala desconhecida (ex.: removida depois de salva no Settings) cai na default.
function colormapStops(name) {
  return (COLORMAPS[name] ?? COLORMAPS[DEFAULT_COLORMAP]).stops;
}

/** Cor da escala `name` para t em [0, 1] (com clamp), no formato rgb(). */
export function colormapColor(t, name = DEFAULT_COLORMAP) {
  const stops = colormapStops(name);
  const clamped = Math.min(1, Math.max(0, t));
  const pos = clamped * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const f = pos - i;
  const [r, g, b] = stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Índice de cor (0 .. levels-1) do valor z no intervalo [zMin, zMax]. */
export function zToColorIndex(z, zMin, zMax, levels = COLOR_LEVELS) {
  const span = zMax - zMin;
  const t = span > 0 ? (z - zMin) / span : 0;
  return Math.round(Math.min(1, Math.max(0, t)) * (levels - 1));
}

/** Cor do índice retornado por zToColorIndex, na escala `name`. */
export function colorForIndex(index, name = DEFAULT_COLORMAP, levels = COLOR_LEVELS) {
  return colormapColor(levels > 1 ? index / (levels - 1) : 0, name);
}

/** Gradiente CSS da escala `name` (esquerda = zMin), para a colorbar. */
export function colormapGradientCss(name = DEFAULT_COLORMAP, stops = 16) {
  const colors = Array.from({ length: stops }, (_, i) => colormapColor(i / (stops - 1), name));
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
