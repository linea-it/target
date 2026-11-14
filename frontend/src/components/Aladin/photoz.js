// Config do overlay de photo-z do Aladin (Cluster Detail).
// As fontes vêm de uma tabela de photo-z registrada (catalog_type 'photoz',
// coluna de z com a UCD src.redshift.phot), por uma busca por área no
// endpoint data/ ao redor do cluster exibido (raio do cluster × fator,
// limitado a maxRadiusDeg) e filtrada pelo intervalo de z [zMin, zMax].
// Cada fonte é desenhada com um shape padrão pintado pela cor do seu z.
// Compartilhada entre usePhotoz, PhotozCatalogDialog e o card de Settings
// do catálogo (Settings.photoz).

import { DEFAULT_COLORMAP } from './photozColors';

// Limites do slider de intervalo de z: a tabela não informa min/max de z.
export const PHOTOZ_Z_BOUNDS = [0, 2];

// Passo do slider de intervalo de z (dialog e Settings).
export const Z_SLIDER_STEP = 0.01;

// Máximo de fontes por requisição; acima disso o resultado é truncado.
export const PHOTOZ_PAGE_SIZE = 5000;

export const DEFAULT_PHOTOZ = {
  factor: 5,
  maxRadiusDeg: 1,
  shape: 'circle',
  sourceSize: 8,
  colormap: DEFAULT_COLORMAP,
  zMin: PHOTOZ_Z_BOUNDS[0],
  zMax: PHOTOZ_Z_BOUNDS[1],
};

// Chaves de Settings.photoz além de tableId e showOnOpen.
const PARAM_KEYS = Object.keys(DEFAULT_PHOTOZ);

/** Parâmetros efetivos: defaults + o que estiver salvo no Settings. */
export function photozParamsFromSettings(saved) {
  const params = { ...DEFAULT_PHOTOZ };
  PARAM_KEYS.forEach((key) => {
    if (saved?.[key] !== undefined && saved?.[key] !== null) params[key] = saved[key];
  });
  return params;
}

/**
 * Tabela de photo-z a usar: a pedida (tableId), se estiver entre as que o
 * usuário pode ler; senão a primeira da lista (ou null sem tabelas).
 */
export function resolvePhotozTable(tables, tableId) {
  if (!tables?.length) return null;
  return tables.find(t => t.id === tableId) ?? tables[0];
}
